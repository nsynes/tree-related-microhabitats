# Tree-related Microhabitat & Species Explorer
# Main application entry point
#
# This app follows R Shiny best practices with modular structure:
# - R/config.R: Configuration loading
# - R/data.R: Data loading and caching
# - R/ui_helpers.R: UI generation functions
# - R/ui.R: Main UI definition
# - R/server.R: Server logic

library(shiny)
library(bslib)
library(shinyjs)
library(dplyr)
library(yaml)

source("R/config.R")
source("R/data.R")
source("R/ui_helpers.R")
source("R/ui.R")
source("R/server.R")

config <- load_config()

# Build habitat mapping from config
habitat_mapping <- build_habitat_mapping(config)

# Load cached data (contains both data and pre-rendered HTML)
cached <- readRDS(config$app$cache_file)

# Display cache info
cat("Cache loaded:\n")
cat("  Created:", format(cached$created), "\n")
cat("  Species count:", cached$nrows, "\n")
cat("  HTML pre-rendered: Yes\n")

# Build UI with pre-cached HTML and server with data
ui <- build_ui(config, cached$html)
server <- build_server(cached$data, habitat_mapping)

# Run the application
shinyApp(ui = ui, server = server)