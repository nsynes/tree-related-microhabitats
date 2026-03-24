#!/usr/bin/env Rscript
# Build Species Data Cache
# Run this script locally when CSV data is updated
# Then deploy the pre-built cache to shinyapps.io

library(digest)
library(yaml)
library(dplyr)

# Source required functions
source("R/config.R")
source("R/data.R")  # For compute_species_habitats helper
source("R/ui_helpers.R")  # For generate_species_cards_html

# Build cache from CSV (Development Mode)
# This function builds the cache file from the CSV data
build_species_cache <- function(config, habitat_mapping) {
  cache_file <- config$app$cache_file
  data_file <- config$app$data_file
  
  # Verify CSV exists
  if(!file.exists(data_file)) {
    stop("Data file not found: ", data_file)
  }
  
  # Calculate CSV content hash
  cat("Calculating CSV content hash...\n")
  current_hash <- digest::digest(file = data_file, algo = "md5")
  cat("  Hash:", current_hash, "\n")
  
  # Load CSV data
  cat("\nLoading CSV data:", data_file, "\n")
  species_data <- read.csv(data_file, 
                           stringsAsFactors = FALSE, 
                           check.names = FALSE)
  
  cat("  Loaded", nrow(species_data), "species with", 
      ncol(species_data), "columns\n")
  
  # Compute habitat associations
  cat("\nComputing habitat associations...\n")
  species_data$habitats <- sapply(1:nrow(species_data), function(i) {
    if(i %% 100 == 0) {
      cat("  Progress:", i, "/", nrow(species_data), "\n")
    }
    compute_species_habitats(species_data[i, ], habitat_mapping)
  })
  cat("  Completed habitat computation\n")
  
  # Generate HTML for species cards
  cat("\nGenerating HTML for species cards...\n")
  species_html <- generate_species_cards_html(species_data)
  cat("  Generated HTML for", nrow(species_data), "species\n")
  
  # Save to cache with metadata
  cat("\nSaving cache...\n")
  dir.create(dirname(cache_file), showWarnings = FALSE, recursive = TRUE)
  
  cache_obj <- list(
    csv_hash = current_hash,
    csv_file = data_file,
    created = Sys.time(),
    nrows = nrow(species_data),
    ncols = ncol(species_data),
    data = species_data,
    html = species_html  # Pre-built HTML for fast rendering
  )
  
  saveRDS(cache_obj, cache_file)
  
  # Display cache info
  cache_size <- format(file.info(cache_file)$size / 1024^2, digits = 2)
  cat("  Cache file:", cache_file, "\n")
  cat("  Size:", cache_size, "MB\n")
  cat("  Created:", format(cache_obj$created), "\n")
  cat("  Includes: Data + Pre-rendered HTML\n")
  
  return(species_data)
}

# Main execution
cat("\n=== Building Species Data Cache ===\n\n")

# Load configuration
config <- load_config()
habitat_mapping <- build_habitat_mapping(config)

# Build cache from CSV
build_species_cache(config, habitat_mapping)

cat("\n✓ Cache built successfully!\n")
cat("\nNext steps:\n")
cat("  1. Test locally: shiny::runApp()\n")
cat("  2. Deploy to shinyapps.io: source('deploy_shinyapps.R')\n\n")