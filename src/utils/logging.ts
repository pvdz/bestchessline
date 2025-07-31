/**
 * Logging Utility Functions
 * 
 * Provides controlled logging capabilities with enable/disable functionality.
 * These functions allow for debug logging that can be turned on/off as needed.
 */

// ============================================================================
// LOGGING CONFIGURATION
// ============================================================================

let loggingEnabled = false;

/**
 * Logging utility function
 * @param args - Arguments to pass to console.log
 */
export function log(...args: unknown[]): void {
  if (loggingEnabled) {
    console.log(...args);
  }
}

/**
 * Error logging utility function
 * @param args - Arguments to pass to console.error
 */
export function logError(...args: unknown[]): void {
  if (loggingEnabled) {
    console.error(...args);
  }
} 