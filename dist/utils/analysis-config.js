import { getInputElement, getButtonElement } from "./dom-helpers.js";
import { getAppState } from "../main.js";
import * as Stockfish from "../stockfish-client.js";
/**
 * Analysis Configuration Utility Functions
 *
 * Provides functions for managing analysis configuration and button states.
 */
/**
 * Get analysis options from UI
 */
export function getAnalysisOptions() {
  const maxDepth = getInputElement("max-depth")?.value || "20";
  const whiteMoves = getInputElement("white-moves")?.value || "5";
  const responderMoves = getInputElement("responder-moves")?.value || "5";
  // Force threads to 1 in fallback mode
  const threads = Stockfish.isFallbackMode()
    ? "1"
    : getInputElement("threads")?.value || "1";
  return {
    depth: parseInt(maxDepth),
    threads: parseInt(threads),
    multiPV: Math.max(parseInt(whiteMoves), parseInt(responderMoves)),
  };
}
/**
 * Update button states
 */
export function updateButtonStates() {
  const appState = getAppState();
  const startBtn = getButtonElement("start-analysis");
  const stopBtn = getButtonElement("stop-analysis");
  // Disable start button if main analysis is running OR position evaluation is running
  const isStockfishBusy =
    appState.isAnalyzing || appState.positionEvaluation.isAnalyzing;
  if (startBtn) startBtn.disabled = isStockfishBusy;
  if (stopBtn) stopBtn.disabled = !appState.isAnalyzing;
}
//# sourceMappingURL=analysis-config.js.map
