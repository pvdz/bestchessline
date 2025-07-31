/**
 * Status and Event Utility Functions
 *
 * Provides functions for updating status messages and managing events.
 */
/**
 * Update status message
 * @param message The status message to display
 */
export function updateStatus(message) {
    const statusElement = document.getElementById("engine-status");
    if (statusElement) {
        statusElement.textContent = message;
    }
}
/**
 * Initialize move hover events
 */
export function initializeMoveHoverEvents() {
    addMoveHoverListeners();
}
/**
 * Add move hover listeners
 */
export function addMoveHoverListeners() {
    // No longer needed since arrows are always shown for analysis results
    // This function is kept for potential future use with game moves
}
//# sourceMappingURL=status-utils.js.map