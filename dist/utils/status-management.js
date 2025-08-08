import { getElementByIdOrThrow } from "./dom-helpers.js";
/**
 * Status Management Utility Functions
 *
 * Provides functions for updating status messages and progress displays.
 */
/**
 * Update Line Fisher status display
 * Show Line Fisher-specific status messages with Stockfish event tracking
 */
export const updateLineFisherStatus = (message) => {
    const statusElement = getElementByIdOrThrow("fish-status");
    statusElement.textContent = message;
};
//# sourceMappingURL=status-management.js.map