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
//# sourceMappingURL=status-utils.js.map