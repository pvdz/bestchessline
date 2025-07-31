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
 * Enable or disable logging
 */
export function setLoggingEnabled(enabled) {
    loggingEnabled = enabled;
}
/**
 * Get current logging state
 */
export function isLoggingEnabled() {
    return loggingEnabled;
}
/**
 * Logging utility function
 * @param args - Arguments to pass to console.log
 */
export function log(...args) {
    if (loggingEnabled) {
        console.log(...args);
    }
}
/**
 * Error logging utility function
 * @param args - Arguments to pass to console.error
 */
export function logError(...args) {
    if (loggingEnabled) {
        console.error(...args);
    }
}
//# sourceMappingURL=logging.js.map