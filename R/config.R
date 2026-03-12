# Configuration Management
# Load and parse config.yaml

library(yaml)

# Load configuration
load_config <- function() {
  config <- yaml::read_yaml("config.yaml")
  return(config)
}

# Build habitat_mapping from config
build_habitat_mapping <- function(config) {
  habitat_mapping <- list()
  
  for(group in config$habitat_groups) {
    for(category in group$categories) {
      for(filter in category$filters) {
        habitat_mapping[[filter$id]] <- list(
          column = filter$column,
          search_term = filter$search_term
        )
      }
    }
  }
  
  return(habitat_mapping)
}