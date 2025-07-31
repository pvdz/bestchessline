import { getInputElement, querySelectorHTMLElementBySelector } from "./dom-helpers.js";
import * as Stockfish from "../stockfish-client.js";

/**
 * Thread Management Utility Functions
 * 
 * Provides functions for managing thread inputs and fallback mode.
 */

/**
 * Update threads input for fallback mode
 */
export function updateThreadsInputForFallbackMode(): void {
  const threadsInput = getInputElement("threads");
  const threadsLabel = querySelectorHTMLElementBySelector(
    'label[for="threads"]',
  );

  if (Stockfish.isFallbackMode()) {
    // In fallback mode, disable threads input and show it's forced to 1
    if (threadsInput) {
      threadsInput.disabled = true;
      threadsInput.value = "1";
      threadsInput.title = "Single-threaded mode - threads fixed at 1";
    }
    if (threadsLabel) {
      threadsLabel.textContent = "Threads (Forced):";
      threadsLabel.title =
        "Single-threaded mode - multi-threading not available";
    }
  } else {
    // In full mode, enable threads input
    if (threadsInput) {
      threadsInput.disabled = false;
      threadsInput.title = "Number of CPU threads for analysis";
    }
    if (threadsLabel) {
      threadsLabel.textContent = "Threads:";
      threadsLabel.title = "Number of CPU threads for analysis";
    }
  }
}

/**
 * Update tree digger threads input for fallback mode
 */
export function updateTreeDiggerThreadsForFallbackMode(): void {
  const treeDiggerThreadsInput = document.getElementById(
    "tree-digger-threads",
  ) as HTMLInputElement;
  const treeDiggerThreadsValue = document.getElementById(
    "tree-digger-threads-value",
  );
  const treeDiggerThreadsLabel = querySelectorHTMLElementBySelector(
    'label[for="tree-digger-threads"]',
  );

  if (Stockfish.isFallbackMode()) {
    // In fallback mode, disable tree digger threads input and show it's forced to 1
    if (treeDiggerThreadsInput) {
      treeDiggerThreadsInput.disabled = true;
      treeDiggerThreadsInput.value = "1";
      treeDiggerThreadsInput.title =
        "Single-threaded mode - threads fixed at 1";
    }
    if (treeDiggerThreadsValue) {
      treeDiggerThreadsValue.textContent = "1 (forced)";
    }
    if (treeDiggerThreadsLabel) {
      treeDiggerThreadsLabel.textContent = "Threads:";
      treeDiggerThreadsLabel.title =
        "Single-threaded mode - multi-threading not available";
    }
  } else {
    // In full mode, enable tree digger threads input
    if (treeDiggerThreadsInput) {
      treeDiggerThreadsInput.disabled = false;
      treeDiggerThreadsInput.title =
        "Number of CPU threads for tree digger analysis";
    }
    if (treeDiggerThreadsLabel) {
      treeDiggerThreadsLabel.textContent = "Threads:";
      treeDiggerThreadsLabel.title =
        "Number of CPU threads for tree digger analysis";
    }
  }
} 