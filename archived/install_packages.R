# Install Required Packages for Tree-related Microhabitat & Species Explorer
# Run this script once before running the app

# List of required packages
required_packages <- c(
  "shiny",
  "bslib",
  "shinyjs",
  "dplyr",
  "yaml",
  "digest"
)

# Function to check and install packages
install_if_missing <- function(packages) {
  new_packages <- packages[!(packages %in% installed.packages()[,"Package"])]
  
  if(length(new_packages) > 0) {
    cat("Installing missing packages:", paste(new_packages, collapse=", "), "\n")
    install.packages(new_packages, dependencies = TRUE)
    cat("Installation complete!\n")
  } else {
    cat("All required packages are already installed.\n")
  }
}

# Install missing packages
install_if_missing(required_packages)

# Verify all packages can be loaded
cat("\nVerifying packages can be loaded...\n")
success <- TRUE
for(pkg in required_packages) {
  if(!require(pkg, character.only = TRUE, quietly = TRUE)) {
    cat("ERROR: Failed to load package:", pkg, "\n")
    success <- FALSE
  } else {
    cat("✓", pkg, "\n")
  }
}

if(success) {
  cat("\n✓ All packages installed and verified successfully!\n")
  cat("You can now run the app with: shiny::runApp()\n")
} else {
  cat("\n✗ Some packages failed to load. Please check the error messages above.\n")
}