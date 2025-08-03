import type { LineFisherConfig } from "../line_fisher.js";
import { log } from "./logging.js";
import { showToast } from "./ui-utils.js";
import { getInputElement } from "./dom-helpers.js";

// ============================================================================
// LINE FISHER UI UTILITY FUNCTIONS
// ============================================================================

/**
 * Get Line Fisher initiator moves from UI
 * Parse space-separated moves from text input, validate each move is a valid chess move,
 * handle empty input with default values, and return array of move strings
 */
export const getLineFisherInitiatorMoves = (): string[] => {
  const initiatorMovesInput = getInputElement("line-fisher-initiator-moves");
  if (!initiatorMovesInput) return ["Nf3", "g3"];

  const movesText = initiatorMovesInput.value.trim();
  if (!movesText) {
    // Clear error styling for empty input
    initiatorMovesInput.classList.remove("error");
    return ["Nf3", "g3"];
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

  return validMoves.length > 0 ? validMoves : ["Nf3", "g3"];
};

/**
 * Get Line Fisher responder move counts from UI
 * Parse space-separated numbers from text input, validate each number is positive integer,
 * handle empty input with default values, and return array of integers
 */
export const getLineFisherResponderMoveCounts = (): number[] => {
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
export const getLineFisherDepth = (): number => {
  const depthInput = getInputElement("line-fisher-depth");
  if (!depthInput) return 2; // Increased default to allow for more analysis

  const depth = parseInt(depthInput.value, 10);
  return isNaN(depth) ? 2 : Math.max(1, Math.min(15, depth)); // Increased default
};

/**
 * Get Line Fisher threads from UI
 * TODO: Read threads from slider input
 */
export const getLineFisherThreads = (): number => {
  const threadsInput = getInputElement("line-fisher-threads");
  if (!threadsInput) return 10;

  const threads = parseInt(threadsInput.value, 10);
  return isNaN(threads) ? 10 : Math.max(1, Math.min(16, threads));
};

/**
 * Get Line Fisher default responder count from UI
 * Read default responder count from slider input
 */
export const getLineFisherDefaultResponderCount = (): number => {
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
export const getLineFisherConfigFromUI = (): LineFisherConfig => {
  return {
    initiatorMoves: getLineFisherInitiatorMoves(),
    responderMoveCounts: getLineFisherResponderMoveCounts(),
    maxDepth: getLineFisherDepth(),
    threads: getLineFisherThreads(),
    defaultResponderCount: getLineFisherDefaultResponderCount(),
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
export const initializeLineFisherUIControls = (): void => {
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
export const updateLineFisherSliderValues = (): void => {
  // TODO: Update depth slider value display
  const depthInput = getInputElement("line-fisher-depth");
  const depthValue = document.getElementById("line-fisher-depth-value");
  if (depthInput && depthValue) {
    depthValue.textContent = depthInput.value;
  }

  // TODO: Update default responder count slider value display
  const defaultResponderInput = getInputElement(
    "line-fisher-default-responder-count",
  );
  const defaultResponderValue = document.getElementById(
    "line-fisher-default-responder-count-value",
  );
  if (defaultResponderInput && defaultResponderValue) {
    defaultResponderValue.textContent = defaultResponderInput.value;
  }

  // TODO: Update threads slider value display
  const threadsInput = getInputElement("line-fisher-threads");
  const threadsValue = document.getElementById("line-fisher-threads-value");
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

/**
 * Show Line Fisher configuration error
 * Display error messages to user using toast notifications or status updates
 */
export const showLineFisherConfigError = (message: string): void => {
  log(`Line Fisher config error: ${message}`);

  // Show error in status area
  const statusElement = document.getElementById("line-fisher-status");
  if (statusElement) {
    statusElement.textContent = `Error: ${message}`;
    statusElement.className = "line-fisher-status error";
  }

  // Show toast notification if available
  const toastElement = document.getElementById("toast");
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
 * Add helpful tooltips to Line Fisher UI elements
 * Explain configuration options, show usage hints, and provide error explanations
 */
export const addLineFisherTooltips = (): void => {
  // Add tooltips to configuration elements
  const addTooltip = (elementId: string, tooltipText: string): void => {
    const element = document.getElementById(elementId);
    if (element) {
      element.title = tooltipText;
      element.setAttribute("data-tooltip", tooltipText);
    }
  };

  // Configuration tooltips
  addTooltip(
    "line-fisher-initiator-moves",
    "Enter space-separated chess moves (e.g., 'Nf3 g3'). These moves will be played first by White. Leave empty to use Stockfish analysis.",
  );

  addTooltip(
    "line-fisher-responder-counts",
    "Enter space-separated numbers (e.g., '2 3'). These specify how many responses to analyze for each initiator move.",
  );

  addTooltip(
    "line-fisher-depth",
    "Maximum analysis depth (1-15). Higher depths explore more lines but take longer to analyze.",
  );

  addTooltip(
    "line-fisher-threads",
    "Number of CPU threads to use (1-16). More threads can speed up analysis but use more resources.",
  );

  // Button tooltips
  addTooltip(
    "start-line-fisher",
    "Start Line Fisher analysis with current configuration. This will explore multiple lines to the specified depth.",
  );

  addTooltip(
    "stop-line-fisher",
    "Stop the current analysis. Partial results will be preserved and can be continued later.",
  );

  addTooltip(
    "reset-line-fisher",
    "Clear all analysis results and reset to initial state. This cannot be undone.",
  );

  addTooltip(
    "continue-line-fisher",
    "Continue analysis from where it left off. Only available if there are partial results.",
  );

  // State management tooltips
  addTooltip(
    "copy-line-fisher-state",
    "Copy current analysis state to clipboard. Can be pasted into another session.",
  );

  addTooltip(
    "export-line-fisher-state",
    "Export current analysis state to a JSON file. Useful for sharing or backup.",
  );

  addTooltip(
    "import-line-fisher-state",
    "Import analysis state from a JSON file. This will replace current state.",
  );

  addTooltip(
    "paste-line-fisher-state",
    "Import analysis state from clipboard. Useful for sharing between sessions.",
  );

  log("Line Fisher tooltips added successfully");
};

/**
 * Show usage hints for Line Fisher
 */
export const showLineFisherUsageHints = (): void => {
  const hints = [
    "💡 Tip: Start with depth 2-3 for quick analysis",
    "💡 Tip: Use 4-8 threads for optimal performance",
    "💡 Tip: Leave initiator moves empty to use Stockfish's best moves",
    "💡 Tip: Export your analysis to share with others",
    "💡 Tip: Use the continue button to resume interrupted analysis",
  ];

  // Show hints in a rotating banner or help section
  const hintsElement = document.getElementById("line-fisher-hints");
  if (hintsElement) {
    const currentHint = hints[Math.floor(Math.random() * hints.length)];
    hintsElement.innerHTML = `<div class="line-fisher-hint">${currentHint}</div>`;
  }
};

/**
 * Provide detailed error explanations
 */
export const showLineFisherErrorExplanation = (error: string): void => {
  const errorExplanations: Record<string, string> = {
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
  const explanationElement = document.getElementById(
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

// ============================================================================
// LINE FISHER KEYBOARD SHORTCUTS
// ============================================================================

/**
 * Add keyboard shortcuts for Line Fisher operations
 * Start/stop analysis, reset analysis, and copy results
 */
export const addLineFisherKeyboardShortcuts = (): void => {
  const shortcuts: Map<string, () => void> = new Map<string, () => void>();

  // Define shortcuts
  shortcuts.set("Ctrl+Shift+L", () => {
    // Start Line Fisher analysis
    const startBtn = document.getElementById(
      "start-line-fisher",
    ) as HTMLButtonElement;
    if (startBtn && !startBtn.disabled) {
      startBtn.click();
    }
  });

  shortcuts.set("Ctrl+Shift+S", () => {
    // Stop Line Fisher analysis
    const stopBtn = document.getElementById(
      "stop-line-fisher",
    ) as HTMLButtonElement;
    if (stopBtn && !stopBtn.disabled) {
      stopBtn.click();
    }
  });

  shortcuts.set("Ctrl+Shift+R", () => {
    // Reset Line Fisher analysis
    const resetBtn = document.getElementById(
      "reset-line-fisher",
    ) as HTMLButtonElement;
    if (resetBtn && !resetBtn.disabled) {
      resetBtn.click();
    }
  });

  shortcuts.set("Ctrl+Shift+C", () => {
    // Copy Line Fisher state
    const copyBtn = document.getElementById(
      "copy-line-fisher-state",
    ) as HTMLButtonElement;
    if (copyBtn && !copyBtn.disabled) {
      copyBtn.click();
    }
  });

  shortcuts.set("Ctrl+Shift+V", () => {
    // Paste Line Fisher state
    const pasteBtn = document.getElementById(
      "paste-line-fisher-state",
    ) as HTMLButtonElement;
    if (pasteBtn && !pasteBtn.disabled) {
      pasteBtn.click();
    }
  });

  shortcuts.set("Ctrl+Shift+E", () => {
    // Export Line Fisher state
    const exportBtn = document.getElementById(
      "export-line-fisher-state",
    ) as HTMLButtonElement;
    if (exportBtn && !exportBtn.disabled) {
      exportBtn.click();
    }
  });

  shortcuts.set("Ctrl+Shift+I", () => {
    // Import Line Fisher state
    const importBtn = document.getElementById(
      "import-line-fisher-state",
    ) as HTMLButtonElement;
    if (importBtn && !importBtn.disabled) {
      importBtn.click();
    }
  });

  // Add event listener for keyboard shortcuts
  document.addEventListener("keydown", (event: KeyboardEvent) => {
    const key = [
      event.ctrlKey ? "Ctrl" : "",
      event.shiftKey ? "Shift" : "",
      event.key.toUpperCase(),
    ]
      .filter(Boolean)
      .join("+");

    const action = shortcuts.get(key);
    if (action) {
      event.preventDefault();
      action();

      // Show shortcut feedback
      showToast(`Shortcut executed: ${key}`, "#4CAF50", 1000);
    }
  });

  // Show shortcuts help
  const showShortcutsHelp = (): void => {
    const helpText = `
      <div class="line-fisher-shortcuts-help">
        <h4>Line Fisher Keyboard Shortcuts</h4>
        <ul>
          <li><strong>Ctrl+Shift+L:</strong> Start analysis</li>
          <li><strong>Ctrl+Shift+S:</strong> Stop analysis</li>
          <li><strong>Ctrl+Shift+R:</strong> Reset analysis</li>
          <li><strong>Ctrl+Shift+C:</strong> Copy state</li>
          <li><strong>Ctrl+Shift+V:</strong> Paste state</li>
          <li><strong>Ctrl+Shift+E:</strong> Export state</li>
          <li><strong>Ctrl+Shift+I:</strong> Import state</li>
        </ul>
      </div>
    `;

    const helpElement = document.getElementById("line-fisher-shortcuts-help");
    if (helpElement) {
      helpElement.innerHTML = helpText;
    }
  };

  // Add help button
  const addShortcutsHelpButton = (): void => {
    const helpBtn = document.createElement("button");
    helpBtn.textContent = "⌨️ Shortcuts";
    helpBtn.className = "line-fisher-shortcuts-help-btn";
    helpBtn.title = "Show keyboard shortcuts";
    helpBtn.onclick = showShortcutsHelp;

    const controlsElement = document.getElementById("line-fisher-controls");
    if (controlsElement) {
      controlsElement.appendChild(helpBtn);
    }
  };

  // Initialize shortcuts
  addShortcutsHelpButton();

  log("Line Fisher keyboard shortcuts added successfully");
};
