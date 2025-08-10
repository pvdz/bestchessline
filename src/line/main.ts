import {
  ChessMove,
  AnalysisResult,
  AnalysisMove,
  PLAYER_COLORS,
} from "./types.js";
import { setGlobalCurrentMoveIndex } from "../utils/utils.js";
import { showToast } from "../utils/ui-utils.js";
import { formatScoreWithMateIn } from "../utils/formatting-utils.js";
import { compareAnalysisMoves } from "./best/bestmove-utils.js";
import { applyMoveToFEN } from "../utils/fen-manipulation.js";
import { moveToNotation } from "../utils/notation-utils.js";
import { parseFEN } from "../utils/fen-utils.js";
import { log } from "../utils/logging.js";
import {
  getInputElement,
  getTextAreaElement,
  getCheckedRadioByName,
  getElementByIdOrThrow,
  querySelectorOrThrow,
} from "../utils/dom-helpers.js";
import {
  formatPVWithEffects,
  updateResultsPanel,
} from "./best/bestmove-pv-utils.js";
import {
  updateFENInput,
  updateControlsFromPosition,
  updatePositionFromControls,
  resetPositionEvaluation,
  initializePositionEvaluationButton,
} from "./board/position-controls.js";
import { updateNavigationButtons } from "../utils/button-utils.js";
import { updateThreadsInputForFallbackMode } from "../utils/thread-utils.js";
import { getAnalysisOptions } from "./best/bestmove-config.js";
import { updateLineFisherStatus } from "../utils/status-management.js";
import {
  addMove,
  importGame,
  previousMove,
  nextMove,
  updateMoveList,
} from "./board/game-navigation.js";
import {
  startBestmove,
  stopBestmove,
  addBestmovePVClickListeners,
  handleMakeBestmove,
} from "./best/bestmove-manager.js";
import * as Board from "../utils/chess-board.js";
import * as Stockfish from "../utils/stockfish-client.js";
import { validateMove } from "../utils/move-validator.js";
import * as LineFisher from "./fish/fish.js";
import {
  fish,
  exportFishStateToClipboard,
  copyFishStateToClipboard,
  importFishStateFromClipboard,
  stopFishAnalysis,
  resetFishAnalysis,
} from "./fish/fish.js";
import { getLineFisherConfigFromUI } from "./fish/fish-ui-utils.js";
import { hideMoveArrow } from "./board/arrow-utils.js";
import { continueFishing } from "./fish/fish.js";
import { getCurrentFishState } from "./fish/fish-state.js";

// ============================================================================
// LOGGING CONFIGURATION
// ============================================================================

// Enable logging for debugging (set to false in production)
// setLoggingEnabled(true);

// ============================================================================
// APPLICATION STATE
// ============================================================================

/**
 * Application state interface
 */
interface AppState {
  // Game state
  moves: ChessMove[];
  initialFEN: string;
  currentMoveIndex: number;

  // Analysis state
  isAnalyzing: boolean;
  currentResults: AnalysisResult | null;

  // Branching state
  branchMoves: ChessMove[];
  branchStartIndex: number;
  isInBranch: boolean;

  // Position evaluation state
  positionEvaluation: {
    score: number | null;
    isMate: boolean;
    mateIn: number | null;
    isAnalyzing: boolean;
  };
}

/**
 * Application state instance
 */
let appState: AppState = {
  moves: [],
  initialFEN: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  currentMoveIndex: -1,
  isAnalyzing: false,
  currentResults: null,
  branchMoves: [],
  branchStartIndex: -1,
  isInBranch: false,
  positionEvaluation: {
    score: null,
    isMate: false,
    mateIn: null,
    isAnalyzing: false,
  },
};

// Event tracking state for Stockfish events
const eventTrackingState = {
  totalCount: 0,
  recentCount: 0,
  recentStartTime: Date.now(),
  lastEventTime: Date.now(),
};

/**
 * Get event tracking state
 */
export const getEventTrackingState = () => ({ ...eventTrackingState });

/**
 * Update application state
 */
export const updateAppState = (updates: Partial<AppState>): void => {
  appState = { ...appState, ...updates };

  // Update global move index when it changes
  if (updates.currentMoveIndex !== undefined) {
    setGlobalCurrentMoveIndex(updates.currentMoveIndex);
  }
};

/**
 * Get current application state
 */
export const getAppState = (): AppState => ({ ...appState });

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the application
 */
export const initializeApp = async (): Promise<void> => {
  log("Initializing Best Chess Line Discovery App...");

  // Initialize board
  const boardElement = getElementByIdOrThrow("chess-board");

  Board.initializeBoard(boardElement, appState.initialFEN);

  // Initialize Stockfish
  Stockfish.initializeStockfish();

  // Set up board callbacks
  Board.setOnPositionChange(() => {
    updateFENInput();
    updateControlsFromPosition();
    // Reset position evaluation when board changes
    resetPositionEvaluation();
  });

  Board.setOnMoveMade((move) => {
    // Clear analysis arrows when a move is made on the board
    hideMoveArrow();
    addMove(move);
  });

  // Initialize event listeners
  initializeEventListeners();

  // Initialize global move index
  setGlobalCurrentMoveIndex(appState.currentMoveIndex);

  // Initialize controls from current board state
  updateControlsFromPosition();

  // Initialize position evaluation button
  initializePositionEvaluationButton();

  // Initialize Line Fisher
  await LineFisher.initializeLineFisher();

  log("Application initialized successfully");
};

// ============================================================================
// EVENT LISTENERS
// ============================================================================

/**
 * Load a FEN position and update all related state
 */
const loadFENPosition = (fen: string): void => {
  updateAppState({
    initialFEN: fen,
    moves: [],
    currentMoveIndex: -1,
  });
  Board.setPosition(fen);
  updateControlsFromPosition();
  updateMoveList();
  updateNavigationButtons();
  resetPositionEvaluation();
};

/**
 * Initialize event listeners
 */
const initializeEventListeners = (): void => {
  // Board controls
  const resetBtn = getElementByIdOrThrow("reset-board");
  const clearBtn = getElementByIdOrThrow("clear-board");
  const fenInput = getInputElement("fen-input");
  const loadFenBtn = getElementByIdOrThrow("load-fen");
  const gameNotation = getTextAreaElement("game-notation");
  const importGameBtn = getElementByIdOrThrow("import-game");

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      const initialFEN =
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
      loadFENPosition(initialFEN);
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      const emptyFEN = "8/8/8/8/8/8/8/8 w - - 0 1";
      loadFENPosition(emptyFEN);
    });
  }

  if (loadFenBtn && fenInput) {
    loadFenBtn.addEventListener("click", () => {
      const fen = fenInput.value.trim();
      if (fen) {
        loadFENPosition(fen);
      }
    });
  }

  if (importGameBtn && gameNotation) {
    importGameBtn.addEventListener("click", () => {
      const notation = gameNotation.value.trim();
      if (notation) {
        importGame(notation);
      }
    });
  }

  // Game moves navigation
  const prevMoveBtn = getElementByIdOrThrow("prev-move");
  const nextMoveBtn = getElementByIdOrThrow("next-move");
  prevMoveBtn.addEventListener("click", () => previousMove());
  nextMoveBtn.addEventListener("click", () => nextMove());

  // Load mate-in-4 position
  getElementByIdOrThrow("load-mate-in-4").addEventListener("click", () => {
    loadFENPosition("r4r1k/2p3R1/5pQ1/pp1b4/8/3P4/1q3PPP/5RK1 b - - 0 2");
  });

  getElementByIdOrThrow("load-mate-in-1-black").addEventListener(
    "click",
    () => {
      loadFENPosition("r4rbk/2p3R1/5p1Q/pp6/8/3P4/5RPP/6K1 b - - 2 4");
    },
  );

  getElementByIdOrThrow("load-mate-in-1-white").addEventListener(
    "click",
    () => {
      loadFENPosition("r4r1k/2p3Rb/5p1Q/pp6/8/3P4/5RPP/6K1 w - - 3 5");
    },
  );
  // Analysis controls
  const startBtn = getElementByIdOrThrow("start-bestmove");
  const stopBtn = getElementByIdOrThrow("stop-bestmove");

  startBtn.addEventListener("click", () => startBestmove());
  stopBtn.addEventListener("click", () => stopBestmove());

  // Line Fisher analysis controls
  const stopLineFisherBtn = getElementByIdOrThrow("fish-stop");
  const resetLineFisherBtn = getElementByIdOrThrow("fish-reset");
  const continueLineFisherBtn = getElementByIdOrThrow("fish-continue");

  // Fish2 button - new simplified fish function
  const startFish2Btn = getElementByIdOrThrow("fish-start");
  startFish2Btn.addEventListener("click", async () => {
    console.log("Start Fish2 button clicked!");
    await runFishAnalysis();
    console.log("Finished Fish2 analysis");
  });

  stopLineFisherBtn.addEventListener("click", () => {
    console.log("USER PRESSED STOP BUTTON - trying Fish stop first");
    stopFishAnalysis();
  });

  resetLineFisherBtn.addEventListener("click", () => {
    resetFishAnalysis();
  });

  continueLineFisherBtn.addEventListener("click", async () => {
    console.log("Continue button clicked - trying Fish continue first");
    continueFishing();
  });

  // Line Fisher state management controls
  const exportLineFisherStateBtn = getElementByIdOrThrow(
    "fish-export",
  ) as HTMLButtonElement;
  const copyLineFisherStateBtn = getElementByIdOrThrow(
    "fish-copy",
  ) as HTMLButtonElement;
  const importLineFisherStateBtn = getElementByIdOrThrow(
    "fish-import",
  ) as HTMLButtonElement;

  exportLineFisherStateBtn.addEventListener("click", async () => {
    await exportFishStateToClipboard();
  });

  copyLineFisherStateBtn.addEventListener("click", async () => {
    await copyFishStateToClipboard();
  });

  importLineFisherStateBtn.addEventListener("click", async () => {
    console.log("Import button clicked - trying Fish state first");
    await importFishStateFromClipboard();
  });

  // Quick preset button: responder=2, overrides empty, depth=4
  const quickPresetBtn = document.getElementById(
    "fish-preset-quick",
  ) as HTMLButtonElement | null;
  if (quickPresetBtn) {
    quickPresetBtn.addEventListener("click", () => {
      // Set default responder to 2
      const defaultResponder = getInputElement("fish-default-responder-count");
      if (defaultResponder) {
        defaultResponder.value = "5";
        const val = getElementByIdOrThrow("fish-default-responder-count-value");
        val.textContent = "5";
      }

      // Clear responder overrides
      const overrides = getInputElement("fish-responder-counts");
      if (overrides) {
        overrides.value = "10 10";
      }

      // Set move depth to 4
      const depthInput = getInputElement("fish-depth");
      if (depthInput) {
        depthInput.value = "5";
        const depthVal = getElementByIdOrThrow("fish-depth-value");
        depthVal.textContent = "5";
      }
    });
  }

  // Line Fisher thread control
  const lineFisherThreadsInput = getElementByIdOrThrow(
    "fish-threads",
  ) as HTMLInputElement;
  const lineFisherThreadsValue = getElementByIdOrThrow("fish-threads-value");

  // Initialize with default value
  lineFisherThreadsValue.textContent = lineFisherThreadsInput.value;

  lineFisherThreadsInput.addEventListener("input", () => {
    const threads = lineFisherThreadsInput.value;
    lineFisherThreadsValue.textContent = threads;
  });

  // Line Fisher depth control
  const lineFisherDepthInput = getElementByIdOrThrow(
    "fish-depth",
  ) as HTMLInputElement;
  const lineFisherDepthValue = getElementByIdOrThrow("fish-depth-value");

  // Initialize with default value
  lineFisherDepthValue.textContent = lineFisherDepthInput.value;

  lineFisherDepthInput.addEventListener("input", () => {
    const depth = lineFisherDepthInput.value;
    lineFisherDepthValue.textContent = depth;
  });

  // Line Fisher default responder count control
  const lineFisherDefaultResponderInput = getElementByIdOrThrow(
    "fish-default-responder-count",
  ) as HTMLInputElement;
  const lineFisherDefaultResponderValue = getElementByIdOrThrow(
    "fish-default-responder-count-value",
  );

  // Initialize with default value
  lineFisherDefaultResponderValue.textContent =
    lineFisherDefaultResponderInput.value;

  lineFisherDefaultResponderInput.addEventListener("input", () => {
    const count = lineFisherDefaultResponderInput.value;
    lineFisherDefaultResponderValue.textContent = count;
  });

  // Removed: target depth control (not used)

  // Live lines preview toggle
  const fishLinesToggle = document.getElementById(
    "fish-lines-toggle",
  ) as HTMLInputElement | null;
  const fishLinesPanel = document.getElementById("fish-lines-panel");
  if (fishLinesToggle && fishLinesPanel) {
    fishLinesToggle.addEventListener("change", () => {
      if (fishLinesToggle.checked) {
        fishLinesPanel.style.display = "block";
      }
      // When disabled, leave panel visible but stop updates (handled in updateLiveLinesPreview)
    });
  }

  // Note: Global Stockfish UI updates were removed.

  // Handle Stockfish crash events
  window.addEventListener("stockfish-crash", (() => {
    log("Stockfish crash event received, resetting UI state...");

    // Reset analysis state
    updateAppState({
      isAnalyzing: false,
      currentResults: null,
    });

    // Update position evaluation button
    const evalBtn = getElementByIdOrThrow("position-evaluation-btn");
    evalBtn.textContent = "??";
    evalBtn.className = "evaluation-button";

    // Show recovery button
    const recoveryBtn = getElementByIdOrThrow("recover-from-crash");
    recoveryBtn.style.display = "inline-block";
  }) as EventListener);

  // Position controls
  initializePositionControls();

  // Analysis format controls
  const notationRadios = document.querySelectorAll(
    'input[name="notation-format"]',
  );
  const pieceRadios = document.querySelectorAll('input[name="piece-format"]');

  notationRadios.forEach((radio: Element) => {
    radio.addEventListener("change", () => {
      updateMoveList();
      updateResultsPanel(appState.currentResults?.moves || []);
    });
  });

  pieceRadios.forEach((radio: Element) => {
    radio.addEventListener("change", () => {
      updateMoveList();
      updateResultsPanel(appState.currentResults?.moves || []);
    });
  });

  // Analysis configuration controls
  const whiteMovesInput = getInputElement("white-moves");
  const responderMovesInput = getInputElement("responder-moves");
  const maxDepthInput = getInputElement("max-depth");
  const threadsInput = getInputElement("threads");

  [whiteMovesInput, responderMovesInput, maxDepthInput, threadsInput].forEach(
    (input: HTMLInputElement | null) => {
      if (input) {
        input.addEventListener("change", () => {
          // Update results panel to reflect new configuration
          if (appState.currentResults?.moves) {
            updateResultsPanel(appState.currentResults.moves);
          }
        });
      }
    },
  );

  // Update threads input based on fallback mode
  updateThreadsInputForFallbackMode();

  // Debug Continue button wiring for Stockfish pause gate
  const sfDebugBtn = document.getElementById(
    "sf-debug-continue",
  ) as HTMLButtonElement | null;
  if (sfDebugBtn) {
    sfDebugBtn.addEventListener("click", () => {
      (window as any).__SF_DEBUG_CONTINUE__ = true;
    });
  }
};

/**
 * Initialize position controls
 */
const initializePositionControls = (): void => {
  // Current player controls
  const playerRadios = document.querySelectorAll(
    'input[name="current-player"]',
  );
  playerRadios.forEach((radio: Element) => {
    radio.addEventListener("change", updatePositionFromControls);
  });

  // Castling controls
  const castlingCheckboxes = document.querySelectorAll(
    'input[type="checkbox"]',
  );
  castlingCheckboxes.forEach((checkbox: Element) => {
    checkbox.addEventListener("change", updatePositionFromControls);
  });

  // En passant control
  const enPassantInput = getInputElement("en-passant");
  if (enPassantInput) {
    enPassantInput.addEventListener("input", updatePositionFromControls);
  }
};

// ============================================================================
// ANALYSIS FUNCTIONS
// ============================================================================

// ============================================================================
// TREE DIGGER ANALYSIS FUNCTIONS
// ============================================================================

// ============================================================================
// RESULTS MANAGEMENT
// ============================================================================

export const actuallyUpdateResultsPanel = (moves: AnalysisMove[]): void => {
  const resultsPanel = getElementByIdOrThrow("bestmove-results");

  // Clear existing arrows
  hideMoveArrow();

  // Get current format settings
  const notationFormat =
    getCheckedRadioByName("notation-format")?.value || "algebraic-short";
  const pieceFormat = getCheckedRadioByName("piece-format")?.value || "symbols";

  // Convert format values to match moveToNotation parameters
  const notationType = notationFormat === "algebraic-short" ? "short" : "long";
  const pieceType = pieceFormat === "symbols" ? "unicode" : "english";

  // Filter moves based on analysis criteria
  const appState = getAppState();
  const isAnalyzing = appState.isAnalyzing;

  // First, separate mate lines from non-mate lines
  const mateLines = moves.filter(
    (move: AnalysisMove) => Math.abs(move.score) >= 10000,
  );
  const nonMateLines = moves.filter(
    (move: AnalysisMove) => Math.abs(move.score) < 10000,
  );

  // Sort mate lines using the updated comparison function that considers mateIn
  const currentFEN = Board.getFEN();
  const position = currentFEN ? parseFEN(currentFEN) : null;
  const direction =
    position && position.turn === PLAYER_COLORS.BLACK ? "asc" : "desc";

  mateLines.sort((a, b) => compareAnalysisMoves(a, b, direction));

  // Sort non-mate lines by depth (descending), then by score (descending), then by multipv
  nonMateLines.sort((a, b) => {
    // For score comparison, use shared logic
    const scoreComparison = compareAnalysisMoves(a, b, direction);
    if (scoreComparison !== 0) return scoreComparison;
    return (a.multipv || 1) - (b.multipv || 1);
  });

  // Get the configured number of lines from UI
  const analysisOptions = getAnalysisOptions();
  const maxLines = analysisOptions.multiPV;
  const filteredMoves: AnalysisMove[] = [];

  // Add all mate lines first (up to maxLines)
  filteredMoves.push(...mateLines.slice(0, maxLines));

  // If we have fewer than maxLines, add the best non-mate lines
  if (filteredMoves.length < maxLines) {
    const remainingSlots = maxLines - filteredMoves.length;
    filteredMoves.push(...nonMateLines.slice(0, remainingSlots));
  }

  // Add analysis status indicator to the results section (after controls, before results panel)
  const resultsSection = querySelectorOrThrow(document, ".results-section");
  if (resultsSection) {
    // Remove any existing status indicator
    const existingStatus = resultsSection.querySelector(".bestmove-status");
    if (existingStatus) {
      existingStatus.remove();
    }

    // Create new status indicator
    const statusIndicator = document.createElement("div");
    statusIndicator.className = "bestmove-status";

    // Calculate lowest depth of visible non-mating moves, or mating moves if that's all we have
    const visibleNonMatingMoves = filteredMoves.filter(
      (move: AnalysisMove) => Math.abs(move.score) < 10000,
    );
    const visibleMatingMoves = filteredMoves.filter(
      (move: AnalysisMove) => Math.abs(move.score) >= 10000,
    );

    let lowestDepth = 0;
    if (visibleNonMatingMoves.length > 0) {
      lowestDepth = Math.min(
        ...visibleNonMatingMoves.map((move: AnalysisMove) => move.depth),
      );
    } else if (visibleMatingMoves.length > 0) {
      lowestDepth = Math.max(
        ...visibleMatingMoves.map((move: AnalysisMove) => move.mateIn),
      );
    }

    // Check if we're in fallback mode
    const isFallback = Stockfish.isFallbackMode();

    const statusText = isAnalyzing
      ? `🔄 Analyzing... (min depth: ${lowestDepth})`
      : `✅ Analysis complete (depth: ${lowestDepth})`;

    const fallbackIndicator = isFallback
      ? ' <span class="fallback-indicator" title="Single-threaded mode">🔧</span>'
      : "";

    statusIndicator.innerHTML = `
      <div class="status-text">${statusText}${fallbackIndicator}</div>
    `;

    // Insert after the status div but before the results-panel
    const statusDiv = resultsSection.querySelector(".status");
    const resultsPanel = getElementByIdOrThrow("bestmove-results");

    if (statusDiv && resultsPanel) {
      resultsSection.insertBefore(statusIndicator, resultsPanel);
    }
  }

  resultsPanel.innerHTML = "";

  filteredMoves.forEach((move: AnalysisMove, index: number) => {
    // Determine move effects if not already present
    if (!move.move.effect) {
      const position = parseFEN(Board.getFEN());
      const validationResult = validateMove(position, move.move);
      if (validationResult.isValid) {
        move.move.effect = validationResult.effect;
      }
    }

    const moveItem = document.createElement("div");
    moveItem.className = "move-item";
    moveItem.dataset.moveFrom = move.move.from;
    moveItem.dataset.moveTo = move.move.to;
    moveItem.dataset.movePiece = move.move.piece;

    const rank = index + 1;
    const notation = moveToNotation(
      move.move,
      notationType,
      pieceType,
      Board.getFEN(),
    );
    const score = formatScoreWithMateIn(move.score, move.mateIn);
    const pv = formatPVWithEffects(
      move.pv,
      Board.getFEN(),
      notationType,
      pieceType,
    );

    // Create JSON representation of the move for the tooltip (trimmed to first move only)
    const trimmedMove = {
      ...move,
      pv: move.pv.length > 0 ? [move.pv[0], `(... ${move.pv.length}x)`] : [],
    };
    const moveJson = JSON.stringify(trimmedMove, null, 2)
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    moveItem.innerHTML = `
      <div class="move-header clickable" title="Click to apply this move and add it to the move list. It will just append it to the game without verificaton.">
        <span class="move-rank">${rank}</span>
        <span class="move-notation">${notation}</span>
        <div class="move-info" title="Analysis information">
          <span class="depth-info" title="Analysis depth">d${move.depth}</span>
          <span class="nodes-info" title="Nodes searched">${move.nodes.toLocaleString()}</span>
          <span class="time-info" title="Analysis time">${move.time}ms</span>
        </div>
        <span class="move-score" title="Move evaluation">${score}</span>
        <div class="move-help-bulb" title="${moveJson}">?</div>
      </div>
      <div class="move-details">
        <div class="move-pv" title="Principal variation">${pv}</div>
      </div>
    `;

    moveItem.querySelector(".move-header")?.addEventListener("click", () => {
      handleMakeBestmove(move);
    });

    resultsPanel.appendChild(moveItem);
  });

  // Add arrows for each displayed bestmove result
  filteredMoves.forEach((move: AnalysisMove, index: number) => {
    if (move.move.from && move.move.to && move.move.piece) {
      // Create a unique arrow ID for this specific analysis result
      const arrowId = `analysis-${index}-${move.move.from}-${move.move.to}`;

      Board.showMoveArrow(
        move.move.from,
        move.move.to,
        move.move.piece,
        move.score,
        filteredMoves,
        index,
        arrowId, // Pass the unique arrow ID
        move.mateIn, // Pass the mateIn value
      );
    }
  });

  addBestmovePVClickListeners();
};

// ============================================================================
// MOVE HOVER EVENTS
// ============================================================================

/**
 * Create a branch from the current position
 */
export const createBranch = (
  branchMoves: ChessMove[],
  originalPosition: string,
): void => {
  console.log("createBranch called with:", { branchMoves, originalPosition });

  const appState = getAppState();

  // Find the move index that corresponds to the original position
  let branchStartIndex = -1;

  // Apply moves from initial position to find where we branched from
  let currentFEN = appState.initialFEN;
  for (let i = 0; i < appState.moves.length; i++) {
    if (currentFEN === originalPosition) {
      branchStartIndex = i - 1; // The move before this position
      break;
    }
    currentFEN = applyMoveToFEN(currentFEN, appState.moves[i]);
  }

  // If we didn't find it, use the current move index
  if (branchStartIndex === -1) {
    branchStartIndex = appState.currentMoveIndex;
  }

  console.log("createBranch updating state with:", {
    branchMoves,
    branchStartIndex,
    isInBranch: true,
  });

  updateAppState({
    branchMoves,
    branchStartIndex,
    isInBranch: true,
  });
  updateMoveList();

  console.log("createBranch completed, new appState:", getAppState());
};

/**
 * Clear the current branch
 */
export const clearBranch = (): void => {
  console.log("clearBranch called - clearing branch state");
  updateAppState({
    branchMoves: [],
    branchStartIndex: -1,
    isInBranch: false,
  });
  updateMoveList();

  // Evaluate the current position after clearing branch
  resetPositionEvaluation();
};

/**
 * Run Fish2 analysis using the new simplified fish function
 */
async function runFishAnalysis(): Promise<void> {
  try {
    // Get configuration from UI
    const config = getLineFisherConfigFromUI();

    console.log("Starting Fish2 analysis with config:", config);
    showToast("Starting Fish2 analysis...", "#007bff", 2000);

    // Run the fish analysis
    await fish(config);
    const state = getCurrentFishState();

    console.log("Fish2 analysis complete.");
    if (state.done.length < 100) {
      console.log(state);
    }

    // Display results in a simple format
    let resultText = `Fish2 Analysis Complete!\n\nFound ${state.done.length} lines:\n\n`;

    if (state.done.length < 100) {
      state.done.forEach((line, index) => {
        const moves = line.pcns.join(", ");
        const score = line.score.toFixed(2);
        resultText += `Line ${index + 1}: Moves [${moves}], Score [${score}]\n`;
      });
    }

    // Show results in a toast and log
    showToast(
      `Fish2 complete: ${state.done.length} lines found`,
      "#28a745",
      5000,
    );
    console.log(resultText);
  } catch (error) {
    console.error("Error in Fish2 analysis:", error);
    showToast(
      `Fish2 error: ${error instanceof Error ? error.message : String(error)}`,
      "#dc3545",
      5000,
    );
  }
}
