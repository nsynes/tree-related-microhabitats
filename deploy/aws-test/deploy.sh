#!/bin/bash
# Deployment script for Tree-Related Microhabitats Species Explorer

set -e  # Exit on error

# Resolve the script's own directory so this works regardless of the caller's
# cwd, then cd to repo root - every other path in this script (scripts/,
# react-app/, data/) is repo-root-relative.
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd "$SCRIPT_DIR/../.." && pwd)
cd "$REPO_ROOT"

echo "🌳 Tree-Related Microhabitats - Deployment Script"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
STACK_NAME="tree-microhabitats-explorer"
REGION="${AWS_REGION:-us-east-1}"

# Check prerequisites
check_prerequisites() {
    echo "📋 Checking prerequisites..."
    
    if ! command -v python3 &> /dev/null; then
        echo -e "${RED}❌ Python 3 is not installed${NC}"
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js is not installed${NC}"
        exit 1
    fi
    
    if ! command -v sam &> /dev/null; then
        echo -e "${RED}❌ AWS SAM CLI is not installed${NC}"
        echo "Install with: pip install aws-sam-cli"
        exit 1
    fi
    
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}❌ AWS CLI is not installed${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ All prerequisites installed${NC}"
    echo ""
}

# Process data
process_data() {
    echo "📊 Processing data (Excel → JSON)..."

    # process-data.py reads the species data file from data/column-mapping.json
    # and validates its existence itself; set -e propagates a non-zero exit.
    python scripts/process-data.py
    echo -e "${GREEN}✓ Data processing complete${NC}"
    echo ""
}

# Build React app
build_app() {
    echo "🔨 Building React application..."
    
    cd react-app
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "Installing dependencies..."
        npm install
    fi
    
    # Build
    npm run build
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Build complete${NC}"
        
        # Show build stats
        echo ""
        echo "📦 Build Output:"
        du -sh dist/
        echo "Files:"
        find dist/ -type f | wc -l
    else
        echo -e "${RED}❌ Build failed${NC}"
        exit 1
    fi
    
    cd ..
    echo ""
}

# Deploy infrastructure with SAM
deploy_infrastructure() {
    echo "🚀 Deploying infrastructure with AWS SAM..."
    
    # Check if stack already exists
    STACK_EXISTS=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$REGION" 2>&1 || true)
    
    # Capture output so we can distinguish "no infrastructure changes" (fine -
    # content-only updates are expected) from a real failure (not fine).
    set +e
    if [[ $STACK_EXISTS == *"does not exist"* ]]; then
        echo "Creating new stack..."
        SAM_OUTPUT=$(sam deploy \
            --template-file "$SCRIPT_DIR/template.yaml" \
            --stack-name "$STACK_NAME" \
            --region "$REGION" \
            --capabilities CAPABILITY_IAM \
            --parameter-overrides \
                BucketName="$STACK_NAME" \
                UseCustomDomain=true \
            --no-confirm-changeset \
            --resolve-s3 2>&1)
        SAM_EXIT=$?
    else
        echo "Updating existing stack..."
        SAM_OUTPUT=$(sam deploy \
            --template-file "$SCRIPT_DIR/template.yaml" \
            --stack-name "$STACK_NAME" \
            --region "$REGION" \
            --capabilities CAPABILITY_IAM \
            --no-confirm-changeset \
            --resolve-s3 2>&1)
        SAM_EXIT=$?
    fi
    set -e

    echo "$SAM_OUTPUT"

    if [[ "$SAM_OUTPUT" == *"No changes to deploy"* ]]; then
        echo -e "${YELLOW}ℹ Stack already up to date - continuing to content upload${NC}"
    elif [ $SAM_EXIT -ne 0 ]; then
        echo -e "${RED}❌ Infrastructure deployment failed${NC}"
        exit 1
    else
        echo -e "${GREEN}✓ Infrastructure deployed${NC}"
    fi
    echo ""
}

# Upload built files to S3
upload_to_s3() {
    echo "📤 Uploading files to S3..."
    
    # Get bucket name from CloudFormation outputs
    BUCKET_NAME=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`BucketName`].OutputValue' \
        --output text)
    
    if [ -z "$BUCKET_NAME" ]; then
        echo -e "${RED}❌ Could not get bucket name from stack outputs${NC}"
        exit 1
    fi
    
    echo "Bucket: $BUCKET_NAME"
    
    # Sync files
    aws s3 sync react-app/dist/ "s3://$BUCKET_NAME/" \
        --delete \
        --cache-control "max-age=31536000,public" \
        --exclude "*.html" \
        --region "$REGION"
    
    # Upload HTML files with no-cache
    aws s3 sync react-app/dist/ "s3://$BUCKET_NAME/" \
        --cache-control "no-cache,no-store,must-revalidate" \
        --exclude "*" \
        --include "*.html" \
        --region "$REGION"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Files uploaded${NC}"
    else
        echo -e "${RED}❌ File upload failed${NC}"
        exit 1
    fi
    echo ""
}

# Invalidate CloudFront cache so index.html picks up the new deploy
invalidate_cloudfront() {
    echo "♻️  Invalidating CloudFront cache..."

    CF_DOMAIN=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontURL`].OutputValue' \
        --output text 2>/dev/null || echo "")

    if [ -z "$CF_DOMAIN" ]; then
        echo -e "${YELLOW}⚠ No CloudFront distribution in stack outputs - skipping invalidation${NC}"
        echo ""
        return
    fi

    DIST_ID=$(aws cloudfront list-distributions \
        --query "DistributionList.Items[?DomainName=='$CF_DOMAIN'].Id" \
        --output text)

    if [ -z "$DIST_ID" ]; then
        echo -e "${YELLOW}⚠ Could not resolve distribution ID for $CF_DOMAIN - skipping invalidation${NC}"
        echo ""
        return
    fi

    aws cloudfront create-invalidation \
        --distribution-id "$DIST_ID" \
        --paths "/index.html" "/" \
        --query 'Invalidation.Id' \
        --output text

    echo -e "${GREEN}✓ Invalidation submitted (propagation typically 1-3 min)${NC}"
    echo ""
}

# Show deployment info
show_info() {
    echo "🎉 Deployment Complete!"
    echo "======================"
    echo ""
    
    # Get outputs
    WEBSITE_URL=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`WebsiteURL`].OutputValue' \
        --output text)
    
    CLOUDFRONT_URL=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontURL`].OutputValue' \
        --output text 2>/dev/null || echo "")
    
    echo "🌐 Website URL:"
    echo "   $WEBSITE_URL"
    
    if [ -n "$CLOUDFRONT_URL" ]; then
        echo ""
        echo "⚡ CloudFront URL:"
        echo "   https://$CLOUDFRONT_URL"
    fi
    
    echo ""
    echo "📊 Stack Info:"
    echo "   Name: $STACK_NAME"
    echo "   Region: $REGION"
    echo ""
    echo "💡 To update the site:"
    echo "   1. Update data: python scripts/process-data.py"
    echo "   2. Rebuild: cd react-app && npm run build"
    echo "   3. Deploy: ./deploy/aws-test/deploy.sh"
}

# Main deployment flow
main() {
    echo "Starting deployment..."
    echo ""
    
    # Parse arguments
    SKIP_DATA=false
    SKIP_BUILD=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-data)
                SKIP_DATA=true
                shift
                ;;
            --skip-build)
                SKIP_BUILD=true
                shift
                ;;
            --stack-name)
                STACK_NAME="$2"
                shift 2
                ;;
            --region)
                REGION="$2"
                shift 2
                ;;
            --help)
                echo "Usage: ./deploy/aws-test/deploy.sh [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --skip-data       Skip data processing step"
                echo "  --skip-build      Skip React build step"
                echo "  --stack-name      CloudFormation stack name (default: tree-microhabitats-explorer)"
                echo "  --region          AWS region (default: us-east-1)"
                echo "  --help            Show this help message"
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
    
    check_prerequisites
    
    if [ "$SKIP_DATA" = false ]; then
        process_data
    else
        echo -e "${YELLOW}⚠ Skipping data processing${NC}"
        echo ""
    fi
    
    if [ "$SKIP_BUILD" = false ]; then
        build_app
    else
        echo -e "${YELLOW}⚠ Skipping React build${NC}"
        echo ""
    fi
    
    deploy_infrastructure
    upload_to_s3
    invalidate_cloudfront
    show_info
}

# Run main function
main "$@"