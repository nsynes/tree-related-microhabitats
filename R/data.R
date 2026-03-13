# Data Loading and Processing (Production Mode)
# This file contains only functions needed for production deployment
# For cache building, see: build_cache.R

library(digest)

# Helper function to safely extract and convert to character
safe_extract <- function(row, col_name, default = "") {
  val <- row[[col_name]]
  if(is.null(val) || length(val) == 0 || is.na(val)) {
    return(default)
  }
  as.character(val)
}

# Pre-compute which habitats each species matches
compute_species_habitats <- function(species_row, habitat_mapping) {
  matching_habitats <- c()
  
  for(habitat_id in names(habitat_mapping)) {
    criteria <- habitat_mapping[[habitat_id]]
    col_name <- criteria$column
    
    if(!col_name %in% names(species_row)) next
    
    value <- species_row[[col_name]]
    if(is.na(value)) next
    
    value_str <- as.character(value)
    
    matches <- if(!is.null(criteria$search_term)) {
      grepl(criteria$search_term, value_str, ignore.case = TRUE)
    } else {
      value_str != "" && value_str != "0"
    }
    
    if(matches) {
      matching_habitats <- c(matching_habitats, habitat_id)
    }
  }
  
  paste(matching_habitats, collapse = ",")
}

# Load cached species data (Production Mode)
# This function expects a pre-built cache file to exist
# Use build_cache.R to create the cache locally before deployment
load_species_data <- function(config, habitat_mapping) {
  cache_file <- config$app$cache_file
  
  # Check if cache exists
  if(!file.exists(cache_file)) {
    stop("Cache file not found: ", cache_file, "\n",
         "Run 'source(\"build_cache.R\")' locally to build cache first.")
  }
  
  # Load cache
  tryCatch({
    cat("Loading species data from cache...\n")
    cached <- readRDS(cache_file)
    
    # Validate cache structure
    if(is.null(cached$data)) {
      stop("Invalid cache file format - missing data")
    }
    
    cat("✓ Loaded", nrow(cached$data), "species from cache\n")
    
    # Display cache metadata if available
    if(!is.null(cached$created)) {
      cat("  Cache created:", format(cached$created), "\n")
    }
    if(!is.null(cached$nrows) && !is.null(cached$ncols)) {
      cat("  Dataset size:", cached$nrows, "rows ×", cached$ncols, "columns\n")
    }
    
    return(cached$data)
    
  }, error = function(e) {
    stop("Failed to load cache file: ", cache_file, "\n",
         "Error: ", conditionMessage(e), "\n",
         "Try rebuilding cache with: source('build_cache.R')")
  })
}