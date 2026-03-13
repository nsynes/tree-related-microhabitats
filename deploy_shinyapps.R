# Deploy to shinyapps.io
# This script helps you deploy your R Shiny app to shinyapps.io

# ============================================================================
# SETUP INSTRUCTIONS (First Time Only)
# ============================================================================
# 
# 1. Create a free account at https://www.shinyapps.io/admin/#/signup
# 
# 2. Install rsconnect package (if not already installed):
#    install.packages("rsconnect")
# 
# 3. Get your account credentials:
#    - Go to: https://www.shinyapps.io/admin/#/tokens
#    - Click "Show" next to your token
#    - Copy the rsconnect::setAccountInfo(...) command
#    - Run it in your R console (one time setup)
# 
# 4. Run this script to deploy:
#    source("deploy_shinyapps.R")
#
# ============================================================================

# Load required package
if (!require("rsconnect")) {
  install.packages("rsconnect")
  library(rsconnect)
}

# Check if account is configured
accounts <- rsconnect::accounts()

if (nrow(accounts) == 0) {
  cat("\n❌ No shinyapps.io account configured!\n\n")
  cat("Please follow these steps:\n")
  cat("1. Go to: https://www.shinyapps.io/admin/#/tokens\n")
  cat("2. Click 'Show' next to your token\n")
  cat("3. Copy and run the rsconnect::setAccountInfo(...) command\n")
  cat("4. Then run this script again\n\n")
  stop("Account configuration required")
}

cat("\n✅ Account configured:", accounts$name[1], "\n")

# Deployment configuration
app_name <- "tree-related-microhabitats"
app_title <- "Tree-related Microhabitats Explorer"

cat("\nDeploying to shinyapps.io...\n")
cat("App name:", app_name, "\n")
cat("Account:", accounts$name[1], "\n\n")

# Deploy the application
tryCatch({
  rsconnect::deployApp(
    appName = app_name,
    appTitle = app_title,
    account = accounts$name[1],
    forceUpdate = TRUE,
    launch.browser = TRUE
  )
  
  cat("\n\n✅ Deployment successful!\n\n")
  cat("Your app is now live at:\n")
  cat("https://", accounts$name[1], ".shinyapps.io/", app_name, "/\n\n", sep = "")
  cat("Note: Your app is private by default.\n")
  cat("Only people with the URL can access it.\n\n")
  
}, error = function(e) {
  cat("\n\n❌ Deployment failed!\n\n")
  cat("Error message:", conditionMessage(e), "\n\n")
  cat("Common issues:\n")
  cat("1. Check your internet connection\n")
  cat("2. Verify account credentials are correct\n")
  cat("3. Ensure all required packages are listed in install_packages.R\n")
  cat("4. Check shinyapps.io dashboard for detailed logs\n\n")
  stop(e)
})