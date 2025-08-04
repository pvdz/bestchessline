import { log } from "./logging.js";
import { getElementByIdOrThrow } from "./dom-helpers.js";
import { showToast } from "./ui-utils.js";
import {
  getLineFisherConfigFromUI,
  validateLineFisherConfig,
  showLineFisherConfigError,
} from "./line-fisher-ui-utils.js";
import {
  getLineFisherState,
  updateLineFisherState,
  startLineFisherAnalysis,
  stopLineFisherAnalysis,
  resetLineFisherAnalysis,
  continueLineFisherAnalysis,
} from "../line_fisher.js";
import {
  updateLineFisherConfigDisplay,
  updateLineFisherProgressDisplay,
  updateLineFisherExploredLines,
} from "./line-fisher-results.js";
import { getFEN, setPosition } from "../chess-board.js";
// ============================================================================
// LINE FISHER MANAGER FUNCTIONS
// ============================================================================
/**
 * Start Line Fisher analysis from manager
 * Initialize analysis state, validate configuration, begin analysis process.
 * Get configuration from UI, validate configuration, initialize analysis state,
 * begin recursive analysis, and update button states
 */
export const startLineFisherAnalysisFromManager = async () => {
  try {
    // Get current configuration from UI
    const config = getLineFisherConfigFromUI();
    // Validate configuration
    const validation = validateLineFisherConfig(config);
    if (!validation.isValid) {
      showLineFisherConfigError(validation.errorMessage);
      return;
    }
    // Initialize analysis state
    const state = getLineFisherState();
    // Update state with new configuration
    state.config = config;
    state.isAnalyzing = true;
    state.isComplete = false;
    state.results = [];
    state.analyzedPositions.clear();
    state.analysisQueue = [];
    // Initialize progress tracking (call directly from line_fisher module)
    state.progress = {
      totalNodes: 0,
      processedNodes: 0,
      totalLines: 0,
      completedLines: 0,
      currentPosition: "",
      currentAction: "Initializing...",
      eventsPerSecond: 0,
      totalEvents: 0,
      startTime: Date.now(),
    };
    // Update state
    updateLineFisherState(state);
    // Update UI to show analyzing state and config
    await updateLineFisherStateInfo(state);
    // Update button states
    await updateLineFisherButtonStates();
    // Begin recursive analysis
    await startLineFisherAnalysis();
  } catch (error) {
    showToast("Failed to start analysis", "#f44336", 4000);
  }
};
/**
 * Stop Line Fisher analysis from manager
 * Halt analysis process and update UI state.
 * Halt analysis process, preserve partial results, update button states, and update status
 */
export const stopLineFisherAnalysisFromManager = async () => {
  log("Stopping Line Fisher analysis from manager");
  try {
    // Get current state
    const state = getLineFisherState();
    // Stop analysis process
    stopLineFisherAnalysis();
    // Update state
    state.isAnalyzing = false;
    state.isComplete = false;
    updateLineFisherState(state);
    // Update UI to remove analyzing state
    const configElement = document.getElementById("line-fisher-config");
    if (configElement) {
      configElement.classList.remove("line-fisher-analyzing");
    }
    // Update button states
    updateLineFisherButtonStates();
    // Update status
    const statusElement = document.getElementById("line-fisher-status");
    if (statusElement) {
      statusElement.textContent = "Analysis stopped";
      statusElement.className = "line-fisher-status stopped";
    }
    // Show success notification
    showToast("Analysis stopped", "#4CAF50", 3000);
    log("Line Fisher analysis stopped successfully");
  } catch (error) {
    log(`Error stopping Line Fisher analysis: ${error}`);
    showToast("Failed to stop analysis", "#f44336", 4000);
  }
};
/**
 * Reset Line Fisher analysis from manager
 * Clear all results and reset to initial state.
 * Clear all results, reset progress, clear UI, and reset state
 */
export const resetLineFisherAnalysisFromManager = async () => {
  log("Resetting Line Fisher analysis from manager");
  try {
    // Reset analysis process
    resetLineFisherAnalysis();
    // Clear UI
    const resultsElement = document.getElementById("line-fisher-results");
    if (resultsElement) {
      resultsElement.innerHTML = `
        <div class="line-fisher-no-results">
          <p>No analysis results. Start a new analysis to see results here.</p>
        </div>
      `;
    }
    // Clear progress display
    const progressElement = document.getElementById("line-fisher-progress");
    if (progressElement) {
      const progressBar = progressElement.querySelector(
        ".line-fisher-progress-bar-fill",
      );
      if (progressBar) {
        progressBar.style.width = "0%";
      }
      const progressText = progressElement.querySelector(
        ".line-fisher-progress-text",
      );
      if (progressText) {
        progressText.textContent = "0%";
      }
    }
    // Clear activity monitor
    const activityElement = document.getElementById("line-fisher-activity");
    if (activityElement) {
      const eventsPerSecond = activityElement.querySelector(
        ".line-fisher-events-per-second",
      );
      const totalEvents = activityElement.querySelector(
        ".line-fisher-total-events",
      );
      const activityStatus = activityElement.querySelector(
        ".line-fisher-activity-status",
      );
      if (eventsPerSecond) eventsPerSecond.textContent = "0.00";
      if (totalEvents) totalEvents.textContent = "0";
      if (activityStatus) {
        activityStatus.textContent = "Idle";
        activityStatus.className = "line-fisher-activity-status idle";
      }
    }
    // Update button states
    updateLineFisherButtonStates();
    // Update status
    const statusElement = document.getElementById("line-fisher-status");
    if (statusElement) {
      statusElement.textContent = "Ready";
      statusElement.className = "line-fisher-status ready";
    }
    // Show success notification
    showToast("Analysis reset", "#4CAF50", 3000);
    log("Line Fisher analysis reset successfully");
  } catch (error) {
    log(`Error resetting Line Fisher analysis: ${error}`);
    showToast("Failed to reset analysis", "#f44336", 4000);
  }
};
/**
 * Continue Line Fisher analysis from manager
 * Resume analysis from where it left off.
 * Resume analysis from saved state, restore progress, and continue tree building
 */
export const continueLineFisherAnalysisFromManager = async () => {
  log("Continuing Line Fisher analysis from manager");
  try {
    // Get current state
    const state = getLineFisherState();
    // Check if there are results to continue from
    if (state.results.length === 0) {
      showToast("No analysis to continue", "#FF9800", 3000);
      return;
    }
    // Resume analysis state
    state.isAnalyzing = true;
    state.isComplete = false;
    updateLineFisherState(state);
    // Update UI to show analyzing state
    const configElement = document.getElementById("line-fisher-config");
    if (configElement) {
      configElement.classList.add("line-fisher-analyzing");
    }
    // Update button states
    updateLineFisherButtonStates();
    // Update status
    const statusElement = document.getElementById("line-fisher-status");
    if (statusElement) {
      statusElement.textContent = "Continuing analysis...";
      statusElement.className = "line-fisher-status analyzing";
    }
    // Continue analysis
    await continueLineFisherAnalysis();
    log("Line Fisher analysis continued successfully");
  } catch (error) {
    log(`Error continuing Line Fisher analysis: ${error}`);
    showToast("Failed to continue analysis", "#f44336", 4000);
  }
};
/**
 * Copy Line Fisher state to clipboard
 * Export current analysis state to clipboard.
 * Serialize current state, copy to clipboard, and show success notification
 */
export const copyLineFisherStateToClipboardFromManager = async () => {
  log("Copying Line Fisher lines to clipboard");
  try {
    // Get current state
    const state = getLineFisherState();
    const completedLines = state.results.filter((result) => result.isComplete);
    if (completedLines.length === 0) {
      showToast("No completed lines to copy", "#FF9800", 3000);
      return;
    }
    // Create simple list of lines (one per line) - only completed lines
    const lines = state.results
      .filter((result) => result.isComplete)
      .map((result) => result.notation)
      .join("\n");
    // Copy to clipboard
    await navigator.clipboard.writeText(lines);
    // Show success notification
    showToast(
      `Copied ${completedLines.length} completed lines to clipboard`,
      "#4CAF50",
      3000,
    );
    log("Line Fisher lines copied to clipboard successfully");
  } catch (error) {
    console.error("Error copying Line Fisher lines:", error);
    log(`Error copying Line Fisher lines: ${error}`);
    showToast("Failed to copy lines", "#f44336", 4000);
  }
};
/**
 * Export Line Fisher state to file
 * Export current analysis state to JSON file.
 * Serialize state to JSON, trigger file download, and include timestamp in filename
 */
export const exportLineFisherStateFromManager = async () => {
  log("Exporting Line Fisher state to clipboard");
  try {
    // Get current state
    const state = getLineFisherState();
    // Get the current board FEN
    const rootFEN = getFEN();
    // Serialize state to JSON - complete for proper continuation
    const serializedState = {
      version: "1.0.0",
      timestamp: Date.now(),
      rootFEN: rootFEN,
      config: state.config,
      results: state.results,
      analyzedPositions: Array.from(state.analyzedPositions), // Essential for continuation
      analysisQueue: state.analysisQueue, // Essential for continuation
      progress: state.progress, // Essential for continuation
      isAnalyzing: state.isAnalyzing, // Essential for state management
      isComplete: state.isComplete, // Essential for state management
      baselineScore: state.config.baselineScore,
      baselineMoves: state.config.baselineMoves,
    };
    const stateJson = JSON.stringify(serializedState, null, 2);
    // Copy to clipboard
    await navigator.clipboard.writeText(stateJson);
    // Show success notification
    const message =
      state.results.length > 0
        ? `State copied to clipboard (${state.results.length} lines)`
        : "State copied to clipboard";
    showToast(message, "#4CAF50", 3000);
    log("Line Fisher state copied to clipboard successfully");
  } catch (error) {
    console.error("Error copying Line Fisher state:", error);
    log(`Error copying Line Fisher state: ${error}`);
    showToast("Failed to copy state", "#f44336", 4000);
  }
};
/**
 * Import Line Fisher state from manager
 * Import analysis state from file.
 * Handle file input, parse JSON state, validate state format, and load state into UI
 */
export const importLineFisherStateFromManager = async () => {
  log("Importing Line Fisher state from manager");
  try {
    // Create file input element
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".json";
    fileInput.style.display = "none";
    // Handle file selection
    fileInput.onchange = async (event) => {
      const target = event.target;
      const file = target.files?.[0];
      if (!file) {
        showToast("No file selected", "#FF9800", 3000);
        return;
      }
      try {
        // Read file content
        const text = await file.text();
        const importedState = JSON.parse(text);
        // Validate state format
        if (!importedState.version || !importedState.state) {
          throw new Error("Invalid state format");
        }
        // Load state into UI
        // Convert Set back from array
        const state = importedState.state;
        state.analyzedPositions = new Set(state.analyzedPositions);
        // Update state
        updateLineFisherState(state);
        // Update UI displays
        await updateLineFisherConfigDisplay(state);
        updateLineFisherProgressDisplay(state.progress);
        updateLineFisherExploredLines(state.results);
        // Update button states
        updateLineFisherButtonStates();
        // Show success notification
        showToast("State imported successfully", "#4CAF50", 3000);
        log("Line Fisher state imported successfully");
      } catch (error) {
        log(`Error importing Line Fisher state: ${error}`);
        showToast("Failed to import state", "#f44336", 4000);
      }
      // Clean up
      document.body.removeChild(fileInput);
    };
    // Trigger file selection
    document.body.appendChild(fileInput);
    fileInput.click();
  } catch (error) {
    log(`Error setting up file import: ${error}`);
    showToast("Failed to import state", "#f44336", 4000);
  }
};
/**
 * Update Line Fisher button states
 * Enable/disable buttons based on analysis state, update visual feedback,
 * and handle button state transitions
 */
export const updateLineFisherButtonStates = () => {
  // Update button states based on analysis status
  const stopBtn = getElementByIdOrThrow("stop-line-fisher");
  const resetBtn = getElementByIdOrThrow("reset-line-fisher");
  const continueBtn = getElementByIdOrThrow("continue-line-fisher");
  const copyBtn = getElementByIdOrThrow("copy-line-fisher-state");
  const exportBtn = getElementByIdOrThrow("export-line-fisher-state");
  const importBtn = getElementByIdOrThrow("import-line-fisher-state");
  // Get current analysis state from Line Fisher state
  const lineFisherState = getLineFisherState();
  const isAnalyzing = lineFisherState.isAnalyzing;
  const hasResults = lineFisherState.results.length > 0;
  // Update button states
  stopBtn.disabled = !isAnalyzing;
  resetBtn.disabled = isAnalyzing;
  continueBtn.disabled = isAnalyzing || !hasResults;
  copyBtn.disabled = false; // Copy should always work
  exportBtn.disabled = false; // Export should always work
  importBtn.disabled = isAnalyzing;
};
/**
 * Update Line Fisher state information display
 * Show current state information in the UI.
 * Show current state information in the UI
 */
export const updateLineFisherStateInfo = async (state) => {
  log("Updating Line Fisher state info");
  // Update configuration display
  try {
    await updateLineFisherConfigDisplay(state);
  } catch (error) {
    console.error("Failed to update config display:", error);
  }
  // Update progress display
  try {
    updateLineFisherProgressDisplay(state.progress);
  } catch (error) {
    console.error("Failed to update progress display:", error);
  }
  // Update results display
  try {
    updateLineFisherExploredLines(state.results);
  } catch (error) {
    console.error("Failed to update results display:", error);
  }
};
/**
 * Handle Line Fisher state file input
 * Process file input for state import.
 * Process file input event, validate file format, load state data, and update UI
 */
export const handleLineFisherStateFileInput = async (event) => {
  log("Handling Line Fisher state file input");
  try {
    const target = event.target;
    const file = target.files?.[0];
    if (!file) {
      showToast("No file selected", "#FF9800", 3000);
      return;
    }
    // Validate file type
    if (!file.name.endsWith(".json")) {
      showToast("Please select a JSON file", "#FF9800", 3000);
      return;
    }
    // Read file content
    const text = await file.text();
    const importedState = JSON.parse(text);
    // Validate state format
    if (
      !importedState.version ||
      !importedState.config ||
      !importedState.results
    ) {
      throw new Error("Invalid state format");
    }
    // Load state into UI
    const currentState = getLineFisherState();
    // Update all essential fields for proper continuation
    currentState.config = importedState.config;
    currentState.results = importedState.results;
    currentState.config.baselineScore = importedState.baselineScore;
    currentState.config.baselineMoves = importedState.baselineMoves;
    // Restore analyzed positions for continuation
    if (importedState.analyzedPositions) {
      currentState.analyzedPositions = new Set(importedState.analyzedPositions);
    }
    // Restore analysis queue for continuation
    if (importedState.analysisQueue) {
      currentState.analysisQueue = importedState.analysisQueue;
    }
    // Restore progress for continuation
    if (importedState.progress) {
      currentState.progress = importedState.progress;
    }
    // Restore state flags
    if (importedState.isAnalyzing !== undefined) {
      currentState.isAnalyzing = importedState.isAnalyzing;
    }
    if (importedState.isComplete !== undefined) {
      currentState.isComplete = importedState.isComplete;
    }
    // Restore board position if rootFEN is provided
    if (importedState.config?.rootFEN) {
      setPosition(importedState.config.rootFEN);
    }
    // Update state
    updateLineFisherState(currentState);
    // Update UI displays
    await updateLineFisherConfigDisplay(currentState);
    updateLineFisherProgressDisplay(currentState.progress);
    updateLineFisherExploredLines(currentState.results);
    // Update button states
    updateLineFisherButtonStates();
    // Show success notification
    const message = importedState.config?.rootFEN
      ? `State imported from ${file.name} (board position restored)`
      : `State imported from ${file.name}`;
    showToast(message, "#4CAF50", 3000);
    log("Line Fisher state imported from file successfully");
  } catch (error) {
    console.error("Error handling Line Fisher state file input:", error);
    log(`Error handling Line Fisher state file input: ${error}`);
    showToast("Failed to import state from file", "#f44336", 4000);
  }
};
/**
 * Recover Line Fisher from crash
 * Reset UI state after analysis crash.
 * Reset UI state after crash, clear analysis state, update button states, and show recovery message
 */
export const recoverLineFisherFromCrash = async () => {
  log("Recovering Line Fisher from crash");
  try {
    // Get current state
    const state = getLineFisherState();
    // Reset analysis state
    state.isAnalyzing = false;
    state.isComplete = false;
    updateLineFisherState(state);
    // Clear UI analyzing state
    const configElement = document.getElementById("line-fisher-config");
    if (configElement) {
      configElement.classList.remove("line-fisher-analyzing");
    }
    // Update button states
    updateLineFisherButtonStates();
    // Update status
    const statusElement = document.getElementById("line-fisher-status");
    if (statusElement) {
      statusElement.textContent = "Recovered from crash";
      statusElement.className = "line-fisher-status recovered";
    }
    // Show recovery message
    showToast("Recovered from analysis crash", "#FF9800", 5000);
    // Clear progress display
    const progressElement = document.getElementById("line-fisher-progress");
    if (progressElement) {
      const progressBar = progressElement.querySelector(
        ".line-fisher-progress-bar-fill",
      );
      if (progressBar) {
        progressBar.style.width = "0%";
      }
      const progressText = progressElement.querySelector(
        ".line-fisher-progress-text",
      );
      if (progressText) {
        progressText.textContent = "0%";
      }
    }
    // Clear activity monitor
    const activityElement = document.getElementById("line-fisher-activity");
    if (activityElement) {
      const eventsPerSecond = activityElement.querySelector(
        ".line-fisher-events-per-second",
      );
      const totalEvents = activityElement.querySelector(
        ".line-fisher-total-events",
      );
      const activityStatus = activityElement.querySelector(
        ".line-fisher-activity-status",
      );
      if (eventsPerSecond) eventsPerSecond.textContent = "0.00";
      if (totalEvents) totalEvents.textContent = "0";
      if (activityStatus) {
        activityStatus.textContent = "Crashed";
        activityStatus.className = "line-fisher-activity-status crashed";
      }
    }
    log("Line Fisher recovered from crash successfully");
  } catch (error) {
    log(`Error recovering Line Fisher from crash: ${error}`);
    showToast("Failed to recover from crash", "#f44336", 4000);
  }
};
// ============================================================================
// LINE FISHER ERROR HANDLING IMPROVEMENTS
// ============================================================================
/**
 * Enhanced error handling for Line Fisher operations
 * Better error messages, graceful failure recovery, and user-friendly notifications
 */
export const handleLineFisherError = (error, context) => {
  log(`Line Fisher error in ${context}: ${error.message}`);
  // Categorize errors for better user feedback
  const errorCategories = {
    Configuration: [
      "Invalid move format",
      "Invalid depth",
      "Invalid threads",
      "Configuration mismatch",
    ],
    Analysis: ["Analysis failed", "Stockfish error", "Memory error", "Timeout"],
    State: [
      "Import failed",
      "Export failed",
      "State corrupted",
      "Version mismatch",
    ],
    UI: ["Element not found", "Update failed", "Display error"],
  };
  let category = "General";
  for (const [cat, patterns] of Object.entries(errorCategories)) {
    if (patterns.some((pattern) => error.message.includes(pattern))) {
      category = cat;
      break;
    }
  }
  // Show appropriate error message based on category
  const errorMessages = {
    Configuration: "Please check your configuration settings and try again.",
    Analysis:
      "Analysis encountered an error. You can try continuing or resetting.",
    State: "There was an issue with saving or loading your analysis state.",
    UI: "There was a display issue. Please refresh the page and try again.",
    General: "An unexpected error occurred. Please try again.",
  };
  const userMessage = errorMessages[category] || errorMessages.General;
  // Show user-friendly notification
  showToast(`${category} Error: ${userMessage}`, "#f44336", 5000);
  // Update status to show error
  const statusElement = document.getElementById("line-fisher-status");
  if (statusElement) {
    statusElement.textContent = `Error: ${category.toLowerCase()}`;
    statusElement.className = "line-fisher-status error";
  }
  // Log detailed error for debugging
  console.error(`Line Fisher ${context} error:`, error);
};
/**
 * Graceful recovery from Line Fisher errors
 */
export const recoverFromLineFisherError = async () => {
  log("Attempting to recover from Line Fisher error");
  try {
    // Get current state
    const state = getLineFisherState();
    // Reset analysis state but preserve results if possible
    state.isAnalyzing = false;
    state.isComplete = false;
    updateLineFisherState(state);
    // Clear UI error state
    const configElement = document.getElementById("line-fisher-config");
    if (configElement) {
      configElement.classList.remove(
        "line-fisher-analyzing",
        "line-fisher-error",
      );
    }
    // Update button states
    updateLineFisherButtonStates();
    // Update status
    const statusElement = document.getElementById("line-fisher-status");
    if (statusElement) {
      statusElement.textContent = "Recovered from error";
      statusElement.className = "line-fisher-status recovered";
    }
    // Show recovery notification
    showToast(
      "Recovered from error. You can continue or reset.",
      "#FF9800",
      4000,
    );
    log("Line Fisher error recovery completed");
  } catch (recoveryError) {
    log(`Error during recovery: ${recoveryError}`);
    showToast("Failed to recover. Please refresh the page.", "#f44336", 5000);
  }
};
/**
 * Validate Line Fisher state before operations
 */
export const validateLineFisherState = (state) => {
  const errors = [];
  // Check required properties
  if (!state.config) errors.push("Missing configuration");
  if (!state.progress) errors.push("Missing progress data");
  if (!state.results) errors.push("Missing results array");
  if (!state.analyzedPositions) errors.push("Missing analyzed positions");
  // Check configuration validity
  if (state.config) {
    if (!Array.isArray(state.config.initiatorMoves))
      errors.push("Invalid initiator moves");
    if (!Array.isArray(state.config.responderMoveCounts))
      errors.push("Invalid responder counts");
    if (typeof state.config.maxDepth !== "number") errors.push("Invalid depth");
    if (typeof state.config.threads !== "number")
      errors.push("Invalid threads");
  }
  // Check progress validity
  if (state.progress) {
    if (typeof state.progress.totalNodes !== "number")
      errors.push("Invalid total nodes");
    if (typeof state.progress.processedNodes !== "number")
      errors.push("Invalid processed nodes");
    if (state.progress.processedNodes > state.progress.totalNodes)
      errors.push("Processed nodes exceed total");
  }
  return {
    isValid: errors.length === 0,
    errors,
  };
};
//# sourceMappingURL=line-fisher-manager.js.map
