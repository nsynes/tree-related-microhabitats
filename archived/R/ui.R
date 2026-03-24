# UI Definition
# Main user interface definition

library(shiny)
library(bslib)
library(shinyjs)

# Build the UI
build_ui <- function(config, species_html) {
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
        
        # No filters message (shown when no filters selected)
        div(id = "no_filters_message", class = "no-filters-message",
          div(class = "empty-state",
            icon("filter", class = "empty-state-icon"),
            h3("Select habitat features to find species"),
            p("Use the filters on the left to discover species associated with specific tree-related microhabitats.")
          )
        ),
        
        # Pre-cached species cards HTML
        div(id = "species_container", class = "species-grid",
          HTML(species_html)  # Insert pre-built HTML from cache
        ),
        
        # JavaScript for client-side filtering
        tags$script(HTML("
          $(document).ready(function() {
            // Listen for checkbox changes
            $('input[type=checkbox]').on('change', filterSpecies);
            
            // Initial display - hide cards, show message
            $('.species-card').addClass('hidden');
            $('#no_filters_message').show();
            $('#species_container').hide();
            updateResultsCount();
          });
          
          function filterSpecies() {
            // Get selected habitat filters
            var selectedFilters = [];
            $('input[type=checkbox]:checked').each(function() {
              selectedFilters.push($(this).attr('id'));
            });
            
            if (selectedFilters.length === 0) {
              // No filters selected - show message, hide cards
              $('#no_filters_message').show();
              $('#species_container').hide();
              updateResultsCount();
              return;
            }
            
            // Hide message, show cards container
            $('#no_filters_message').hide();
            $('#species_container').show();
            
            // Filter species cards
            $('.species-card').each(function() {
              var card = $(this);
              var cardHabitats = (card.data('habitats') || '').toString().split(',');
              
              // Check if card matches ALL selected filters
              var matches = selectedFilters.every(function(filter) {
                return cardHabitats.indexOf(filter) !== -1;
              });
              card.toggleClass('hidden', !matches);
            });
            
            updateResultsCount();
          }
          
          function updateResultsCount() {
            var selectedFilters = $('input[type=checkbox]:checked').length;
            var visibleCount = $('.species-card:not(.hidden)').length;
            var totalCount = $('.species-card').length;
            
            var msg;
            if (selectedFilters === 0) {
              // No filters selected
              msg = 'Select habitat features to view matching species (' + totalCount + ' total species available)';
            } else {
              // Filters selected
              msg = 'Showing ' + visibleCount + ' of ' + totalCount + ' species matching selected habitats';
            }
            
            $('#results_info').html('<div class=\"results-info\">' + msg + '</div>');
          }
        "))
      )
    )
  )
}