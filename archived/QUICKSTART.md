# Quick Start - Deploy to shinyapps.io

Get your app deployed in **5 minutes** with private data protection.

## Setup (First Time Only)

### 1. Create Account
```
https://www.shinyapps.io/admin/#/signup
```

### 2. Configure Credentials
In R console:
```r
install.packages("rsconnect")

# Get your token from: https://www.shinyapps.io/admin/#/tokens
# Click "Show" and copy the command, then paste it:
rsconnect::setAccountInfo(
  name='your-username',
  token='YOUR_TOKEN',
  secret='YOUR_SECRET'
)
```

## Deploy

One command:
```r
source("deploy_shinyapps.R")
```

Your app will be live at:
```
https://YOUR-USERNAME.shinyapps.io/tree-microhabitats/
```

## Privacy ✅

- **Data is private** - not publicly visible
- **URL-only access** - not listed publicly
- **Free tier** - 25 active hours/month
- **Perfect for collaborator data**

## Update App

Make changes, then:
```r
source("deploy_shinyapps.R")
```

## Monitor

Dashboard: https://www.shinyapps.io/admin/#/applications

---

**Need help?** See `DEPLOYMENT.md` for detailed guide.