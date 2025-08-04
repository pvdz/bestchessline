import * as TreeDigger from "../tree-digger.js";
import * as LineFisher from "../line_fisher.js";
import { getElementByIdOrThrow } from "./dom-helpers.js";

/**
 * Status Management Utility Functions
 *
 * Provides functions for updating status messages and progress displays.
 */

/**
 * Update tree digger status
 */
export function updateTreeDiggerStatus(message?: string): void {
  const statusElement = getElementByIdOrThrow("tree-digger-status");
  if (!statusElement) return;

  if (message) {
    statusElement.textContent = message;
    return;
  }

  const isAnalyzing = TreeDigger.isAnalyzing();
  const progress = TreeDigger.getProgress();
  const analysis = TreeDigger.getCurrentAnalysis();

  if (isAnalyzing) {
    const progressPercent =
      progress.totalPositions > 0
        ? Math.round(
            (progress.analyzedPositions / progress.totalPositions) * 100,
          )
        : 0;
    const currentPos = progress.currentPosition.substring(0, 30) + "...";
    statusElement.textContent = `Analyzing... ${progress.analyzedPositions}/${progress.totalPositions} (${progressPercent}%) - ${currentPos}`;
  } else if (analysis?.isComplete) {
    statusElement.textContent = "Analysis complete";
  } else {
    statusElement.textContent = "Ready";
  }
}

/**
 * Update Line Fisher status display
 * Show Line Fisher-specific status messages with Stockfish event tracking
 */
export const updateLineFisherStatus = (message: string): void => {
  const statusElement = getElementByIdOrThrow("line-fisher-status");

  // Get current progress for Stockfish event info
  const state = LineFisher.getLineFisherState();
  const progress = state.progress;

  // Add Stockfish event information to the message
  const eventInfo =
    progress.totalEvents > 0
      ? ` | Stockfish: ${progress.totalEvents} total, ${progress.eventsPerSecond}/s`
      : "";

  statusElement.textContent = message + eventInfo;
};
