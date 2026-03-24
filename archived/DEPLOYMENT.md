# Deployment Guide - shinyapps.io

This guide shows you how to deploy your R Shiny app to shinyapps.io with private data protection.

## Why shinyapps.io?

✅ **Private by default** - Your data stays private  
✅ **Easy deployment** - One R command  
✅ **Free tier** - 5 apps, 25 active hours/month  
✅ **No infrastructure** - Fully managed by Posit  
✅ **Perfect for development** - Quick iterations  

## Quick Start (5 Minutes)

### 1. Create Account (1 minute)
1. Go to https://www.shinyapps.io/admin/#/signup
2. Sign up for a free account
3. Verify your email

### 2. Configure Authentication (2 minutes)

In R or RStudio console:

```r
# Install rsconnect if needed
install.packages("rsconnect")

# Get your token:
# 1. Go to: https://www.shinyapps.io/admin/#/tokens
# 2. Click "Show" next to your token
# 3. Copy the entire rsconnect::setAccountInfo(...) command
# 4. Paste and run it in R console

# Example (use YOUR token from the website):
rsconnect::setAccountInfo(
  name='your-username',
  token='YOUR_TOKEN_HERE',
  secret='YOUR_SECRET_HERE'
)
```

### 3. Deploy Your App (1 minute)

**Option A: Using the deployment script (recommended)**
```r
source("deploy_shinyapps.R")
```

**Option B: Manual deployment**
```r
library(rsconnect)
rsconnect::deployApp(
  appName = "tree-related-microhabitats",
  appTitle = "Tree-Related Microhabitats Explorer",
  forceUpdate = TRUE,
  launch.browser = TRUE
)
```

### 4. Access Your App

After deployment completes:
- Your app URL: `https://YOUR-USERNAME.shinyapps.io/tree-related-microhabitats/`
- Dashboard: https://www.shinyapps.io/admin/#/applications

## Privacy & Security

### Your Data is Private ✅

**What's private:**
- All your data files in `/data` folder
- Your R code and logic
- User interactions and sessions
- App is not listed publicly

**Access control:**
- Only people with the direct URL can access
- You can add password protection (paid plans)
- Can restrict to specific email addresses (paid plans)

### Best Practices

1. **Never commit secrets** to git:
   ```r
   # Use environment variables for sensitive config
   api_key <- Sys.getenv("API_KEY")
   ```

2. **.gitignore is configured** to exclude:
   - `rsconnect/` directory (deployment metadata)
   - `.Rproj` files
   - Cache files

3. **Share carefully**:
   - Only share the app URL with authorized collaborators
   - Consider paid plan for password protection if needed

## Managing Your Deployment

### Update Your App

After making changes:
```r
source("deploy_shinyapps.R")
```

The script will automatically update your existing deployment.

### View Logs

```r
# View application logs
rsconnect::showLogs()
```

Or view in dashboard: https://www.shinyapps.io/admin/#/applications

### Monitor Usage

Check your dashboard to monitor:
- Active hours used (25/month on free tier)
- Number of users
- App performance

## Free Tier Limits

| Feature | Free Tier |
|---------|-----------|
| Applications | 5 |
| Active Hours | 25/month |
| Instance Size | Small |
| Support | Community |
| Privacy | URL-only access |

**What are "Active Hours"?**
- Time when your app is running and accepting connections
- Apps automatically sleep after inactivity
- Wakes up when someone visits the URL
- 25 hours = plenty for development and testing

## Upgrading

When you need more:

### Starter Plan ($9/month)
- 25 applications
- Unlimited active hours
- Larger instance size
- Password protection
- Email support

### Basic Plan ($99/month)
- Everything in Starter
- Custom domains
- SSL certificates
- Priority support
- More concurrent users

**Upgrade at:** https://www.shinyapps.io/admin/#/billing

## Troubleshooting

### "Error: Account not configured"
**Solution:**
```r
# Check configured accounts
rsconnect::accounts()

# If empty, configure your account (see step 2 above)
```

### "Error: Package 'X' is not available"
**Solution:** Add missing package to `install_packages.R`, then redeploy

### "App won't start after deployment"
**Solution:**
1. Check logs: `rsconnect::showLogs()`
2. Test locally first: `shiny::runApp()`
3. Ensure all packages are installed
4. Check for hardcoded file paths

### "Running out of active hours"
**Solution:**
- Check usage: https://www.shinyapps.io/admin/#/dashboard
- Reduce idle time by shutting down when not needed
- Upgrade to Starter plan ($9/month) for unlimited hours

### "Deployment is slow"
**Solution:**
- First deployment takes 2-5 minutes (installing packages)
- Subsequent deployments are faster (~30 seconds)
- Large data files can slow deployment

## App Configuration

### Change App Name
Edit `deploy_shinyapps.R`:
```r
app_name <- "your-custom-name"  # Must be unique to your account
```

### Instance Settings

In shinyapps.io dashboard:
1. Go to your app → Settings
2. Adjust:
   - Instance size
   - Timeout settings
   - Startup time limit

### Archive Old Versions

In dashboard:
- Applications → Your App → Settings → Archive
- Archiving frees up your 5 app limit on free tier

## Development Workflow

### Recommended workflow:

```bash
# 1. Make changes locally
vim R/server.R

# 2. Test locally
R -e "shiny::runApp()"

# 3. Commit to git
git add .
git commit -m "Update feature X"

# 4. Deploy to shinyapps.io
R -e "source('deploy_shinyapps.R')"

# 5. Test deployed version
# Visit your app URL
```

## Sharing Your App

### With Collaborators

**Free tier:**
- Share URL: `https://YOUR-USERNAME.shinyapps.io/tree-microhabitats/`
- Only people with URL can access
- No password protection

**Paid tier options:**
- Add password protection
- Restrict to email addresses
- Single sign-on (SSO)

## Alternative: Local Deployment

For maximum privacy during early development:

```r
# Just run locally
shiny::runApp()

# Share via network (same WiFi):
shiny::runApp(host = "0.0.0.0", port = 3838)
# Others access via: http://YOUR-IP:3838
```

## Additional Resources

- [shinyapps.io Documentation](https://docs.posit.co/shinyapps.io/)
- [rsconnect Package](https://rstudio.github.io/rsconnect/)
- [Shiny Deployment Guide](https://shiny.posit.co/r/deploy.html)
- [Community Forum](https://community.rstudio.com/)

## Support

**Free tier support:**
- Community forum: https://community.rstudio.com/
- Documentation: https://docs.posit.co/shinyapps.io/

**Paid tier support:**
- Email support (Starter and above)
- Priority support (Basic and above)

---

**Ready to deploy?** Run: `source("deploy_shinyapps.R")`

Last updated: March 12, 2026