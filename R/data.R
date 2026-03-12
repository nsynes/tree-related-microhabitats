# Data Loading and Processing
# Functions for loading species data, caching, and habitat computation

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

# Load or build cached species data
load_species_data <- function(config, habitat_mapping) {
  cache_file <- config$app$cache_file
  data_version <- config$app$data_version
  
  # Check if cache exists and is valid
  if(file.exists(cache_file)) {
    cat("Loading species data from cache...\n")
    cached <- readRDS(cache_file)
    
    # Verify version matches
    if(!is.null(cached$version) && cached$version == data_version) {
      cat("Cache is valid (version", data_version, ")\n")
      return(cached$data)
    } else {
      cat("Cache version mismatch. Rebuilding...\n")
    }
  }
  
  # Cache doesn't exist or is invalid - build it
  cat("Building species data and cache...\n")
  
  # Load species data from CSV
  species_data <- read.csv(config$app$data_file, 
                           stringsAsFactors = FALSE, 
                           check.names = FALSE)
  
  # Add habitat data to each species
  species_data$habitats <- sapply(1:nrow(species_data), function(i) {
    compute_species_habitats(species_data[i, ], habitat_mapping)
  })
  
  # Save to cache
  dir.create(dirname(cache_file), showWarnings = FALSE, recursive = TRUE)
  saveRDS(list(version = data_version, data = species_data), cache_file)
  cat("Cache saved to", cache_file, "\n")
  
  return(species_data)
}