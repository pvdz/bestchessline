import { log } from "../../utils/logging.js";
import {
  getInputElement,
  getElementByIdOrThrow,
} from "../../utils/dom-helpers.js";
import { getFEN } from "../../utils/chess-board.js";
// ============================================================================
// LINE FISHER UI UTILITY FUNCTIONS
// ============================================================================
/**
 * Get Line Fisher initiator moves from UI
 * Parse space-separated moves from text input, validate each move is a valid chess move,
 * handle empty input with default values, and return array of move strings
 */
export const getLineFisherInitiatorMoves = () => {
  const initiatorMovesInput = getInputElement("line-fisher-initiator-moves");
  if (!initiatorMovesInput) return [];
  const movesText = initiatorMovesInput.value.trim();
  if (!movesText) {
    // Clear error styling for empty input
    initiatorMovesInput.classList.remove("error");
    return [];
  }
  // Parse space-separated moves
  const moves = movesText.split(/\s+/).filter((move) => move.length > 0);
  // Validate each move is a valid chess move
  const validMoves = [];
  let hasInvalidMoves = false;
  for (const move of moves) {
    try {
      // Basic validation - check if move is in algebraic notation
      if (
        /^[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](=[QRBN])?[+#]?$/.test(move) ||
        /^[a-h]x[a-h][1-8](=[QRBN])?[+#]?$/.test(move) ||
        /^[a-h][1-8](=[QRBN])?[+#]?$/.test(move) ||
        /^O-O(-O)?[+#]?$/.test(move)
      ) {
        validMoves.push(move);
      } else {
        log(`Invalid move format: ${move}`);
        hasInvalidMoves = true;
      }
    } catch (error) {
      log(`Error validating move ${move}: ${error}`);
      hasInvalidMoves = true;
    }
  }
  // Apply error styling if there are invalid moves
  if (hasInvalidMoves) {
    initiatorMovesInput.classList.add("error");
  } else {
    initiatorMovesInput.classList.remove("error");
  }
  return validMoves.length > 0 ? validMoves : [];
};
/**
 * Get Line Fisher responder move counts from UI
 * Parse space-separated numbers from text input, validate each number is positive integer,
 * handle empty input with default values, and return array of integers
 */
export const getLineFisherResponderMoveCounts = () => {
  const responderCountsInput = getInputElement("line-fisher-responder-counts");
  if (!responderCountsInput) return [];
  const countsText = responderCountsInput.value.trim();
  if (!countsText) {
    // Clear error styling for empty input
    responderCountsInput.classList.remove("error");
    return [];
  }
  // Parse space-separated numbers
  const counts = countsText
    .split(/\s+/)
    .map((count) => parseInt(count, 10))
    .filter((count) => !isNaN(count) && count > 0);
  // Apply error styling if there are invalid counts
  if (counts.length === 0 || counts.some((count) => count <= 0)) {
    responderCountsInput.classList.add("error");
  } else {
    responderCountsInput.classList.remove("error");
  }
  return counts;
};
/**
 * Get Line Fisher depth from UI
 * TODO: Read depth from slider input
 */
export const getLineFisherDepth = () => {
  const depthInput = getInputElement("line-fisher-depth");
  if (!depthInput) return 2; // Increased default to allow for more analysis
  const depth = parseInt(depthInput.value, 10);
  return isNaN(depth) ? 2 : Math.max(1, Math.min(15, depth)); // Increased default
};
/**
 * Get Line Fisher threads from UI
 * TODO: Read threads from slider input
 */
export const getLineFisherThreads = () => {
  const threadsInput = getInputElement("line-fisher-threads");
  if (!threadsInput) return 10;
  const threads = parseInt(threadsInput.value, 10);
  return isNaN(threads) ? 10 : Math.max(1, Math.min(16, threads));
};
/**
 * Get Line Fisher default responder count from UI
 * Read default responder count from slider input
 */
export const getLineFisherDefaultResponderCount = () => {
  const defaultResponderInput = getInputElement(
    "line-fisher-default-responder-count",
  );
  if (!defaultResponderInput) return 3; // Default to 3
  const count = parseInt(defaultResponderInput.value, 10);
  return isNaN(count) ? 3 : Math.max(1, Math.min(15, count));
};
/**
 * Get Line Fisher configuration from UI
 * TODO: Read all configuration values from UI elements
 */
export const getLineFisherConfigFromUI = () => {
  return {
    initiatorMoves: getLineFisherInitiatorMoves(),
    responderMoveCounts: getLineFisherResponderMoveCounts(),
    maxDepth: getLineFisherDepth(),
    threads: getLineFisherThreads(),
    defaultResponderCount: getLineFisherDefaultResponderCount(),
    rootFEN: getFEN(),
  };
};
/**
 * Update Line Fisher UI from configuration
 * TODO: Update UI elements with configuration values
 */
export const updateLineFisherUIFromConfig = (config) => {
  // TODO: Update initiator moves input
  const initiatorMovesInput = getInputElement("line-fisher-initiator-moves");
  if (initiatorMovesInput) {
    initiatorMovesInput.value = config.initiatorMoves.join(" ");
  }
  // TODO: Update responder counts input
  const responderCountsInput = getInputElement("line-fisher-responder-counts");
  if (responderCountsInput) {
    responderCountsInput.value = config.responderMoveCounts.join(" ");
  }
  // TODO: Update default responder count slider
  const defaultResponderInput = getInputElement(
    "line-fisher-default-responder-count",
  );
  if (defaultResponderInput) {
    defaultResponderInput.value = config.defaultResponderCount.toString();
  }
  // TODO: Update depth slider
  const depthInput = getInputElement("line-fisher-depth");
  if (depthInput) {
    depthInput.value = config.maxDepth.toString();
  }
  // TODO: Update threads slider
  const threadsInput = getInputElement("line-fisher-threads");
  if (threadsInput) {
    threadsInput.value = config.threads.toString();
  }
};
/**
 * Initialize Line Fisher UI controls
 * Set up event listeners and initialize UI state
 */
export const initializeLineFisherUIControls = () => {
  // Add real-time validation for initiator moves input
  const initiatorMovesInput = getInputElement("line-fisher-initiator-moves");
  if (initiatorMovesInput) {
    initiatorMovesInput.addEventListener("input", () => {
      // Trigger validation on input change
      getLineFisherInitiatorMoves();
    });
  }
  // Add real-time validation for responder counts input
  const responderCountsInput = getInputElement("line-fisher-responder-counts");
  if (responderCountsInput) {
    responderCountsInput.addEventListener("input", () => {
      // Trigger validation on input change
      getLineFisherResponderMoveCounts();
    });
  }
};
/**
 * Update Line Fisher slider value displays
 * TODO: Update slider value labels
 */
export const updateLineFisherSliderValues = () => {
  // TODO: Update depth slider value display
  const depthInput = getInputElement("line-fisher-depth");
  const depthValue = getElementByIdOrThrow("line-fisher-depth-value");
  if (depthInput && depthValue) {
    depthValue.textContent = depthInput.value;
  }
  // TODO: Update default responder count slider value display
  const defaultResponderInput = getInputElement(
    "line-fisher-default-responder-count",
  );
  const defaultResponderValue = getElementByIdOrThrow(
    "line-fisher-default-responder-count-value",
  );
  if (defaultResponderInput && defaultResponderValue) {
    defaultResponderValue.textContent = defaultResponderInput.value;
  }
  // TODO: Update threads slider value display
  const threadsInput = getInputElement("line-fisher-threads");
  const threadsValue = getElementByIdOrThrow("line-fisher-threads-value");
  if (threadsInput && threadsValue) {
    threadsValue.textContent = threadsInput.value;
  }
};
/**
 * Validate Line Fisher configuration
 * Check initiator moves are valid chess moves, check responder counts are positive integers,
 * check depth is between 1 and 15, check threads is between 1 and 16, and return boolean and error message
 */
export const validateLineFisherConfig = (config) => {
  // Check initiator moves are valid chess moves
  if (config.initiatorMoves.length === 0) {
    return {
      isValid: false,
      errorMessage: "At least one initiator move is required",
    };
  }
  // Check responder counts are positive integers (empty is allowed if default responder count is set)
  if (
    config.responderMoveCounts.length === 0 &&
    config.defaultResponderCount <= 0
  ) {
    return {
      isValid: false,
      errorMessage:
        "At least one responder move count is required, or set a default responder count",
    };
  }
  for (const count of config.responderMoveCounts) {
    if (count <= 0 || !Number.isInteger(count)) {
      return {
        isValid: false,
        errorMessage: `Invalid responder move count: ${count}. Must be a positive integer.`,
      };
    }
  }
  // Check depth is between 1 and 15
  if (config.maxDepth < 1 || config.maxDepth > 15) {
    return {
      isValid: false,
      errorMessage: `Invalid depth: ${config.maxDepth}. Must be between 1 and 15.`,
    };
  }
  // Check threads is between 1 and 16
  if (config.threads < 1 || config.threads > 16) {
    return {
      isValid: false,
      errorMessage: `Invalid threads: ${config.threads}. Must be between 1 and 16.`,
    };
  }
  // Check that responder counts array length matches initiator moves array length (only if responder counts are provided)
  if (
    config.responderMoveCounts.length > 0 &&
    config.responderMoveCounts.length !== config.initiatorMoves.length
  ) {
    return {
      isValid: false,
      errorMessage: `Mismatch: ${config.initiatorMoves.length} initiator moves but ${config.responderMoveCounts.length} responder counts.`,
    };
  }
  return { isValid: true, errorMessage: "" };
};
/**
 * Show Line Fisher configuration error
 * Display error messages to user using toast notifications or status updates
 */
export const showLineFisherConfigError = (message) => {
  log(`Line Fisher config error: ${message}`);
  // Show error in status area
  const statusElement = getElementByIdOrThrow("line-fisher-status");
  if (statusElement) {
    statusElement.textContent = `Error: ${message}`;
    statusElement.className = "line-fisher-status error";
  }
  // Show toast notification if available
  const toastElement = getElementByIdOrThrow("toast");
  if (toastElement) {
    toastElement.textContent = message;
    toastElement.className = "toast error show";
    setTimeout(() => {
      toastElement.className = "toast error";
    }, 5000);
  }
};
// ============================================================================
// LINE FISHER TOOLTIPS AND HELP
// ============================================================================
/**
 * Show usage hints for Line Fisher
 */
export const showLineFisherUsageHints = () => {
  const hints = [
    "💡 Tip: Start with depth 2-3 for quick analysis",
    "💡 Tip: Use 4-8 threads for optimal performance",
    "💡 Tip: Leave initiator moves empty to use Stockfish's best moves",
    "💡 Tip: Export your analysis to share with others",
    "💡 Tip: Use the continue button to resume interrupted analysis",
  ];
  // Show hints in a rotating banner or help section
  const hintsElement = getElementByIdOrThrow("line-fisher-hints");
  if (hintsElement) {
    const currentHint = hints[Math.floor(Math.random() * hints.length)];
    hintsElement.innerHTML = `<div class="line-fisher-hint">${currentHint}</div>`;
  }
};
/**
 * Provide detailed error explanations
 */
export const showLineFisherErrorExplanation = (error) => {
  const errorExplanations = {
    "Invalid move format":
      "Chess moves must be in algebraic notation (e.g., 'Nf3', 'e4', 'O-O').",
    "Invalid depth":
      "Depth must be between 1 and 15. Higher depths take longer to analyze.",
    "Invalid threads":
      "Threads must be between 1 and 16. More threads use more CPU resources.",
    "Configuration mismatch":
      "The number of responder counts must match the number of initiator moves.",
    "No analysis to continue":
      "Start an analysis first before trying to continue.",
    "File import failed":
      "The file must be a valid Line Fisher state JSON file.",
    "Clipboard import failed":
      "The clipboard must contain valid Line Fisher state JSON data.",
  };
  const explanation =
    errorExplanations[error] ||
    "An unexpected error occurred. Please try again.";
  // Show explanation in a user-friendly way
  const explanationElement = getElementByIdOrThrow(
    "line-fisher-error-explanation",
  );
  if (explanationElement) {
    explanationElement.innerHTML = `
      <div class="line-fisher-error-detail">
        <strong>Error:</strong> ${error}
        <br>
        <strong>Explanation:</strong> ${explanation}
      </div>
    `;
  }
};
//# sourceMappingURL=line-fisher-ui-utils.js.map
