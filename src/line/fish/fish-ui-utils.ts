import type { LineFisherConfig } from "./types.js";
import { log } from "../../utils/logging.js";
import {
  getInputElement,
  getElementByIdOrThrow,
} from "../../utils/dom-helpers.js";
import { getFEN } from "../../utils/chess-board.js";
import { getStartingPlayer } from "../../utils/utils.js";
import { PLAYER_COLORS } from "../types.js";

// ============================================================================
// LINE FISHER UI UTILITY FUNCTIONS
// ============================================================================

/**
 * Get Line Fisher initiator moves from UI
 * Parse space-separated moves from text input, validate each move is a valid chess move,
 * handle empty input with default values, and return array of move strings
 */
export const getLineFisherInitiatorMoves = (): string[] => {
  const initiatorMovesInput = getInputElement("fish-initiator-moves");
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
  const validMoves: string[] = [];

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
export const getLineFisherResponderMoveCounts = (): number[] => {
  const responderCountsInput = getInputElement("fish-responder-counts");
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
export const getLineFisherDepth = (): number => {
  const depthInput = getInputElement("fish-depth");
  if (!depthInput) return 2; // Increased default to allow for more analysis

  const depth = parseInt(depthInput.value, 10);
  return isNaN(depth) ? 2 : Math.max(1, Math.min(15, depth)); // Increased default
};

/**
 * Get Line Fisher threads from UI
 * TODO: Read threads from slider input
 */
export const getLineFisherThreads = (): number => {
  const threadsInput = getInputElement("fish-threads");
  if (!threadsInput) return 10;

  const threads = parseInt(threadsInput.value, 10);
  return isNaN(threads) ? 10 : Math.max(1, Math.min(16, threads));
};

/**
 * Get Line Fisher default responder count from UI
 * Read default responder count from slider input
 */
export const getLineFisherDefaultResponderCount = (): number => {
  const defaultResponderInput = getInputElement("fish-default-responder-count");
  if (!defaultResponderInput) return 3; // Default to 3

  const count = parseInt(defaultResponderInput.value, 10);
  return isNaN(count) ? 3 : Math.max(1, Math.min(15, count));
};

/**
 * Get Line Fisher target depth from UI
 * Read target depth from slider input
 */
export const getLineFisherTargetDepth = (): number => {
  const targetDepthInput = getInputElement("fish-target-depth");
  if (!targetDepthInput) return 10; // Default to 10

  const depth = parseInt(targetDepthInput.value, 10);
  return isNaN(depth) ? 10 : Math.max(1, Math.min(20, depth));
};

/**
 * Get Line Fisher configuration from UI
 * TODO: Read all configuration values from UI elements
 */
export const getLineFisherConfigFromUI = (): LineFisherConfig => {
  return {
    initiatorMoves: getLineFisherInitiatorMoves(),
    responderMoveCounts: getLineFisherResponderMoveCounts(),
    maxDepth: getLineFisherDepth(),
    threads: getLineFisherThreads(),
    defaultResponderCount: getLineFisherDefaultResponderCount(),
    targetDepth: getLineFisherTargetDepth(),
    rootFEN: getFEN(),
    initiatorIsWhite: getStartingPlayer(getFEN()) === PLAYER_COLORS.WHITE,
    baselineScore: 0,
    baselineMoves: [],
  };
};

/**
 * Update Line Fisher UI from configuration
 * TODO: Update UI elements with configuration values
 */
export const updateLineFisherUIFromConfig = (
  config: LineFisherConfig,
): void => {
  // TODO: Update initiator moves input
  const initiatorMovesInput = getInputElement("fish-initiator-moves");
  if (initiatorMovesInput) {
    initiatorMovesInput.value = config.initiatorMoves.join(" ");
  }

  // TODO: Update responder counts input
  const responderCountsInput = getInputElement("fish-responder-counts");
  if (responderCountsInput) {
    responderCountsInput.value = config.responderMoveCounts.join(" ");
  }

  // TODO: Update default responder count slider
  const defaultResponderInput = getInputElement("fish-default-responder-count");
  if (defaultResponderInput) {
    defaultResponderInput.value = config.defaultResponderCount.toString();
  }

  // TODO: Update depth slider
  const depthInput = getInputElement("fish-depth");
  if (depthInput) {
    depthInput.value = config.maxDepth.toString();
  }

  // TODO: Update threads slider
  const threadsInput = getInputElement("fish-threads");
  if (threadsInput) {
    threadsInput.value = config.threads.toString();
  }
};

/**
 * Initialize Line Fisher UI controls
 * Set up event listeners and initialize UI state
 */
export const initializeLineFisherUIControls = (): void => {
  // Add real-time validation for initiator moves input
  const initiatorMovesInput = getInputElement("fish-initiator-moves");
  if (initiatorMovesInput) {
    initiatorMovesInput.addEventListener("input", () => {
      // Trigger validation on input change
      getLineFisherInitiatorMoves();
    });
  }

  // Add real-time validation for responder counts input
  const responderCountsInput = getInputElement("fish-responder-counts");
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
export const updateLineFisherSliderValues = (): void => {
  // TODO: Update depth slider value display
  const depthInput = getInputElement("fish-depth");
  const depthValue = getElementByIdOrThrow("fish-depth-value");
  if (depthInput && depthValue) {
    depthValue.textContent = depthInput.value;
  }

  // TODO: Update default responder count slider value display
  const defaultResponderInput = getInputElement("fish-default-responder-count");
  const defaultResponderValue = getElementByIdOrThrow(
    "fish-default-responder-count-value",
  );
  if (defaultResponderInput && defaultResponderValue) {
    defaultResponderValue.textContent = defaultResponderInput.value;
  }

  // TODO: Update threads slider value display
  const threadsInput = getInputElement("fish-threads");
  const threadsValue = getElementByIdOrThrow("fish-threads-value");
  if (threadsInput && threadsValue) {
    threadsValue.textContent = threadsInput.value;
  }
};

/**
 * Validate Line Fisher configuration
 * Check initiator moves are valid chess moves, check responder counts are positive integers,
 * check depth is between 1 and 15, check threads is between 1 and 16, and return boolean and error message
 */
export const validateLineFisherConfig = (
  config: LineFisherConfig,
): { isValid: boolean; errorMessage: string } => {
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
