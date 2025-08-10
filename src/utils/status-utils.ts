import { getElementByIdOrThrow } from "./dom-helpers.js";

/**
 * Status and Event Utility Functions
 *
 * Provides functions for updating status messages and managing events.
 */

/**
 * Update status message
 * @param message The status message to display
 */
export function updateStatus(message: string): void {
  const statusElement = getElementByIdOrThrow("bestmove-status");
  if (statusElement) {
    statusElement.textContent = message;
  }
}
