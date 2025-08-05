import { getButtonElement } from "./dom-helpers.js";
import { getAppState } from "../line/main.js";

/**
 * Button Utility Functions
 *
 * Provides functions for managing button states and interactions.
 */

/**
 * Update navigation buttons
 */
export function updateNavigationButtons(): void {
  const appState = getAppState();
  const prevBtn = getButtonElement("prev-move");
  const nextBtn = getButtonElement("next-move");

  if (prevBtn) {
    prevBtn.disabled = appState.currentMoveIndex <= -1;
  }
  if (nextBtn) {
    nextBtn.disabled = appState.currentMoveIndex >= appState.moves.length - 1;
  }
}
