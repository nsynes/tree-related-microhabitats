# Tree Microhabitat & Species Explorer
# Main application entry point
#
# This app follows R Shiny best practices with modular structure:
# - R/config.R: Configuration loading
# - R/data.R: Data loading and caching
# - R/ui_helpers.R: UI generation functions
# - R/ui.R: Main UI definition
# - R/server.R: Server logic

# Load required libraries
library(shiny)
library(bslib)
library(shinyjs)
library(dplyr)
library(yaml)

# Source all module files
source("R/config.R")
source("R/data.R")
source("R/ui_helpers.R")
source("R/ui.R")
source("R/server.R")

# Load configuration
config <- load_config()

# Build habitat mapping from config
habitat_mapping <- build_habitat_mapping(config)

# Load species data (from cache if available)
species_data <- load_species_data(config, habitat_mapping)

# Build UI and server
ui <- build_ui(config, species_data)
server <- build_server(species_data, habitat_mapping)

# Run the application
shinyApp(ui = ui, server = server)