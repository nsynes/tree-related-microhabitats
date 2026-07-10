# Deployment Guide - trems.nicksynes.com

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** configured with credentials
3. **AWS SAM CLI** installed (`pip install aws-sam-cli`)
4. **Domain:** nicksynes.com already configured in Route53
5. **Production build** ready (`npm run build` in react-app/)

## Deployment Steps

### Step 1: Verify Prerequisites

```bash
# Check AWS credentials
aws sts get-caller-identity

# Check SAM CLI
sam --version

# Check that hosted zone exists
aws route53 list-hosted-zones-by-name --dns-name nicksynes.com
```

### Step 2: Deploy with Custom Domain

The deployment script handles everything automatically:

```bash
./deploy/aws-test/deploy.sh
```

This will:
1. Process data (Excel → JSON)
2. Build React app
3. Create/update CloudFormation stack with:
   - S3 bucket for website hosting
   - ACM SSL/TLS certificate for trems.nicksynes.com
   - CloudFront CDN distribution
   - Route53 DNS record (A record pointing to CloudFront)
4. Upload built files to S3

### Step 3: Certificate Validation

**IMPORTANT:** The ACM certificate requires DNS validation.

1. After deployment starts, CloudFormation will create DNS validation records
2. These records are automatically added to your Route53 hosted zone
3. Certificate validation typically takes 5-30 minutes
4. The stack will wait for certificate validation before completing

You can monitor the certificate validation:

```bash
# Check certificate status
aws acm list-certificates --region us-east-1

# Or watch CloudFormation events
aws cloudformation describe-stack-events \
  --stack-name tree-microhabitats-explorer \
  --region us-east-1
```

### Step 4: Verify Deployment

Once deployment completes:

1. **Check CloudFormation outputs:**
   ```bash
   aws cloudformation describe-stacks \
     --stack-name tree-microhabitats-explorer \
     --query 'Stacks[0].Outputs'
   ```

2. **Test the URLs:**
   - S3 direct: `http://tree-microhabitats-explorer.s3-website-us-east-1.amazonaws.com`
   - CloudFront: `https://d1234567890abc.cloudfront.net`
   - **Custom domain: `https://trems.nicksynes.com`**

3. **DNS propagation:**
   ```bash
   # Check DNS resolution
   dig trems.nicksynes.com
   nslookup trems.nicksynes.com
   ```

## Deployment Configuration

The `template.yaml` uses these default parameters:

- **DomainName:** `trems.nicksynes.com`
- **HostedZoneName:** `nicksynes.com`
- **BucketName:** `tree-microhabitats-explorer`
- **UseCustomDomain:** `true`

To change these, edit `template.yaml` or override during deployment:

```bash
sam deploy \
  --template-file deploy/aws-test/template.yaml \
  --parameter-overrides \
    DomainName=trems.nicksynes.com \
    HostedZoneName=nicksynes.com \
    BucketName=tree-microhabitats-explorer
```

## Updating the Site

After initial deployment, to update content:

```bash
# Option 1: Full deployment (includes data processing and build)
./deploy/aws-test/deploy.sh

# Option 2: Just rebuild and upload (if data hasn't changed)
./deploy/aws-test/deploy.sh --skip-data

# Option 3: Manual update (if you've already built)
cd react-app && npm run build
aws s3 sync dist/ s3://tree-microhabitats-explorer/ --delete
```

## CloudFront Cache Invalidation

After uploading new files, you may need to invalidate CloudFront cache:

```bash
# Get distribution ID
DIST_ID=$(aws cloudformation describe-stacks \
  --stack-name tree-microhabitats-explorer \
  --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontURL`].OutputValue' \
  --output text | cut -d'.' -f1)

# Create invalidation
aws cloudfront create-invalidation \
  --distribution-id $DIST_ID \
  --paths "/*"
```

Or invalidate specific files:
```bash
aws cloudfront create-invalidation \
  --distribution-id $DIST_ID \
  --paths "/index.html" "/assets/*"
```

## DNS Propagation Time

After initial deployment:
- **Route53 → CloudFront:** Usually instant
- **Global DNS propagation:** 5 minutes to 48 hours (typically < 1 hour)

Check propagation status:
```bash
# Your local DNS
nslookup trems.nicksynes.com

# Google DNS
nslookup trems.nicksynes.com 8.8.8.8

# Cloudflare DNS
nslookup trems.nicksynes.com 1.1.1.1
```

## Troubleshooting

### Certificate Validation Stuck

If certificate validation takes > 30 minutes:

1. Check Route53 records:
   ```bash
   aws route53 list-resource-record-sets \
     --hosted-zone-id <YOUR_ZONE_ID> \
     --query "ResourceRecordSets[?Type=='CNAME']"
   ```

2. Manually add validation CNAME if missing (check ACM console for values)

3. Or delete certificate and recreate:
   ```bash
   sam deploy --force-upload
   ```

### CloudFront Distribution Taking Long

CloudFront distributions take 15-30 minutes to deploy. This is normal.

Monitor progress:
```bash
aws cloudfront get-distribution --id <DIST_ID> \
  --query 'Distribution.Status'
```

### DNS Not Resolving

1. Verify Route53 record exists:
   ```bash
   aws route53 list-resource-record-sets \
     --hosted-zone-id <YOUR_ZONE_ID> \
     --query "ResourceRecordSets[?Name=='trems.nicksynes.com.']"
   ```

2. Check nameservers match Route53:
   ```bash
   dig NS nicksynes.com
   ```

### S3 Bucket Already Exists

If bucket name is taken:

```bash
sam deploy \
  --parameter-overrides BucketName=tree-microhabitats-explorer-unique-suffix
```

## Stack Deletion

To remove all resources:

```bash
# Delete S3 bucket contents first
aws s3 rm s3://tree-microhabitats-explorer --recursive

# Delete CloudFormation stack
aws cloudformation delete-stack \
  --stack-name tree-microhabitats-explorer

# Verify deletion
aws cloudformation describe-stacks \
  --stack-name tree-microhabitats-explorer
```

**Note:** DNS records and certificates will be automatically removed.

## Cost Estimate

Monthly AWS costs (approximate):

- **S3 Storage:** ~$0.02 (for ~500 KB)
- **S3 Requests:** ~$0.01 (for 1000 requests)
- **CloudFront:** ~$0.00 (within free tier for first 12 months)
- **CloudFront (after free tier):** ~$0.05 (for 1 GB transfer)
- **Route53 Hosted Zone:** $0.50/month (already paying for nicksynes.com)
- **ACM Certificate:** Free
- **Total:** ~$0.60/month (or ~$0.03/month within CloudFront free tier)

## Security

The deployment includes:

- **HTTPS enforced** (CloudFront redirects HTTP → HTTPS)
- **TLS 1.2+** minimum protocol version
- **ACM certificate** auto-renewed
- **S3 public access** limited to website hosting
- **CloudFront CDN** protects origin
- **CORS configured** for API requests (if needed)

## Monitoring

Set up CloudWatch alarms (optional):

```bash
# CloudFront 4xx errors
aws cloudwatch put-metric-alarm \
  --alarm-name trems-4xx-errors \
  --metric-name 4xxErrorRate \
  --namespace AWS/CloudFront \
  --statistic Average \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold

# CloudFront 5xx errors
aws cloudwatch put-metric-alarm \
  --alarm-name trems-5xx-errors \
  --metric-name 5xxErrorRate \
  --namespace AWS/CloudFront \
  --statistic Average \
  --period 300 \
  --threshold 1 \
  --comparison-operator GreaterThanThreshold
```

## Backup and Recovery

S3 versioning (optional):

```bash
aws s3api put-bucket-versioning \
  --bucket tree-microhabitats-explorer \
  --versioning-configuration Status=Enabled
```

## Next Steps

After successful deployment:

1. Test site at https://trems.nicksynes.com
2. Verify SSL certificate (green padlock in browser)
3. Test all filtering functionality
4. Share URL with Forest Research team
5. Set up monitoring alerts (optional)
6. Configure CloudWatch logs (optional)

## Support

For issues:
- AWS CloudFormation logs: Check AWS Console → CloudFormation
- AWS ACM: Check certificate validation status
- Route53: Verify DNS records
- CloudFront: Check distribution status and logs