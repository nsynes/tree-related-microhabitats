/**
 * Utility functions for handling data display
 */

/**
 * Checks if a value is valid data (not nan, null, undefined, or empty)
 * @param {*} value - The value to check
 * @returns {boolean} - True if the value is valid displayable data
 */
export function isValidData(value) {
  if (value === null || value === undefined) {
    return false;
  }
  
  // Check for string representations of missing data
  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase();
    if (trimmed === '' || trimmed === 'nan' || trimmed === 'null' || trimmed === 'undefined' || trimmed === 'none') {
      return false;
    }
  }
  
  // Check for NaN number
  if (typeof value === 'number' && isNaN(value)) {
    return false;
  }
  
  return true;
}

/**
 * Gets a displayable value or returns null if invalid
 * @param {*} value - The value to process
 * @returns {*} - The value if valid, null otherwise
 */
export function getDisplayValue(value) {
  return isValidData(value) ? value : null;
}