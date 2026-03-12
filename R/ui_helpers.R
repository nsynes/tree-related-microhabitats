# UI Helper Functions
# Functions for generating UI components

library(shiny)
library(bslib)

# Generate CSS with theme colors from config
generate_css <- function(theme) {
  sprintf("
    :root {
      --forest-dark: %s;
      --forest-medium: %s;
      --forest-light: %s;
      --bark-brown: %s;
      --stone-grey: %s;
      --light-grey: %s;
    }
    
    body {
      background-color: #f5f5f5;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
    
    .main-title {
      background: linear-gradient(135deg, var(--forest-dark), var(--forest-medium));
      color: white;
      padding: 20px;
      margin: -12px -12px 12px -12px;
      border-radius: 8px 8px 0 0;
    }
    
    .main-title h2 {
      margin: 0;
      font-weight: 600;
    }
    
    .main-title p {
      margin: 5px 0 0 0;
      opacity: 0.9;
      font-size: 0.9em;
    }
    
    .habitat-panel {
      background-color: white;
      border-radius: 8px;
      padding: 15px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      height: calc(100vh - 180px);
      overflow-y: auto;
    }
    
    .species-panel {
      background-color: white;
      border-radius: 8px;
      padding: 15px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      height: calc(100vh - 180px);
      overflow-y: auto;
    }
    
    .panel-title {
      color: var(--forest-dark);
      font-size: 1.2em;
      font-weight: 600;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid var(--forest-light);
    }
    
    .accordion {
      --bs-accordion-border-color: #dee2e6;
      --bs-accordion-btn-bg: #f8f9fa;
    }
    
    .accordion-button {
      background-color: var(--forest-light) !important;
      color: white !important;
      font-weight: 500;
    }
    
    .accordion-button:not(.collapsed) {
      background-color: var(--forest-medium) !important;
      color: white !important;
    }
    
    .accordion-body {
      padding: 15px;
      background-color: #fafafa;
    }
    
    .checkbox-group {
      margin-left: 10px;
    }
    
    .checkbox-group label {
      display: block;
      margin-bottom: 8px;
      color: var(--stone-grey);
      cursor: pointer;
    }
    
    .checkbox-group input[type='checkbox'] {
      margin-right: 8px;
      cursor: pointer;
    }
    
    .sub-category {
      margin-left: 20px;
      margin-top: 10px;
      padding-left: 15px;
      border-left: 2px solid var(--forest-light);
    }
    
    .sub-category-title {
      font-weight: 600;
      color: var(--forest-medium);
      margin-bottom: 8px;
    }
    
    .species-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 15px;
      margin-top: 10px;
    }
    
    .species-card {
      background: linear-gradient(to bottom, white, #fafafa);
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 15px;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    
    .species-card.hidden {
      display: none;
    }
    
    .species-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.15);
      border-color: var(--forest-medium);
    }
    
    .species-scientific {
      font-style: italic;
      color: var(--forest-dark);
      font-size: 1.1em;
      font-weight: 500;
      margin-bottom: 5px;
    }
    
    .species-common {
      color: var(--stone-grey);
      font-size: 0.9em;
      margin-bottom: 10px;
    }
    
    .species-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin-top: 10px;
    }
    
    .species-tag {
      background-color: var(--forest-light);
      color: white;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 0.75em;
      font-weight: 500;
    }
    
    .species-tag.family {
      background-color: var(--bark-brown);
    }
    
    .results-info {
      color: var(--stone-grey);
      font-size: 0.9em;
      margin-bottom: 10px;
      padding: 8px;
      background-color: var(--light-grey);
      border-radius: 4px;
    }
  ", theme$forest_dark, theme$forest_medium, theme$forest_light, 
     theme$bark_brown, theme$stone_grey, theme$light_grey)
}

# Generate UI checkboxes for a category
generate_category_ui <- function(category) {
  div(
    div(class = "sub-category-title", category$title),
    div(class = "sub-category",
      lapply(category$filters, function(filter) {
        checkboxInput(filter$id, filter$label, FALSE)
      })
    )
  )
}

# Generate UI for a habitat group (accordion panel)
generate_group_ui <- function(group) {
  accordion_panel(
    title = group$title,
    icon = icon(group$icon),
    div(class = "checkbox-group",
      lapply(group$categories, generate_category_ui)
    )
  )
}