# Server Logic
# Server-side logic for handling user interactions and filtering

library(shiny)
library(shinyjs)

# Build the server function
build_server <- function(species_data, habitat_mapping) {
  function(input, output, session) {
    
    # Track visible species count (start at 0 - no cards shown until filters selected)
    visible_count <- reactiveVal(0)
    
    # Watch for any checkbox changes and filter cards
    observe({
      # Get all selected habitat checkboxes
      selected_habitats <- names(habitat_mapping)[sapply(names(habitat_mapping), function(id) {
        isTRUE(input[[id]])
      })]
      
      if(length(selected_habitats) == 0) {
        # Hide all cards when no filters selected - updates count via JavaScript
        runjs("
          $('.species-card').addClass('hidden');
          Shiny.setInputValue('visible_count', 0);
        ")
      } else {
        # Build JavaScript to filter cards based on selected habitats
        selected_js <- paste0("['", paste(selected_habitats, collapse = "','"), "']")
        
        js_code <- sprintf("
          var selectedHabitats = %s;
          var visibleCount = 0;
          
          $('.species-card').each(function() {
            var cardHabitats = $(this).attr('data-habitats');
            if (!cardHabitats) {
              $(this).addClass('hidden');
              return;
            }
            
            var habitatsArray = cardHabitats.split(',');
            var matches = selectedHabitats.some(function(habitat) {
              return habitatsArray.indexOf(habitat) !== -1;
            });
            
            if (matches) {
              $(this).removeClass('hidden');
              visibleCount++;
            } else {
              $(this).addClass('hidden');
            }
          });
          
          Shiny.setInputValue('visible_count', visibleCount);
        ", selected_js)
        
        runjs(js_code)
      }
    })
    
    # Update count when it changes
    observeEvent(input$visible_count, {
      visible_count(input$visible_count)
    })
    
    # Render results info
    output$results_info <- renderUI({
      num_species <- visible_count()
      total_species <- nrow(species_data)
      
      if(num_species == 0) {
        div(class = "results-info",
          paste0("Select habitat features to view matching species (", total_species, " total species available)")
        )
      } else if(num_species == total_species) {
        div(class = "results-info",
          paste0("Showing all ", total_species, " species (select habitat features to filter)")
        )
      } else {
        div(class = "results-info",
          paste0("Showing ", num_species, " of ", total_species, " species matching selected habitats")
        )
      }
    })
  }
}