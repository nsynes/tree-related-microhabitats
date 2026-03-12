# UI Definition
# Main user interface definition

library(shiny)
library(bslib)
library(shinyjs)

# Build the UI
build_ui <- function(config, species_data) {
  page_fillable(
    useShinyjs(),
    
    # Custom CSS with theme from config
    tags$head(
      tags$style(HTML(generate_css(config$theme)))
    ),
    
    # Main title header from config
    div(class = "main-title",
      h2(config$app$title),
      p(config$app$subtitle)
    ),
    
    # Two-column layout
    layout_columns(
      col_widths = c(5, 7),
      
      # LEFT PANEL: Habitat Selector
      div(class = "habitat-panel",
        div(class = "panel-title", "Habitat Features"),
        
        # Generate accordion dynamically from config
        do.call(accordion, c(
          list(id = "habitat_accordion", multiple = TRUE),
          lapply(config$habitat_groups, generate_group_ui)
        ))
      ),
      
      # RIGHT PANEL: Species Results
      div(class = "species-panel",
        div(class = "panel-title", "Associated Species"),
        
        uiOutput("results_info"),
        
        # Pre-rendered species cards
        div(id = "species_container", class = "species-grid",
          lapply(1:nrow(species_data), function(i) {
            row <- species_data[i, ]
            sci_name <- safe_extract(row, "Scientific name", "Unknown")
            common_name <- safe_extract(row, "Common name", "")
            class_name <- safe_extract(row, "Class", "")
            family_name <- safe_extract(row, "Family", "")
            habitats <- row$habitats
            
            tags$div(
              class = "species-card hidden",
              id = paste0("species-", i),
              `data-habitats` = habitats,
              tags$div(class = "species-scientific", sci_name),
              if(common_name != "") tags$div(class = "species-common", common_name),
              if(class_name != "" || family_name != "") {
                tags$div(
                  class = "species-tags",
                  if(class_name != "") tags$span(class = "species-tag", class_name),
                  if(family_name != "") tags$span(class = "species-tag family", family_name)
                )
              }
            )
          })
        )
      )
    )
  )
}