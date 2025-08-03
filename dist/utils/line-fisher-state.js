import { log } from "./logging.js";
/**
 * Get current Line Fisher state
 */
export const getLineFisherState = () => {
  return lineFisherState;
};
/**
 * Update Line Fisher state
 */
export const updateLineFisherState = (newState) => {
  lineFisherState = { ...lineFisherState, ...newState };
};
/**
 * Get Line Fisher configuration
 */
export const getLineFisherConfig = () => ({ ...lineFisherState.config });
/**
 * Update Line Fisher configuration
 */
export const updateLineFisherConfig = (updates) => {
  lineFisherState.config = { ...lineFisherState.config, ...updates };
};
/**
 * Initialize Line Fisher progress
 */
export const initializeLineFisherProgress = (state) => {
  const totalNodes = calculateTotalNodes(state.config);
  const totalLines = calculateTotalLines(state.config);
  state.progress = {
    totalNodes,
    processedNodes: 0,
    totalLines,
    completedLines: 0,
    currentPosition: "",
    eventsPerSecond: 0,
    totalEvents: 0,
    startTime: Date.now(),
    nodeProgress: 0,
    lineProgress: 0,
  };
};
/**
 * Update Line Fisher progress
 */
export const updateLineFisherProgress = (state) => {
  // Calculate progress percentages
  state.progress.nodeProgress =
    state.progress.totalNodes > 0
      ? (state.progress.processedNodes / state.progress.totalNodes) * 100
      : 0;
  state.progress.lineProgress =
    state.progress.totalLines > 0
      ? (state.progress.completedLines / state.progress.totalLines) * 100
      : 0;
};
/**
 * Save Line Fisher progress
 */
export const saveLineFisherProgress = (state) => {
  try {
    const progressData = {
      timestamp: Date.now(),
      progress: state.progress,
      results: state.results,
      analyzedPositions: Array.from(state.analyzedPositions),
    };
    localStorage.setItem("lineFisherProgress", JSON.stringify(progressData));
    log("Line Fisher progress saved");
  } catch (error) {
    log(`Failed to save Line Fisher progress: ${error}`);
  }
};
/**
 * Resume Line Fisher analysis from saved state
 */
export const resumeLineFisherAnalysis = (state) => {
  // The analysis can resume from the current state
  // The analyzedPositions set contains all positions that have been analyzed
  // The results array contains all completed lines
  // The progress object contains current progress information
};
/**
 * Handle Line Fisher interruption
 */
export const handleLineFisherInterruption = (state) => {
  // Save current progress
  saveLineFisherProgress(state);
  // Update UI to show interruption
  log("Line Fisher analysis interrupted");
};
// Import the calculation functions
import {
  calculateTotalNodes,
  calculateTotalLines,
} from "./line-fisher-calculations.js";
//# sourceMappingURL=line-fisher-state.js.map
