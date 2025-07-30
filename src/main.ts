import {
  ChessMove,
  AnalysisResult,
  AnalysisOptions,
  AnalysisMove,
  NotationFormat,
  PieceFormat,
  BestLineNode,
  BestLinesAnalysis,
  createPieceNotation,
  getColorFromNotation,
  PLAYER_COLORS,
} from "./types.js";
import {
  moveToNotation,
  parseFEN,
  toFEN,
  coordsToSquare,
  log,
  logError,
  getInputElement,
  getTextAreaElement,
  getButtonElement,
  getCheckedRadio,
  getCheckedRadioByName,
  querySelectorHTMLElementBySelector,
  getFENWithCorrectMoveCounter,
  setGlobalCurrentMoveIndex,
  getGlobalCurrentMoveIndex,
  applyMoveToFEN,
  findFromSquare,
  findFromSquareWithDisambiguation,
  getDepthScaler,
  getResponderMovesCount,
  getThreadCount,
  getFirstReplyOverride,
  getSecondReplyOverride,
  calculateTotalPositionsWithOverrides,
  getStartingPlayer,
  showToast,
  compareAnalysisMoves,
} from "./utils.js";
import * as Board from "./chess-board.js";
import * as Stockfish from "./stockfish-client.js";
import { validateMove, PIECES, PIECE_TYPES } from "./move-validator.js";
import * as BestLines from "./best-lines.js";

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
 * Update application state
 */
const updateAppState = (updates: Partial<AppState>): void => {
  appState = { ...appState, ...updates };

  // Update global move index when it changes
  if (updates.currentMoveIndex !== undefined) {
    setGlobalCurrentMoveIndex(updates.currentMoveIndex);
  }
};

/**
 * Get current application state
 */
const getAppState = (): AppState => ({ ...appState });

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the application
 */
const initializeApp = (): void => {
  log("Initializing Best Chess Line Discovery App...");

  // Initialize board
  const boardElement = document.getElementById("chess-board");
  if (!boardElement) {
    throw new Error("Chess board element not found");
  }

  Board.initializeBoard(boardElement, appState.initialFEN);

  // Initialize Stockfish
  Stockfish.initializeStockfish();

  // Set up board callbacks
  Board.setOnPositionChange((position) => {
    updateFENInput();
    updateControlsFromPosition();
    // Reset position evaluation when board changes
    resetPositionEvaluation();
  });

  Board.setOnMoveMade((move) => {
    // Clear analysis arrows when a move is made on the board
    Board.hideMoveArrow();
    addMove(move);
  });

  // Initialize event listeners
  initializeEventListeners();
  initializeMoveHoverEvents();

  // Initialize copy button
  initializeCopyButton();

  // Initialize global move index
  setGlobalCurrentMoveIndex(appState.currentMoveIndex);

  // Initialize controls from current board state
  updateControlsFromPosition();

  // Initialize position evaluation button
  initializePositionEvaluationButton();

  log("Application initialized successfully");
};

// ============================================================================
// POSITION EVALUATION
// ============================================================================

/**
 * Reset position evaluation to initial state
 */
const resetPositionEvaluation = (): void => {
  updateAppState({
    positionEvaluation: {
      score: null,
      isMate: false,
      mateIn: null,
      isAnalyzing: false,
    },
  });
  updatePositionEvaluationDisplay();
  updateButtonStates();
};

/**
 * Initialize position evaluation button
 */
const initializePositionEvaluationButton = (): void => {
  const evaluationButton = document.getElementById(
    "position-evaluation-btn",
  ) as HTMLButtonElement;
  if (evaluationButton) {
    evaluationButton.addEventListener("click", () => {
      evaluateCurrentPosition();
    });
  }
};

/**
 * Evaluate the current board position using Stockfish
 */
const evaluateCurrentPosition = async (): Promise<void> => {
  const currentFEN = Board.getFEN();
  if (!currentFEN) {
    log("No position available for evaluation");
    return;
  }

  log(`Evaluating position: ${currentFEN}`);

  // Don't evaluate if main analysis is running
  if (appState.isAnalyzing) {
    log("Skipping position evaluation - main analysis is running");
    return;
  }

  // Update state to show we're analyzing
  updateAppState({
    positionEvaluation: {
      ...appState.positionEvaluation,
      isAnalyzing: true,
    },
  });
  updatePositionEvaluationDisplay();
  updateButtonStates();

  try {
    // Get a proper evaluation with adequate depth and timeout
    const result = await Promise.race([
      Stockfish.analyzePosition(currentFEN, {
        depth: 20,
        threads: 1,
        multiPV: 1,
      }),
      new Promise<AnalysisResult>((_, reject) =>
        setTimeout(() => reject(new Error("Analysis timeout")), 10000),
      ),
    ]);

    if (result.moves.length > 0) {
      const bestMove = result.moves[0];
      const score = bestMove.score;

      // Log the evaluation for debugging
      log(`Position evaluation: ${score} centipawns (${score / 100} pawns)`);

      // Determine if it's a mate
      const isMate = Math.abs(score) >= 10000;
      const mateIn = isMate ? Math.ceil((10000 - Math.abs(score)) / 2) : null;

      updateAppState({
        positionEvaluation: {
          score,
          isMate,
          mateIn,
          isAnalyzing: false,
        },
      });
    } else {
      log("No moves found in analysis result");
      updateAppState({
        positionEvaluation: {
          score: null,
          isMate: false,
          mateIn: null,
          isAnalyzing: false,
        },
      });
    }
  } catch (error) {
    logError("Error evaluating position:", error);
    updateAppState({
      positionEvaluation: {
        score: null,
        isMate: false,
        mateIn: null,
        isAnalyzing: false,
      },
    });
  }

  updatePositionEvaluationDisplay();
  updateButtonStates();
};

/**
 * Update the position evaluation display
 */
const updatePositionEvaluationDisplay = (): void => {
  const evaluationButton = document.getElementById(
    "position-evaluation-btn",
  ) as HTMLButtonElement;
  if (!evaluationButton) {
    return;
  }

  const { score, isMate, mateIn, isAnalyzing } = appState.positionEvaluation;

  if (isAnalyzing) {
    evaluationButton.textContent = "...";
    evaluationButton.className = "evaluation-button neutral";
    evaluationButton.disabled = true;
    return;
  }

  if (score === null) {
    evaluationButton.textContent = "??";
    evaluationButton.className = "evaluation-button neutral";
    evaluationButton.disabled = false;
    return;
  }

  let displayText: string;
  let className: string;

  if (isMate) {
    if (mateIn === 0) {
      displayText = "M";
    } else {
      displayText = score > 0 ? `+M${mateIn}` : `-M${mateIn}`;
    }
    className = "evaluation-button mate";
  } else {
    // Convert centipawns to pawns and format
    const pawns = score / 100;
    if (Math.abs(pawns) < 0.1) {
      displayText = "0.0";
      className = "evaluation-button neutral";
    } else {
      displayText = pawns > 0 ? `+${pawns.toFixed(1)}` : `${pawns.toFixed(1)}`;
      className =
        pawns > 0 ? "evaluation-button positive" : "evaluation-button negative";
    }
  }

  evaluationButton.textContent = displayText;
  evaluationButton.className = className;
  evaluationButton.disabled = false;
};

// ============================================================================
// EVENT LISTENERS
// ============================================================================

/**
 * Initialize event listeners
 */
const initializeEventListeners = (): void => {
  // Board controls
  const resetBtn = document.getElementById("reset-board");
  const clearBtn = document.getElementById("clear-board");
  const fenInput = getInputElement("fen-input");
  const loadFenBtn = document.getElementById("load-fen");
  const gameNotation = getTextAreaElement("game-notation");
  const importGameBtn = document.getElementById("import-game");

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      const initialFEN =
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
      updateAppState({
        initialFEN,
        moves: [],
        currentMoveIndex: -1,
      });
      Board.setPosition(initialFEN);
      updateMoveList();
      updateNavigationButtons();
      resetPositionEvaluation();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      const emptyFEN = "8/8/8/8/8/8/8/8 w - - 0 1";
      updateAppState({
        initialFEN: emptyFEN,
        moves: [],
        currentMoveIndex: -1,
      });
      Board.setPosition(emptyFEN);
      updateMoveList();
      updateNavigationButtons();
      resetPositionEvaluation();
    });
  }

  if (loadFenBtn && fenInput) {
    loadFenBtn.addEventListener("click", () => {
      const fen = fenInput.value.trim();
      if (fen) {
        updateAppState({
          initialFEN: fen,
          moves: [],
          currentMoveIndex: -1,
        });
        Board.setPosition(fen);
        updateMoveList();
        updateNavigationButtons();
        resetPositionEvaluation();
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
  const prevMoveBtn = document.getElementById("prev-move");
  const nextMoveBtn = document.getElementById("next-move");

  if (prevMoveBtn) {
    prevMoveBtn.addEventListener("click", () => previousMove());
  }
  if (nextMoveBtn) {
    nextMoveBtn.addEventListener("click", () => nextMove());
  }

  // Analysis controls
  const startBtn = document.getElementById("start-analysis");
  const pauseBtn = document.getElementById("pause-analysis");
  const stopBtn = document.getElementById("stop-analysis");

  if (startBtn) {
    startBtn.addEventListener("click", () => startAnalysis());
  }

  if (stopBtn) {
    stopBtn.addEventListener("click", () => stopAnalysis());
  }

  // Best lines analysis controls
  const startTreeDiggerBtn = document.getElementById("start-tree-digger");
  const stopTreeDiggerBtn = document.getElementById("stop-tree-digger");
  const clearTreeDiggerBtn = document.getElementById("clear-tree-digger");

  if (startTreeDiggerBtn) {
    startTreeDiggerBtn.addEventListener("click", () =>
      startBestLinesAnalysis(),
    );
  }

  if (stopTreeDiggerBtn) {
    stopTreeDiggerBtn.addEventListener("click", () => {
      console.log("USER PRESSED STOP BUTTON - Analysis manually stopped");
      stopBestLinesAnalysis();
    });
  }

  if (clearTreeDiggerBtn) {
    clearTreeDiggerBtn.addEventListener("click", () =>
      clearBestLinesAnalysis(),
    );
  }

  // Tree font size control
  const treeFontSizeInput = document.getElementById(
    "tree-font-size",
  ) as HTMLInputElement;
  if (treeFontSizeInput) {
    // Initialize with default value
    updateTreeFontSize(16);

    treeFontSizeInput.addEventListener("input", () => {
      const fontSize = treeFontSizeInput.value;
      updateTreeFontSize(parseInt(fontSize));
    });
  }

  // Thread control for tree digger analysis
  const treeDiggerThreadsInput = document.getElementById(
    "tree-digger-threads",
  ) as HTMLInputElement;
  const treeDiggerThreadsValue = document.getElementById(
    "tree-digger-threads-value",
  );

  if (treeDiggerThreadsInput && treeDiggerThreadsValue) {
    treeDiggerThreadsInput.addEventListener("input", () => {
      const threads = treeDiggerThreadsInput.value;
      treeDiggerThreadsValue.textContent = threads;
    });
  }

  // Update tree digger threads input for fallback mode
  updateTreeDiggerThreadsForFallbackMode();

  // Depth scaler control for tree digger analysis
  const treeDiggerDepthScalerInput = document.getElementById(
    "tree-digger-depth-scaler",
  ) as HTMLInputElement;
  const treeDiggerDepthScalerValue = document.getElementById(
    "tree-digger-depth-scaler-value",
  );

  if (treeDiggerDepthScalerInput && treeDiggerDepthScalerValue) {
    treeDiggerDepthScalerInput.addEventListener("input", () => {
      const depthScaler = treeDiggerDepthScalerInput.value;
      treeDiggerDepthScalerValue.textContent = depthScaler;
    });
  }

  // Stockfish loading event listeners
  window.addEventListener("stockfish-loading", ((event: Event) => {
    const customEvent = event as CustomEvent;
    const message = customEvent.detail?.message || "Loading Stockfish...";
    updateBestLinesStatus(message);
    updateAnalysisStatus(message);
  }) as EventListener);

  window.addEventListener("stockfish-ready", (() => {
    updateBestLinesStatus("Stockfish ready");
    updateAnalysisStatus("Stockfish ready");
  }) as EventListener);

  window.addEventListener("stockfish-analyzing", ((event: Event) => {
    const customEvent = event as CustomEvent;
    const message = customEvent.detail?.message || "Analyzing...";
    const position = customEvent.detail?.position || "";
    updateBestLinesStatus(`${message} ${position}`);
    updateAnalysisStatus(`${message} ${position}`);
  }) as EventListener);

  window.addEventListener("stockfish-analysis-complete", ((event: Event) => {
    const customEvent = event as CustomEvent;
    const message = customEvent.detail?.message || "Analysis complete";
    const movesFound = customEvent.detail?.movesFound || 0;
    updateBestLinesStatus(`${message} (${movesFound} moves)`);
    updateAnalysisStatus(`${message} (${movesFound} moves)`);
  }) as EventListener);

  window.addEventListener("stockfish-pv-update", ((event: Event) => {
    const customEvent = event as CustomEvent;
    const pvLines = customEvent.detail?.pvLines || 0;

    // Update the status immediately with PV count
    const statusElement = document.getElementById("tree-digger-status");
    if (statusElement && BestLines.isAnalyzing()) {
      const progress = BestLines.getProgress();
      const progressPercent =
        progress.totalPositions > 0
          ? Math.round(
              (progress.analyzedPositions / progress.totalPositions) * 100,
            )
          : 0;
      const currentPos = progress.currentPosition.substring(0, 30) + "...";
      statusElement.textContent = `Analyzing... ${progress.analyzedPositions}/${progress.totalPositions} (${progressPercent}%) - ${currentPos}`;
    }
  }) as EventListener);

  window.addEventListener("stockfish-pv-line", ((event: Event) => {
    // const customEvent = event as CustomEvent;
    // const depth = customEvent.detail?.depth || 0;
    // const multipv = customEvent.detail?.multipv || 0;
    // const score = customEvent.detail?.score || 0;
    // const pvMoves = customEvent.detail?.pvMoves || 0;

    // log(`Stockfish PV line: depth=${depth}, multipv=${multipv}, score=${score}, moves=${pvMoves}`);

    // Increment the PV lines counter in best lines state
    if (BestLines.isAnalyzing()) {
      const progress = BestLines.getProgress();
      progress.pvLinesReceived++;

      // Update the status immediately
      const statusElement = document.getElementById("tree-digger-status");
      if (statusElement) {
        const progressPercent =
          progress.totalPositions > 0
            ? Math.round(
                (progress.analyzedPositions / progress.totalPositions) * 100,
              )
            : 0;
        const currentPos = progress.currentPosition.substring(0, 30) + "...";
        statusElement.textContent = `Analyzing... ${progress.analyzedPositions}/${progress.totalPositions} (${progressPercent}%) - ${currentPos}`;
      }
    }
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

  // Debounced update mechanism for best lines analysis
  let bestLinesUpdateTimeout: number | null = null;

  const debouncedBestLinesUpdate = () => {
    // Reset event rate when analysis stops
    if (BestLines.isAnalyzing()) {
      eventTrackingState.totalCount++;
    } else {
      eventTrackingState.recentCount = 0;
    }

    if (bestLinesUpdateTimeout) return;
    bestLinesUpdateTimeout = setTimeout(() => {
      bestLinesUpdateTimeout = null;
      const now = Date.now();

      // Track recent events (last 1 second)
      if (now - eventTrackingState.recentStartTime > 1000) {
        // Reset recent window
        eventTrackingState.recentCount = 1;
        eventTrackingState.recentStartTime = now;
      } else {
        eventTrackingState.recentCount++;
      }

      eventTrackingState.lastEventTime = now;

      // Update immediately
      updateBestLinesStatus();
      updateBestLinesResults();
      updateBestLinesButtonStates();
    }, 200);
  };

  // Listen for Stockfish events to trigger UI updates
  window.addEventListener("stockfish-pv-update", debouncedBestLinesUpdate);
  window.addEventListener("stockfish-pv-line", debouncedBestLinesUpdate);
  window.addEventListener("stockfish-info-update", debouncedBestLinesUpdate);
  window.addEventListener(
    "stockfish-analysis-complete",
    debouncedBestLinesUpdate,
  );
  window.addEventListener("best-lines-progress", debouncedBestLinesUpdate);

  // Responder moves control for best lines
  const treeDiggerResponderMovesInput = document.getElementById(
    "tree-digger-responder-moves",
  ) as HTMLInputElement;
  const responderMovesValue = document.getElementById(
    "tree-digger-responder-moves-value",
  );
  if (treeDiggerResponderMovesInput && responderMovesValue) {
    treeDiggerResponderMovesInput.addEventListener("input", () => {
      responderMovesValue.textContent = treeDiggerResponderMovesInput.value;
    });
  }

  // Override controls for best lines
  const treeDiggerOverride1Input = document.getElementById(
    "tree-digger-override-1",
  ) as HTMLInputElement;
  const override1Value = document.getElementById(
    "tree-digger-override-1-value",
  );
  if (treeDiggerOverride1Input && override1Value) {
    treeDiggerOverride1Input.addEventListener("input", () => {
      override1Value.textContent = treeDiggerOverride1Input.value;
    });
  }

  const treeDiggerOverride2Input = document.getElementById(
    "tree-digger-override-2",
  ) as HTMLInputElement;
  const override2Value = document.getElementById(
    "tree-digger-override-2-value",
  );
  if (treeDiggerOverride2Input && override2Value) {
    treeDiggerOverride2Input.addEventListener("input", () => {
      override2Value.textContent = treeDiggerOverride2Input.value;
    });
  }
};

/**
 * Update threads input for fallback mode
 */
const updateThreadsInputForFallbackMode = (): void => {
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
};

/**
 * Update tree digger threads input for fallback mode
 */
const updateTreeDiggerThreadsForFallbackMode = (): void => {
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

/**
 * Start analysis
 */
const startAnalysis = async (): Promise<void> => {
  if (appState.isAnalyzing) return;

  updateAppState({
    isAnalyzing: true,
  });
  updateButtonStates();
  updatePositionEvaluationDisplay();

  try {
    const options = getAnalysisOptions();
    const fen = Board.getFEN();

    const result = await Stockfish.analyzePosition(
      fen,
      options,
      (analysisResult) => {
        updateAppState({
          currentResults: analysisResult,
          isAnalyzing: !analysisResult.completed,
        });
        updateResults(analysisResult);
        updateButtonStates();
      },
    );

    updateAppState({
      currentResults: result,
      isAnalyzing: false,
    });
    updateButtonStates();
  } catch (error) {
    logError("Analysis failed:", error);
    updateAppState({ isAnalyzing: false });
    updateButtonStates();
  }
};

/**
 * Stop analysis
 */
const stopAnalysis = (): void => {
  Stockfish.stopAnalysis();
  updateAppState({
    isAnalyzing: false,
    currentResults: null,
  });
  updateButtonStates();
  updateResultsPanel([]);
};

/**
 * Get analysis options from UI
 */
const getAnalysisOptions = (): AnalysisOptions => {
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
};

/**
 * Update button states
 */
const updateButtonStates = (): void => {
  const startBtn = getButtonElement("start-analysis");
  const stopBtn = getButtonElement("stop-analysis");

  // Disable start button if main analysis is running OR position evaluation is running
  const isStockfishBusy =
    appState.isAnalyzing || appState.positionEvaluation.isAnalyzing;

  if (startBtn) startBtn.disabled = isStockfishBusy;
  if (stopBtn) stopBtn.disabled = !appState.isAnalyzing;
};

// ============================================================================
// BEST LINES ANALYSIS FUNCTIONS
// ============================================================================

/**
 * Start best lines analysis
 */
const startBestLinesAnalysis = async (): Promise<void> => {
  try {
    // Clear any previous analysis results first
    BestLines.clearBestLinesAnalysis();

    await BestLines.startBestLinesAnalysis();
    updateBestLinesButtonStates();
    updateBestLinesStatus();
    updateBestLinesResults();
  } catch (error) {
    logError("Failed to start best lines analysis:", error);
    updateBestLinesStatus("Error starting analysis");
  }
};

/**
 * Stop best lines analysis
 */
const stopBestLinesAnalysis = (): void => {
  console.log("Stop button clicked - calling stopBestLinesAnalysis");
  try {
    BestLines.stopBestLinesAnalysis();
    console.log("BestLines.stopBestLinesAnalysis() completed");
    clearTreeNodeDOMMap(); // Clear tracked DOM elements
    updateBestLinesButtonStates();
    updateBestLinesStatus("Analysis stopped");
    console.log("Stop analysis completed successfully");
  } catch (error) {
    console.error("Failed to stop best lines analysis:", error);
    logError("Failed to stop best lines analysis:", error);
  }
};

/**
 * Clear best lines analysis
 */
const clearBestLinesAnalysis = (): void => {
  try {
    BestLines.clearBestLinesAnalysis();
    clearTreeNodeDOMMap(); // Clear tracked DOM elements
    updateBestLinesButtonStates();
    updateBestLinesStatus("Ready");
    updateBestLinesResults();
  } catch (error) {
    logError("Failed to clear best lines analysis:", error);
  }
};

/**
 * Update best lines button states
 */
const updateBestLinesButtonStates = (): void => {
  const startBtn = getButtonElement("start-tree-digger");
  const stopBtn = getButtonElement("stop-tree-digger");
  const clearBtn = getButtonElement("clear-tree-digger");

  const isAnalyzing = BestLines.isAnalyzing();
  const isStockfishBusy =
    appState.isAnalyzing || appState.positionEvaluation.isAnalyzing;

  if (startBtn) {
    startBtn.disabled = isAnalyzing || isStockfishBusy;
  } else {
    console.error("Start button not found!");
  }
  if (stopBtn) {
    stopBtn.disabled = !isAnalyzing;
  } else {
    console.error("Stop button not found!");
  }
  if (clearBtn) {
    clearBtn.disabled = isAnalyzing;
  } else {
    console.error("Clear button not found!");
  }
};

/**
 * Update best lines status
 */
const updateBestLinesStatus = (message?: string): void => {
  const statusElement = document.getElementById("tree-digger-status");
  if (!statusElement) return;

  if (message) {
    statusElement.textContent = message;
    return;
  }

  const isAnalyzing = BestLines.isAnalyzing();
  const progress = BestLines.getProgress();
  const analysis = BestLines.getCurrentAnalysis();

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
};

const updateAnalysisStatus = (message?: string): void => {
  const statusElement = document.getElementById("analysis-status");
  if (!statusElement) return;

  if (message) {
    statusElement.textContent = message;
    return;
  }

  const appState = getAppState();
  if (appState.isAnalyzing) {
    statusElement.textContent = "Analyzing...";
  } else {
    statusElement.textContent = "Ready";
  }
};

/**
 * Update best lines results display
 */
const updateBestLinesResults = (): void => {
  const resultsElement = document.getElementById("tree-digger-results");
  if (!resultsElement) return;

  const analysis = BestLines.getCurrentAnalysis();
  if (!analysis) {
    resultsElement.innerHTML = "<p>No analysis results available.</p>";
    return;
  }

  // Update progress section
  updateBestLinesProgress(resultsElement, analysis);

  // Update tree section incrementally
  updateBestLinesTreeIncrementally(resultsElement, analysis);
};

/**
 * Update progress section
 */
const updateBestLinesProgress = (
  resultsElement: HTMLElement,
  analysis: BestLinesAnalysis,
): void => {
  let progressSection = resultsElement.querySelector(
    ".tree-digger-progress-section",
  );
  if (!progressSection) {
    progressSection = document.createElement("div");
    progressSection.className = "tree-digger-progress-section";
    resultsElement.appendChild(progressSection);
  }

  const isAnalyzing = BestLines.isAnalyzing();
  const progress = BestLines.getProgress();
  const totalLeafs = BestLines.calculateTotalLeafs(analysis.nodes);
  const uniquePositions = BestLines.calculateUniquePositions(
    analysis.nodes,
    analysis,
  );

  // Calculate event rate for stats (based on recent events)
  const now = Date.now();
  const timeSinceRecentStart = now - eventTrackingState.recentStartTime;
  const recentCount = eventTrackingState.recentCount;

  // Calculate rate based on actual time window (max 1 second)
  const timeWindow = Math.min(timeSinceRecentStart, 1000);
  const eventsPerSecond =
    !isAnalyzing || analysis?.isComplete
      ? "--"
      : timeWindow > 0
        ? Math.round(recentCount / (timeWindow / 1000))
        : 0;

  // Calculate total positions with overrides
  const depthScaler = getDepthScaler();
  const responderMovesCount = getResponderMovesCount();
  const firstReplyOverride = getFirstReplyOverride();
  const secondReplyOverride = getSecondReplyOverride();

  // Calculate total positions considering overrides
  const totalPositionsWithOverrides = calculateTotalPositionsWithOverrides(
    depthScaler,
    responderMovesCount,
    firstReplyOverride,
    secondReplyOverride,
  );

  let overrideExplanation = "";
  if (firstReplyOverride > 0 || secondReplyOverride > 0) {
    // Build override explanation
    const overrides = [];
    if (firstReplyOverride > 0)
      overrides.push(`1st reply: ${firstReplyOverride}`);
    if (secondReplyOverride > 0)
      overrides.push(`2nd reply: ${secondReplyOverride}`);
    overrideExplanation = ` (with overrides: ${overrides.join(", ")})`;
  }

  const computationFormula = `1 + 2*${firstReplyOverride || responderMovesCount} + 2*${secondReplyOverride || responderMovesCount}<sup>2</sup> + 2∑(${responderMovesCount}<sup>n</sup>) for n from 3 to ⌊${depthScaler}/2⌋ = ${totalPositionsWithOverrides}`;

  const html = `
    <div class="best-line-progress-container">
      <div class="best-line-progress-left">
        <div class="best-line-stats">
          <div class="stat = ${totalPositionsWithOverrides}">
            <div class="stat-label">Total positions to analyze</div>
            <div class="stat-value">${totalPositionsWithOverrides}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Analyzed</div>
            <div class="stat-value">${progress.analyzedPositions}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Total Leafs</div>
            <div class="stat-value">${totalLeafs}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Unique Positions</div>
            <div class="stat-value">${uniquePositions}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Stockfish Events</div>
            <div class="stat-value">${eventTrackingState.totalCount}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Event Rate</div>
            <div class="stat-value">${eventsPerSecond || 0}/s</div>
          </div>
        </div>
        <div class="best-line-settings">
          <div class="setting">
            <div class="setting-label">Depth Scaler</div>
            <div class="setting-value">${depthScaler}</div>
          </div>
          <div class="setting">
            <div class="setting-label">1st ${(() => {
              const currentAnalysis = BestLines.getCurrentAnalysis();
              const rootFen =
                currentAnalysis?.rootFen ||
                "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
              const startingPlayer = getStartingPlayer(rootFen);
              return startingPlayer === "w" ? "White" : "Black";
            })()} Move</div>
            <div class="setting-value">${(document.getElementById("tree-digger-initiator-move-1") as HTMLInputElement | null)?.value || '<span style=\"color:#aaa\">[default]</span>'}</div>
          </div>
          <div class="setting">
            <div class="setting-label">2nd ${(() => {
              const currentAnalysis = BestLines.getCurrentAnalysis();
              const rootFen =
                currentAnalysis?.rootFen ||
                "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
              const startingPlayer = getStartingPlayer(rootFen);
              return startingPlayer === "w" ? "White" : "Black";
            })()} Move</div>
            <div class="setting-value">${(document.getElementById("tree-digger-initiator-move-2") as HTMLInputElement | null)?.value || '<span style=\"color:#aaa\">[default]</span>'}</div>
          </div>
          <div class="setting">
            <div class="setting-label">Responder Moves</div>
            <div class="setting-value">${responderMovesCount}</div>
          </div>
          <div class="setting">
            <div class="setting-label">1st Reply Override</div>
            <div class="setting-value">${firstReplyOverride > 0 ? firstReplyOverride : "0 (default)"}</div>
          </div>
          <div class="setting">
            <div class="setting-label">2nd Reply Override</div>
            <div class="setting-value">${secondReplyOverride > 0 ? secondReplyOverride : "0 (default)"}</div>
          </div>
          <div class="setting">
            <div class="setting-label">Threads</div>
            <div class="setting-value">${getThreadCount()}</div>
          </div>
        </div>
        <div class="best-line-progress">
          <div class="best-line-progress-bar" style="width: ${progress.totalPositions > 0 ? (progress.analyzedPositions / progress.totalPositions) * 100 : 0}%"></div>
        </div>
        <div class="best-line-explanation">
          <h3>Analysis Progress</h3>
          <ul>
            <li><strong>Initial position</strong>: ${progress.initialPosition}</li>
            <li><strong>Total positions</strong>: ${computationFormula} positions to analyze${overrideExplanation}</li>
            <li><strong>Analyzed</strong>: ${progress.analyzedPositions} positions completed</li>
            <li><strong>Total leafs</strong>: ${totalLeafs} leaf nodes in the tree</li>
            <li><strong>Unique Positions</strong>: ${uniquePositions} distinct positions analyzed</li>
            <li><strong>Current activity</strong>: ${isAnalyzing ? "🔄 Analyzing position" : "Ready"} ${progress.currentPosition.substring(0, 30)}...</li>
            ${firstReplyOverride > 0 || secondReplyOverride > 0 ? `<li><strong>Computation</strong>: Depth ${depthScaler} × 2 = ${depthScaler * 2} levels, with ${firstReplyOverride > 0 ? `1st reply: ${firstReplyOverride}` : `1st reply: ${responderMovesCount}`} and ${secondReplyOverride > 0 ? `2nd reply: ${secondReplyOverride}` : `2nd reply: ${responderMovesCount}`} responder responses</li>` : ""}
          </ul>
        </div>
      </div>
      <div class="best-line-progress-board">
        <div class="best-line-progress-board-title">Root Board</div>
        <div class="offset-board" id="progress-board"></div>
      </div>
    </div>
  `;

  progressSection.innerHTML = html;

  // Render the board for the initial position (root position)
  const boardElement = progressSection.querySelector(
    "#progress-board",
  ) as HTMLElement;
  if (boardElement) {
    renderProgressBoard(boardElement, progress.initialPosition);
  }
};

/**
 * Render a small board for the progress panel
 */
const renderProgressBoard = (boardElement: HTMLElement, fen: string): void => {
  try {
    const position = parseFEN(fen);
    let html = "";

    // Render board from white's perspective (bottom to top)
    for (let rank = 0; rank <= 7; rank++) {
      for (let file = 0; file < 8; file++) {
        const square = coordsToSquare(rank, file);
        const piece = position.board[rank][file];
        const isLight = (rank + file) % 2 === 0;
        const squareClass = isLight ? "light" : "dark";

        html += `<div class="square ${squareClass}" data-square="${square}">`;
        if (piece) {
          const pieceNotation = createPieceNotation(piece);
          const color = getColorFromNotation(pieceNotation);
          const pieceClass = color === "w" ? "white" : "black";
          html += `<div class="piece ${pieceClass}">${piece}</div>`;
        }
        html += "</div>";
      }
    }

    boardElement.innerHTML = html;
  } catch (error) {
    console.error("Error rendering progress board:", error);
    boardElement.innerHTML =
      '<div style="padding: 20px; text-align: center; color: #666;">Invalid position</div>';
  }
};

/**
 * Simple tree node structure for UI management
 */
interface UITreeNode {
  id: string;
  element: HTMLElement;
  children: UITreeNode[];
  parent: UITreeNode | null;
}

/**
 * Shadow tree to track what should be in the UI
 */
let shadowTree: UITreeNode | null = null;

/**
 * Generate a unique ID for a tree node
 */
const generateNodeId = (node: BestLineNode): string => {
  const positionAfterMove = applyMoveToFEN(node.fen, node.move);
  const cleanFen = positionAfterMove.replace(/[^a-zA-Z0-9]/g, "");
  return `node-${cleanFen}-${node.move.from}-${node.move.to}`;
};

/**
 * Create a DOM element for a tree node
 */
const createTreeNodeElement = (
  node: BestLineNode,
  depth: number,
  analysis: BestLinesAnalysis,
): HTMLElement => {
  const moveText = moveToNotation(node.move);
  const scoreText =
    node.score !== 0
      ? ` (${node.score > 0 ? "+" : ""}${(node.score / 100).toFixed(2)})`
      : "";
  const moveClass = node.isWhiteMove ? "white-move" : "black-move";

  const moveNumber = node.moveNumber;
  let moveNumberText = "";
  if (node.isWhiteMove) {
    moveNumberText = `${moveNumber}.`;
  } else {
    moveNumberText = `${moveNumber}...`;
  }
  const depthClass = `tree-depth-${depth}`;

  const nodeId = generateNodeId(node);

  const positionAfterMove = applyMoveToFEN(node.fen, node.move);
  const isTransposition =
    node.children.length === 0 &&
    analysis.analyzedPositions.has(positionAfterMove);
  const transpositionClass = isTransposition ? "transposition" : "";

  const element = document.createElement("div");
  element.className = `tree-node ${moveClass} ${depthClass} ${transpositionClass}`;
  element.setAttribute("data-node-id", nodeId);

  const moveInfo = document.createElement("div");
  moveInfo.className = "move-info";

  const moveNumberSpan = document.createElement("span");
  moveNumberSpan.className = "move-number";
  moveNumberSpan.textContent = moveNumberText;

  const moveTextSpan = document.createElement("span");
  moveTextSpan.className = "move-text";
  moveTextSpan.textContent = moveText;

  moveInfo.appendChild(moveNumberSpan);
  moveInfo.appendChild(moveTextSpan);

  if (scoreText) {
    const scoreSpan = document.createElement("span");
    scoreSpan.className = "move-score";
    scoreSpan.textContent = scoreText;
    moveInfo.appendChild(scoreSpan);
  }

  if (node.children.length > 0) {
    const childrenSpan = document.createElement("span");
    childrenSpan.className = "move-children";
    childrenSpan.textContent = `(${node.children.length})`;
    moveInfo.appendChild(childrenSpan);
  }

  if (isTransposition) {
    const transpositionSpan = document.createElement("span");
    transpositionSpan.className = "transposition-indicator";
    transpositionSpan.textContent = "🔄";
    moveInfo.appendChild(transpositionSpan);
  }

  element.appendChild(moveInfo);

  if (node.children.length === 0) {
    const lineCompletion = document.createElement("div");
    lineCompletion.className = "line-completion";
    lineCompletion.innerHTML = getLineCompletion(node, analysis);
    element.appendChild(lineCompletion);
  }

  return element;
};

/**
 * Update an existing DOM element for a tree node
 */
const updateTreeNodeElement = (
  element: HTMLElement,
  node: BestLineNode,
  analysis: BestLinesAnalysis,
): void => {
  const moveText = moveToNotation(node.move);
  const scoreText =
    node.score !== 0
      ? ` (${node.score > 0 ? "+" : ""}${(node.score / 100).toFixed(2)})`
      : "";

  // Update move text
  const moveTextSpan = element.querySelector(".move-text");
  if (moveTextSpan) {
    moveTextSpan.textContent = moveText;
  }

  // Update score
  let scoreSpan = element.querySelector(".move-score");
  if (scoreText) {
    if (!scoreSpan) {
      scoreSpan = document.createElement("span");
      scoreSpan.className = "move-score";
      const moveInfo = element.querySelector(".move-info");
      if (moveInfo) {
        moveInfo.appendChild(scoreSpan);
      }
    }
    scoreSpan.textContent = scoreText;
  } else if (scoreSpan) {
    scoreSpan.remove();
  }

  // Update children count
  let childrenSpan = element.querySelector(".move-children");
  if (node.children.length > 0) {
    if (!childrenSpan) {
      childrenSpan = document.createElement("span");
      childrenSpan.className = "move-children";
      const moveInfo = element.querySelector(".move-info");
      if (moveInfo) {
        moveInfo.appendChild(childrenSpan);
      }
    }
    childrenSpan.textContent = `(${node.children.length})`;
  } else if (childrenSpan) {
    childrenSpan.remove();
  }

  // Update transposition indicator
  const positionAfterMove = applyMoveToFEN(node.fen, node.move);
  const isTransposition =
    node.children.length === 0 &&
    analysis.analyzedPositions.has(positionAfterMove);

  let transpositionSpan = element.querySelector(".transposition-indicator");
  if (isTransposition) {
    if (!transpositionSpan) {
      transpositionSpan = document.createElement("span");
      transpositionSpan.className = "transposition-indicator";
      transpositionSpan.textContent = "🔄";
      const moveInfo = element.querySelector(".move-info");
      if (moveInfo) {
        moveInfo.appendChild(transpositionSpan);
      }
    }
  } else if (transpositionSpan) {
    transpositionSpan.remove();
  }

  // Update line completion
  let lineCompletion = element.querySelector(".line-completion");
  if (node.children.length === 0) {
    if (!lineCompletion) {
      lineCompletion = document.createElement("div");
      lineCompletion.className = "line-completion";
      element.appendChild(lineCompletion);
    }
    lineCompletion.innerHTML = getLineCompletion(node, analysis);
  } else if (lineCompletion) {
    lineCompletion.remove();
  }

  // Update classes
  element.className = element.className.replace(
    /tree-depth-\d+/,
    `tree-depth-${node.depth || 0}`,
  );
  if (isTransposition) {
    element.classList.add("transposition");
  } else {
    element.classList.remove("transposition");
  }
};

/**
 * Build the shadow tree from the data tree
 */
const buildShadowTree = (
  nodes: BestLineNode[],
  analysis: BestLinesAnalysis,
  parent: UITreeNode | null = null,
  depth: number = 0,
): UITreeNode[] => {
  const uiNodes: UITreeNode[] = [];

  for (const node of nodes) {
    const nodeId = generateNodeId(node);
    const element = createTreeNodeElement(node, depth, analysis);

    const uiNode: UITreeNode = {
      id: nodeId,
      element,
      children: [],
      parent,
    };

    // Recursively build children
    if (node.children.length > 0) {
      uiNode.children = buildShadowTree(
        node.children,
        analysis,
        uiNode,
        depth + 1,
      );
    }

    uiNodes.push(uiNode);
  }

  return uiNodes;
};

/**
 * Find a node by ID in the data tree
 */
const findNodeById = (
  nodeId: string,
  nodes: BestLineNode[],
): BestLineNode | null => {
  for (const node of nodes) {
    if (generateNodeId(node) === nodeId) {
      return node;
    }
    if (node.children.length > 0) {
      const found = findNodeById(nodeId, node.children);
      if (found) return found;
    }
  }
  return null;
};

/**
 * Sync the DOM with the shadow tree
 */
const syncDOMWithShadowTree = (
  container: HTMLElement,
  shadowNodes: UITreeNode[],
  analysis: BestLinesAnalysis,
): void => {
  // Get existing DOM nodes
  const existingNodes = Array.from(container.children) as HTMLElement[];
  const existingNodeMap = new Map<string, HTMLElement>();

  for (const element of existingNodes) {
    const nodeId = element.getAttribute("data-node-id");
    if (nodeId) {
      existingNodeMap.set(nodeId, element);
    }
  }

  // Process shadow nodes in order
  for (let i = 0; i < shadowNodes.length; i++) {
    const shadowNode = shadowNodes[i];
    const existingElement = existingNodeMap.get(shadowNode.id);

    if (existingElement) {
      // Update existing element - we need to find the original node data
      const originalNode = findNodeById(shadowNode.id, analysis.nodes);
      if (originalNode) {
        updateTreeNodeElement(existingElement, originalNode, analysis);
      }

      // Move to correct position if needed
      if (container.children[i] !== existingElement) {
        container.insertBefore(existingElement, container.children[i] || null);
      }

      // Process children
      let childrenContainer = existingElement.querySelector(
        ".tree-children",
      ) as HTMLElement;
      if (shadowNode.children.length > 0) {
        if (!childrenContainer) {
          childrenContainer = document.createElement("div");
          childrenContainer.className = "tree-children";
          existingElement.appendChild(childrenContainer);
        }
        syncDOMWithShadowTree(childrenContainer, shadowNode.children, analysis);
      } else if (childrenContainer) {
        childrenContainer.remove();
      }
    } else {
      // Create new element
      const newElement = shadowNode.element;

      // Insert at correct position
      if (i < container.children.length) {
        container.insertBefore(newElement, container.children[i]);
      } else {
        container.appendChild(newElement);
      }

      // Process children
      if (shadowNode.children.length > 0) {
        const childrenContainer = document.createElement("div");
        childrenContainer.className = "tree-children";
        newElement.appendChild(childrenContainer);
        syncDOMWithShadowTree(childrenContainer, shadowNode.children, analysis);
      }
    }
  }

  // Remove extra DOM nodes that shouldn't be there
  for (const element of existingNodes) {
    const nodeId = element.getAttribute("data-node-id");
    if (nodeId && !shadowNodes.find((n) => n.id === nodeId)) {
      element.remove();
    }
  }
};

/**
 * Update the tree UI incrementally
 */
const updateBestLinesTreeIncrementally = (
  resultsElement: HTMLElement,
  analysis: BestLinesAnalysis,
): void => {
  let treeSection = resultsElement.querySelector(
    ".tree-digger-tree",
  ) as HTMLElement;
  if (!treeSection) {
    treeSection = document.createElement("div");
    treeSection.className = "tree-digger-tree";
    resultsElement.appendChild(treeSection);
  }

  // Always update the tree section, even when there are no nodes
  if (analysis.nodes.length === 0) {
    treeSection.innerHTML =
      "<p id='tree-digger-tree-empty-message'>No analysis results yet. Starting analysis...</p>";
    shadowTree = null;
    return;
  }

  // Build the new shadow tree
  const newShadowNodes = buildShadowTree(analysis.nodes, analysis);

  // Sync the DOM with the shadow tree
  syncDOMWithShadowTree(treeSection, newShadowNodes, analysis);

  // Apply current font size to the updated tree
  const treeFontSizeInput = document.getElementById(
    "tree-font-size",
  ) as HTMLInputElement;
  if (treeFontSizeInput) {
    const currentFontSize = parseInt(treeFontSizeInput.value);
    updateTreeFontSize(currentFontSize);
  }
};

/**
 * Count nodes recursively for comparison
 */
const countNodesRecursive = (nodes: BestLineNode[]): number => {
  let count = 0;
  for (const node of nodes) {
    count += 1 + countNodesRecursive(node.children);
  }
  return count;
};

/**
 * Render a tree node recursively
 */
const renderTreeNode = (
  node: BestLineNode,
  depth: number,
  analysis: BestLinesAnalysis,
): string => {
  const moveText = moveToNotation(node.move);
  const scoreText =
    node.score !== 0
      ? ` (${node.score > 0 ? "+" : ""}${(node.score / 100).toFixed(2)})`
      : "";
  const moveClass = node.isWhiteMove ? "white-move" : "black-move";

  // Use the move number from the node itself (calculated based on game position)
  const moveNumber = node.moveNumber;
  let moveNumberText = "";
  if (node.isWhiteMove) {
    moveNumberText = `${moveNumber}.`;
  } else {
    moveNumberText = `${moveNumber}...`;
  }
  const depthClass = `tree-depth-${depth}`;

  // Generate a unique node ID for debugging
  const nodeId = `node-${node.fen.replace(/[^a-zA-Z0-9]/g, "")}-${node.move.from}-${node.move.to}`;

  // Check if this position is a transposition (has been analyzed before)
  // We show transposition when this node has no children because the position was already analyzed
  const positionAfterMove = applyMoveToFEN(node.fen, node.move);
  const isTransposition =
    node.children.length === 0 &&
    analysis.analyzedPositions.has(positionAfterMove);
  const transpositionClass = isTransposition ? "transposition" : "";

  let html = `
    <div class="tree-node ${moveClass} ${depthClass} ${transpositionClass}" data-node-id="${nodeId}">
      <div class="move-info">
        <span class="move-number">${moveNumberText}</span>
        <span class="move-text">${moveText}</span>
        ${scoreText ? `<span class="move-score">${scoreText}</span>` : ""}
        ${node.children.length > 0 ? `<span class="move-children">(${node.children.length})</span>` : ""}
        ${isTransposition ? `<span class="transposition-indicator">🔄</span>` : ""}
      </div>
      ${node.children.length === 0 ? `<div class="line-completion">${getLineCompletion(node, analysis)}</div>` : ""}
  `;

  if (node.children.length > 0) {
    html += `<div class="tree-children">`;
    for (const child of node.children) {
      html += renderTreeNode(child, depth + 1, analysis);
    }
    html += `</div>`;
  }

  html += `</div>`;
  return html;
};

/**
 * Get the completion text for a leaf node
 */
const getLineCompletion = (
  node: BestLineNode,
  analysis: BestLinesAnalysis,
): string => {
  const positionAfterMove = applyMoveToFEN(node.fen, node.move);
  const isTransposition = analysis.analyzedPositions.has(positionAfterMove);

  if (isTransposition) {
    // Show incomplete line for transposed positions
    const currentLine = getCompleteLine(node);
    const existingLine = findExistingLine(positionAfterMove, analysis);
    if (existingLine) {
      return `<span class="incomplete-line">→ Incomplete line: ${currentLine} → transposes into: ${existingLine}</span>`;
    }
    return `<span class="incomplete-line">→ Incomplete line: ${currentLine} → position already analyzed</span>`;
  } else {
    // Show the complete line from root to this leaf
    const completeLine = getCompleteLine(node);
    return `<span class="complete-line">→ Complete line: ${completeLine}</span>`;
  }
};

/**
 * Find an existing line that leads to the given position
 */
const findExistingLine = (
  targetFen: string,
  analysis: BestLinesAnalysis,
): string | null => {
  const searchNode = (
    nodes: BestLineNode[],
    path: BestLineNode[],
  ): string | null => {
    for (const node of nodes) {
      const newPath = [...path, node];
      const nodeFen = applyMoveToFEN(node.fen, node.move);

      if (nodeFen === targetFen) {
        return formatLineWithMoveNumbers(newPath);
      }

      const result = searchNode(node.children, newPath);
      if (result) return result;
    }
    return null;
  };

  return searchNode(analysis.nodes, []);
};

/**
 * Format a list of moves with proper chess notation
 */
const formatLineWithMoveNumbers = (moves: BestLineNode[]): string => {
  let formattedLine = "";

  // Get the starting move number from the first node's moveNumber
  // This accounts for the current game position
  const startingMoveNumber = moves.length > 0 ? moves[0].moveNumber : 1;

  for (let i = 0; i < moves.length; i++) {
    const moveNode = moves[i];
    // Always use algebraic notation (KQR etc.) for copy functionality
    const moveText = moveToNotation(moveNode.move, "short", "english");

    if (moveNode.isWhiteMove) {
      // White move - start new move number
      if (i > 0) formattedLine += " ";
      // Use the node's calculated move number (which accounts for current game position)
      formattedLine += `${moveNode.moveNumber}. ${moveText}`;
    } else {
      // Black move - add to current move number
      formattedLine += ` ${moveText}`;
    }
  }

  return formattedLine;
};

/**
 * Get the complete line from root to the given node
 */
const getCompleteLine = (node: BestLineNode): string => {
  const moves: BestLineNode[] = [];
  let current: BestLineNode | undefined = node;

  // Walk up the tree to collect moves
  while (current) {
    moves.unshift(current);
    current = current.parent;
  }

  // Format the line with proper chess notation
  let formattedLine = "";

  for (let i = 0; i < moves.length; i++) {
    const moveNode = moves[i];
    const moveText = moveToNotation(moveNode.move);

    if (moveNode.isWhiteMove) {
      // White move - start new move number
      if (i > 0) formattedLine += " ";
      // Use the node's calculated move number (which accounts for current game position)
      formattedLine += `${moveNode.moveNumber}. ${moveText}`;
    } else {
      // Black move - add to current move number
      formattedLine += ` ${moveText}`;
    }
  }

  return formattedLine;
};

/**
 * Update tree font size
 */
const updateTreeFontSize = (fontSize: number): void => {
  const treeSection = document.querySelector(".tree-digger-tree");
  if (treeSection) {
    (treeSection as HTMLElement).style.fontSize = `${fontSize}px`;
  }

  // Also update the initial font size when the control is first loaded
  const treeFontSizeInput = document.getElementById(
    "tree-font-size",
  ) as HTMLInputElement;
  if (treeFontSizeInput) {
    treeFontSizeInput.value = fontSize.toString();
  }
};

/**
 * Render a best line node
 */
const renderBestLineNode = (node: BestLineNode): string => {
  const moveText = moveToNotation(node.move);
  const scoreText =
    node.score !== 0
      ? ` (${node.score > 0 ? "+" : ""}${(node.score / 100).toFixed(2)})`
      : "";
  const depthText = node.depth > 0 ? ` [depth: ${node.depth}]` : "";
  const moveClass = node.isWhiteMove ? "white-move" : "black-move";
  const playerText = node.isWhiteMove ? "White" : "Black";

  let html = `
    <div class="best-line-node ${moveClass}">
      <div class="move-info">
        <span class="move-player">${playerText}</span>
        <span class="move-text">${moveText}</span>
        ${scoreText ? `<span class="move-score">${scoreText}</span>` : ""}
        ${depthText ? `<span class="move-depth">${depthText}</span>` : ""}
      </div>
      <div class="move-fen">${node.fen}</div>
  `;

  if (node.children.length > 0) {
    html += "<div class='children'>";
    for (const child of node.children) {
      html += renderBestLineNode(child);
    }
    html += "</div>";
  }

  html += "</div>";
  return html;
};

// ============================================================================
// RESULTS MANAGEMENT
// ============================================================================

/**
 * Update results display
 */
const updateResults = (result: AnalysisResult): void => {
  if (!result || !result.moves) return;

  updateResultsPanel(result.moves);
  updateStatus(`Analysis complete: ${result.moves.length} moves found`);
};

const formatPVWithEffects = (
  pv: ChessMove[],
  position: string,
  format: NotationFormat,
  pieceFormat: PieceFormat,
): string => {
  if (pv.length === 0) return "";

  // Parse the position to determine whose turn it is
  const parsedPosition = parseFEN(position);
  const isBlackTurn = parsedPosition.turn === PLAYER_COLORS.BLACK;

  // Get current game state to determine starting move number
  const appState = getAppState();
  const currentMoveCount = appState.currentMoveIndex + 1; // +1 because currentMoveIndex is 0-based
  const currentMoveNumber = Math.floor(currentMoveCount / 2) + 1;

  // Process moves in the context of the actual position
  let currentPosition = parseFEN(position);
  const moves = pv.map((move: ChessMove, index: number) => {
    // Validate each move against the current position
    const validation = validateMove(currentPosition, move);

    // Update the move with effect information
    const enhancedMove = {
      ...move,
      effect: validation.effect,
    };

    const notation = moveToNotation(
      enhancedMove,
      format,
      pieceFormat,
      toFEN(currentPosition),
    );

    // Apply the move to get the position for the next move
    if (validation.isValid) {
      const newFEN = applyMoveToFEN(toFEN(currentPosition), move);
      currentPosition = parseFEN(newFEN);
    }

    // Create clickable move with data attributes
    return `<span class="pv-move" data-move-from="${move.from}" data-move-to="${move.to}" data-move-piece="${move.piece}" data-original-position="${position}" data-move-index="${index}" title="Click to apply all moves up to this point">${notation}</span>`;
  });

  if (format === "long") {
    // Long format: just show the moves with piece symbols
    return moves.join(" ");
  } else {
    // Short format: standard game notation with move numbers
    let result = "";
    let currentMoveNum = currentMoveNumber;

    for (let i = 0; i < moves.length; i++) {
      if (isBlackTurn) {
        // If it's black's turn, the first move is black's move
        if (i % 2 === 0) {
          // Black move - only show move number with dots for the very first move
          if (i === 0) {
            result += `${currentMoveNum}...${moves[i]}`;
          } else {
            result += ` ${moves[i]}`;
          }
        } else {
          // White move (second move)
          result += ` ${currentMoveNum + 1}.${moves[i]}`;
        }
      } else {
        // If it's white's turn, the first move is white's move
        if (i % 2 === 0) {
          // White move (first move)
          result += `${currentMoveNum}.${moves[i]}`;
        } else {
          // Black move (second move)
          result += ` ${moves[i]}`;
        }
      }

      // Increment move number after every second move (complete move pair)
      if (i % 2 === 1) {
        currentMoveNum++;
      }

      // Add line breaks every 6 moves (3 full moves)
      if ((i + 1) % 6 === 0 && i < moves.length - 1) {
        result += "\n";
      } else if (i < moves.length - 1) {
        result += " ";
      }
    }
    return result;
  }
};

// Debounce mechanism for analysis updates
let analysisUpdateTimeout: number | null = null;
let queuedMoves: AnalysisMove[] = [];

/**
 * Update results panel
 */
const updateResultsPanel = (moves: AnalysisMove[]): void => {
  queuedMoves = moves;
  if (analysisUpdateTimeout) {
    return;
  }

  // Debounce the update to prevent rapid changes
  analysisUpdateTimeout = setTimeout(
    () => actuallyUpdateResultsPanel(queuedMoves),
    100,
  ); // 100ms debounce delay
};

const actuallyUpdateResultsPanel = (moves: AnalysisMove[]): void => {
  analysisUpdateTimeout = null;

  const resultsPanel = document.getElementById("analysis-results");
  if (!resultsPanel) return;

  // Clear existing arrows
  Board.hideMoveArrow();

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

  // Sort mate lines by score (best mate first)
  mateLines.sort((a, b) => b.score - a.score);

  // Sort non-mate lines by depth (descending), then by score (descending), then by multipv
  nonMateLines.sort((a, b) => {
    // For score comparison, use shared logic
    const scoreComparison = compareAnalysisMoves(a, b);
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
  const resultsSection = document.querySelector(".results-section");
  if (resultsSection) {
    // Remove any existing status indicator
    const existingStatus = resultsSection.querySelector(".analysis-status");
    if (existingStatus) {
      existingStatus.remove();
    }

    // Create new status indicator
    const statusIndicator = document.createElement("div");
    statusIndicator.className = "analysis-status";

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
        ...visibleMatingMoves.map((move: AnalysisMove) => move.depth),
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
    const resultsPanel = resultsSection.querySelector("#analysis-results");

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
    const score =
      move.score > 0 ? `+${move.score / 100}` : `${move.score / 100}`;
    const pv = formatPVWithEffects(
      move.pv,
      Board.getFEN(),
      notationType,
      pieceType,
    );

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
      </div>
      <div class="move-details">
        <div class="move-pv" title="Principal variation">${pv}</div>
      </div>
    `;

    moveItem.querySelector(".move-header")?.addEventListener("click", () => {
      handleMakeEngineMove(move);
    });

    resultsPanel.appendChild(moveItem);
  });

  // Add arrows for each displayed analysis result
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
      );
    }
  });

  addMoveHoverListeners();
  addPVClickListeners();
};

/**
 * Make a move from analysis results
 */
const makeAnalysisMove = (move: ChessMove): void => {
  console.log("makeAnalysisMove called with:", move);

  // Determine move effects if not already present
  if (!move.effect) {
    const position = parseFEN(Board.getFEN());
    const validationResult = validateMove(position, move);
    if (validationResult.isValid) {
      move.effect = validationResult.effect;
    }
  }

  // Add the move to the game history
  addMove(move);

  // Update the board position
  const newFEN = applyMoveToFEN(Board.getFEN(), move);
  Board.setPosition(newFEN);

  // Update UI controls
  updateFENInput();
  updateControlsFromPosition();

  // Update move list and navigation
  updateMoveList();
  updateNavigationButtons();

  // Clear any existing move highlights
  clearLastMoveHighlight();

  // Highlight the new move
  highlightLastMove(move);

  // Evaluate the new position
  resetPositionEvaluation();

  updateStatus(`Made move: ${move.from}${move.to}`);
};

/**
 * Update status message
 */
const updateStatus = (message: string): void => {
  const statusElement = document.getElementById("engine-status");
  if (statusElement) {
    statusElement.textContent = message;
  }
};

// ============================================================================
// MOVE HOVER EVENTS
// ============================================================================

/**
 * Initialize move hover events
 */
const initializeMoveHoverEvents = (): void => {
  addMoveHoverListeners();
};

/**
 * Add move hover listeners
 */
const addMoveHoverListeners = (): void => {
  // No longer needed since arrows are always shown for analysis results
  // This function is kept for potential future use with game moves
};

/**
 * Create a branch from the current position
 */
const createBranch = (
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
const clearBranch = (): void => {
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
 * Add PV move click listeners
 */
const addPVClickListeners = (): void => {
  // Use event delegation on the results panel
  const resultsPanel = document.getElementById("analysis-results");
  if (!resultsPanel) return;

  // Remove any existing listeners to prevent duplicates
  resultsPanel.removeEventListener("click", handlePVClick);

  // Add the event listener
  resultsPanel.addEventListener("click", handlePVClick);
};

const handlePVClick = (e: Event): void => {
  const target = e.target as HTMLElement;

  console.log("Event delegation caught click on:", target);

  // Check if the clicked element is a PV move
  if (!target.classList.contains("pv-move")) {
    console.log("Not a PV move, ignoring");
    return;
  }

  console.log("PV move clicked, processing...");

  e.preventDefault();
  e.stopPropagation(); // Prevent triggering the parent move-item click
  e.stopImmediatePropagation(); // Prevent any other handlers from executing

  const originalPosition = target.dataset.originalPosition;
  const moveIndex = target.dataset.moveIndex;

  console.log("PV click detected:", { originalPosition, moveIndex });

  if (originalPosition && moveIndex !== undefined) {
    // Get the PV moves from the current analysis results
    const appState = getAppState();
    console.log("Current appState before processing:", appState);
    const currentResults = appState.currentResults;

    if (currentResults && currentResults.moves.length > 0) {
      // Find the analysis result that matches the clicked move
      const clickedIndex = parseInt(moveIndex);
      const clickedMoveFrom = target.dataset.moveFrom;
      const clickedMoveTo = target.dataset.moveTo;

      console.log("Looking for analysis result:", {
        clickedIndex,
        clickedMove: `${clickedMoveFrom}${clickedMoveTo}`,
        totalResults: currentResults.moves.length,
      });

      // Find the analysis result that contains this specific move
      let matchingResult = null;
      for (let i = 0; i < currentResults.moves.length; i++) {
        const result = currentResults.moves[i];
        if (result.pv && result.pv.length > clickedIndex) {
          const pvMove = result.pv[clickedIndex];
          if (pvMove.from === clickedMoveFrom && pvMove.to === clickedMoveTo) {
            matchingResult = result;
            break;
          }
        }
      }

      if (!matchingResult) {
        console.error(
          "Could not find matching analysis result for clicked move",
        );
        return;
      }

      // Use the PV moves from the matching result
      const pvMoves = matchingResult.pv;

      console.log("Found matching result:", {
        resultIndex: currentResults.moves.indexOf(matchingResult),
        pvLength: pvMoves.length,
        clickedIndex,
        pvMoves: pvMoves.map((m: ChessMove) => `${m.from}${m.to}`),
      });

      console.log("PV click processing:", {
        clickedIndex,
        isInBranch: appState.isInBranch,
      });

      console.log("PV moves check:", {
        pvMoves: pvMoves ? pvMoves.length : null,
        clickedIndex,
        condition: pvMoves && clickedIndex < pvMoves.length,
      });

      // If clickedIndex is out of bounds, limit it to the available moves
      const validClickedIndex = pvMoves
        ? Math.min(clickedIndex, pvMoves.length - 1)
        : 0;

      console.log("Valid clicked index:", validClickedIndex);

      if (pvMoves && validClickedIndex >= 0) {
        const appState = getAppState();
        const isAtLastMove =
          appState.currentMoveIndex === appState.moves.length - 1;

        // Always create or update a branch, regardless of position
        const movesAfterCurrent = pvMoves.slice(0, validClickedIndex + 1);

        console.log("Branch logic:", {
          isInBranch: appState.isInBranch,
          movesAfterCurrent,
        });

        if (appState.isInBranch) {
          // Update existing branch
          console.log("Updating existing branch");
          updateAppState({
            branchMoves: movesAfterCurrent,
          });
          updateMoveList();
        } else {
          // Create new branch with the original position
          console.log("Creating new branch");
          createBranch(movesAfterCurrent, originalPosition);
          console.log("createBranch completed, calling updateMoveList");
          updateMoveList();
        }

        console.log("After branch logic, appState:", getAppState());

        // Apply all moves up to and including the clicked move
        let currentFEN = originalPosition;
        for (let i = 0; i <= validClickedIndex; i++) {
          const move = pvMoves[i];
          currentFEN = applyMoveToFEN(currentFEN, move);
        }

        // Set the board to this position
        Board.setPosition(currentFEN);

        // Update the FEN input
        updateFENInput();

        // Highlight the last move in the branch
        if (validClickedIndex >= 0) {
          highlightLastMove(pvMoves[validClickedIndex]);
        }

        console.log("After all updates, final appState:", getAppState());
      }
    }
  }
};

/**
 * Handle click on main move notation in Engine Moves results
 */
const handleMakeEngineMove = (move: AnalysisMove): void => {
  console.log("Main move clicked:", move);

  const appState = getAppState();
  const currentFEN = Board.getFEN();

  // Check if we're at the last move of the game
  const isAtLastMove = appState.currentMoveIndex === appState.moves.length - 1;

  if (isAtLastMove) {
    // If we're at the last move, just make the move directly
    console.log("At last move, making move directly");
    makeAnalysisMove(move.move);
  } else {
    // If we're not at the last move, create a branch
    console.log("Not at last move, creating branch");
    createBranch([move.move], currentFEN);
    updateMoveList();

    // Apply the move to the board
    const newFEN = applyMoveToFEN(currentFEN, move.move);
    Board.setPosition(newFEN);

    // Update UI
    updateFENInput();
    updateControlsFromPosition();
    highlightLastMove(move.move);
  }
};

// ============================================================================
// FEN MANAGEMENT
// ============================================================================

/**
 * Update FEN input field
 */
const updateFENInput = (): void => {
  const fenInput = getInputElement("fen-input");
  if (fenInput) {
    const boardFEN = Board.getFEN();
    const appState = getAppState();
    const position = Board.getPosition();
    fenInput.value = getFENWithCorrectMoveCounter(
      boardFEN,
      appState.currentMoveIndex,
      position.castling,
      position.enPassant,
    );
  }
  clearInitiatorMoveInputs();
};

/**
 * Update controls from current position
 */
const updateControlsFromPosition = (): void => {
  const position = Board.getPosition();
  const { turn, castling, enPassant } = position;

  // Update current player
  const whiteRadio = getCheckedRadio("current-player", "w");
  const blackRadio = getCheckedRadio("current-player", "b");

  if (whiteRadio && blackRadio) {
    if (turn === "w") {
      whiteRadio.checked = true;
    } else {
      blackRadio.checked = true;
    }
  }

  // Update castling rights
  const whiteKingside = getInputElement("white-kingside");
  const whiteQueenside = getInputElement("white-queenside");
  const blackKingside = getInputElement("black-kingside");
  const blackQueenside = getInputElement("black-queenside");

  if (whiteKingside) whiteKingside.checked = castling.includes("K");
  if (whiteQueenside) whiteQueenside.checked = castling.includes("Q");
  if (blackKingside) blackKingside.checked = castling.includes("k");
  if (blackQueenside) blackQueenside.checked = castling.includes("q");

  // Update en passant
  const enPassantInput = getInputElement("en-passant");
  if (enPassantInput) {
    enPassantInput.value =
      enPassant === null || enPassant === "-" ? "" : enPassant;
  }
};

/**
 * Update position from controls
 */
const updatePositionFromControls = (): void => {
  // Get current player
  const whiteRadio = getCheckedRadio("current-player", "w");
  const turn = whiteRadio?.checked ? "w" : "b";

  // Get castling rights
  const whiteKingside = getInputElement("white-kingside");
  const whiteQueenside = getInputElement("white-queenside");
  const blackKingside = getInputElement("black-kingside");
  const blackQueenside = getInputElement("black-queenside");

  let castling = "";
  if (whiteKingside?.checked) castling += "K";
  if (whiteQueenside?.checked) castling += "Q";
  if (blackKingside?.checked) castling += "k";
  if (blackQueenside?.checked) castling += "q";
  if (!castling) castling = "-";

  // Get en passant
  const enPassantInput = getInputElement("en-passant");
  const enPassant = enPassantInput?.value || "-";

  // Construct new FEN
  const currentFEN = Board.getFEN();
  const fenParts = currentFEN.split(" ");
  const newFEN = `${fenParts[0]} ${turn} ${castling} ${enPassant} ${fenParts[4]} ${fenParts[5]}`;

  // Update state and board
  updateAppState({
    initialFEN: newFEN,
    moves: [],
    currentMoveIndex: -1,
  });
  Board.setPosition(newFEN);
  updateMoveList();
  updateNavigationButtons();
};

// ============================================================================
// GAME MANAGEMENT
// ============================================================================

/**
 * Add move to game history
 */
const addMove = (move: ChessMove): void => {
  // Determine move effects if not already present
  if (!move.effect) {
    const position = parseFEN(Board.getFEN());
    const validationResult = validateMove(position, move);
    if (validationResult.isValid) {
      move.effect = validationResult.effect;
    }
  }

  updateAppState({
    moves: [...appState.moves, move],
    currentMoveIndex: appState.moves.length,
  });
  updateMoveList();
  updateNavigationButtons();
  highlightLastMove(move);

  // Update FEN input and controls to reflect the board's current position
  // (not the move list, since the board has already been updated)
  updateFENInput();
  updateControlsFromPosition();

  // Evaluate the new position
  resetPositionEvaluation();
};

/**
 * Import game from notation
 */
const importGame = (notation: string): void => {
  console.log("Importing game:", notation);

  // Reset game state
  updateAppState({
    moves: [],
    currentMoveIndex: -1,
  });

  // Parse moves
  const moves = parseGameNotation(notation);
  updateAppState({ moves });
  updateMoveList();
  updateNavigationButtons();

  // Set board to initial position
  Board.setPosition(appState.initialFEN);

  // Apply all moves to get to the final position
  let currentFEN = appState.initialFEN;
  for (const move of moves) {
    currentFEN = applyMoveToFEN(currentFEN, move);
  }
  Board.setPosition(currentFEN);

  console.log("Game import complete, parsed moves:", moves);

  // Evaluate the final position
  resetPositionEvaluation();
};

/**
 * Parse game notation into moves
 */
const parseGameNotation = (notation: string): ChessMove[] => {
  // Clean the notation
  let cleanNotation = notation
    .replace(/\{[^}]*\}/g, "") // Remove comments
    .replace(/\([^)]*\)/g, "") // Remove annotations
    .replace(/\$\d+/g, "") // Remove evaluation symbols
    .replace(/[!?]+/g, "") // Remove move annotations
    .replace(/\d+\./g, "") // Remove move numbers
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();

  console.log("Cleaned notation:", cleanNotation);

  const moves: ChessMove[] = [];
  const tokens = cleanNotation.split(/\s+/);

  // Apply moves sequentially to maintain board context
  let currentFEN = appState.initialFEN;

  for (const token of tokens) {
    if (
      !token ||
      token === "1-0" ||
      token === "0-1" ||
      token === "1/2-1/2" ||
      token === "*"
    ) {
      continue;
    }

    const move = parseMove(token, currentFEN);
    if (move) {
      // Determine move effects using the move validator
      const position = parseFEN(currentFEN);
      const validationResult = validateMove(position, move);

      if (validationResult.isValid) {
        // Add effect information to the move
        move.effect = validationResult.effect;
        moves.push(move);
        // Apply move to current FEN for next iteration
        currentFEN = applyMoveToFEN(currentFEN, move);
      } else {
        console.warn(
          "Invalid move during parsing:",
          token,
          validationResult.error,
        );
      }
    }
  }

  return moves;
};

/**
 * Parse individual move
 */
const parseMove = (moveText: string, currentFEN: string): ChessMove | null => {
  log("Parsing move:", moveText, "from FEN:", currentFEN);

  const position = parseFEN(currentFEN);
  const isWhiteTurn = position.turn === PLAYER_COLORS.WHITE;

  // Handle castling
  if (moveText === "O-O" || moveText === "0-0") {
    if (isWhiteTurn) {
      return {
        from: "e1",
        to: "g1",
        piece: PIECES.WHITE_KING,
        special: "castling",
        rookFrom: "h1",
        rookTo: "f1",
      };
    } else {
      return {
        from: "e8",
        to: "g8",
        piece: PIECES.BLACK_KING,
        special: "castling",
        rookFrom: "h8",
        rookTo: "f8",
      };
    }
  }
  if (moveText === "O-O-O" || moveText === "0-0-0") {
    if (isWhiteTurn) {
      return {
        from: "e1",
        to: "c1",
        piece: PIECES.WHITE_KING,
        special: "castling",
        rookFrom: "a1",
        rookTo: "d1",
      };
    } else {
      return {
        from: "e8",
        to: "c8",
        piece: PIECES.BLACK_KING,
        special: "castling",
        rookFrom: "a8",
        rookTo: "d8",
      };
    }
  }

  // Handle pawn moves (both white and black)
  if (moveText.match(/^[a-h][1-8]$/)) {
    // Simple pawn move
    const toSquare = moveText;
    const piece = isWhiteTurn ? PIECES.WHITE_PAWN : PIECES.BLACK_PAWN;
    const fromSquare = findFromSquare(piece, toSquare, currentFEN);
    if (fromSquare) {
      return { from: fromSquare, to: toSquare, piece };
    }
  }

  // Handle pawn captures (both white and black)
  if (moveText.match(/^[a-h]x[a-h][1-8]$/)) {
    const fromFile = moveText[0];
    const toSquare = moveText.substring(2);
    const piece = isWhiteTurn ? PIECES.WHITE_PAWN : PIECES.BLACK_PAWN;
    const fromSquare = findFromSquare(piece, toSquare, currentFEN);
    if (fromSquare) {
      return { from: fromSquare, to: toSquare, piece };
    }
  }

  // Handle piece moves
  const pieceMatch = moveText.match(
    /^([KQRBN])([a-h]?[1-8]?)?x?([a-h][1-8])([+#])?$/,
  );
  if (pieceMatch) {
    const pieceType = pieceMatch[1];
    const disambiguation = pieceMatch[2] || "";
    const toSquare = pieceMatch[3];
    const pieceNotation = createPieceNotation(
      isWhiteTurn ? pieceType : pieceType.toLowerCase(),
    );
    const fromSquare = findFromSquareWithDisambiguation(
      pieceNotation,
      toSquare,
      disambiguation,
      currentFEN,
    );
    if (fromSquare) {
      const piece = isWhiteTurn ? pieceType : pieceType.toLowerCase();
      return { from: fromSquare, to: toSquare, piece };
    }
  }

  console.log("Failed to parse move:", moveText);
  return null;
};

/**
 * Navigate to previous move
 */
const previousMove = (): void => {
  if (appState.currentMoveIndex > -1) {
    const newIndex = appState.currentMoveIndex - 1;
    updateAppState({ currentMoveIndex: newIndex });
    applyMovesUpToIndex(newIndex);
    updateNavigationButtons();
    updateFENInput();
    updateControlsFromPosition();
    resetPositionEvaluation();
  }
};

/**
 * Navigate to next move
 */
const nextMove = (): void => {
  if (appState.currentMoveIndex < appState.moves.length - 1) {
    const newIndex = appState.currentMoveIndex + 1;
    updateAppState({ currentMoveIndex: newIndex });
    applyMovesUpToIndex(newIndex);
    updateNavigationButtons();
    updateFENInput();
    updateControlsFromPosition();
    resetPositionEvaluation();
  }
};

/**
 * Navigate to a specific move index
 */
const navigateToMove = (moveIndex: number): void => {
  if (moveIndex < -1 || moveIndex >= appState.moves.length) {
    return;
  }

  // Clear any existing branch
  clearBranch();

  // Update the current move index
  updateAppState({ currentMoveIndex: moveIndex });

  // Apply moves up to the specified index
  applyMovesUpToIndex(moveIndex);

  // Update the move list to reflect the new current position
  updateMoveList();
  updateNavigationButtons();

  // Evaluate the new position
  resetPositionEvaluation();

  updateStatus(`Navigated to move ${moveIndex + 1}`);
};

/**
 * Apply moves up to specified index
 */
const applyMovesUpToIndex = (index: number): void => {
  // Reset to initial position
  Board.setPosition(appState.initialFEN);

  // Apply moves up to index
  let currentFEN = appState.initialFEN;
  for (let i = 0; i <= index && i < appState.moves.length; i++) {
    const move = appState.moves[i];
    currentFEN = applyMoveToFEN(currentFEN, move);
  }

  Board.setPosition(currentFEN);
  updateMoveList();
  updateFENInput();
  updateControlsFromPosition();

  // Highlight last move if there is one
  if (index >= 0 && index < appState.moves.length) {
    highlightLastMove(appState.moves[index]);
  } else {
    clearLastMoveHighlight();
  }
};

/**
 * Highlight the last move on the board
 */
const highlightLastMove = (move: ChessMove): void => {
  // Clear previous highlights
  clearLastMoveHighlight();

  // Add highlights for the last move
  const fromSquare = document.querySelector(`[data-square="${move.from}"]`);
  const toSquare = document.querySelector(`[data-square="${move.to}"]`);

  if (fromSquare) {
    fromSquare.classList.add("last-move-from");
  }
  if (toSquare) {
    toSquare.classList.add("last-move-to");
  }
};

/**
 * Clear last move highlight
 */
const clearLastMoveHighlight = (): void => {
  Board.clearLastMoveHighlight();
};

/**
 * Update move list display
 */
const updateMoveList = (): void => {
  const movesPanel = document.getElementById("game-moves");
  if (!movesPanel) return;

  // Get current format settings
  const notationFormat =
    getCheckedRadioByName("notation-format")?.value || "algebraic-short";
  const pieceFormat = getCheckedRadioByName("piece-format")?.value || "symbols";

  // Convert format values to match moveToNotation parameters
  const notationType = notationFormat === "algebraic-short" ? "short" : "long";
  const pieceType = pieceFormat === "symbols" ? "unicode" : "english";

  movesPanel.innerHTML = "";

  // Display main game moves
  for (let i = 0; i < appState.moves.length; i += 2) {
    const moveEntry = document.createElement("div");
    moveEntry.className = "move-entry";

    const moveNumber = Math.floor(i / 2) + 1;
    const whiteMove = appState.moves[i];
    const blackMove = appState.moves[i + 1];

    // Create clickable move elements
    const whiteMoveElement = document.createElement("span");
    whiteMoveElement.className = `move-text clickable ${i === appState.currentMoveIndex ? "current-move" : ""}`;
    whiteMoveElement.textContent = whiteMove
      ? moveToNotation(whiteMove, notationType, pieceType, "")
      : "...";
    whiteMoveElement.dataset.moveIndex = i.toString();
    whiteMoveElement.title = "Click to go to this position";

    const blackMoveElement = document.createElement("span");
    blackMoveElement.className = `move-text clickable ${i + 1 === appState.currentMoveIndex ? "current-move" : ""}`;
    blackMoveElement.textContent = blackMove
      ? moveToNotation(blackMove, notationType, pieceType, "")
      : "";
    blackMoveElement.dataset.moveIndex = (i + 1).toString();
    blackMoveElement.title = "Click to go to this position";

    // Add click handlers
    whiteMoveElement.addEventListener("click", () => {
      if (whiteMove) {
        clearBranch();
        navigateToMove(i);
      }
    });

    blackMoveElement.addEventListener("click", () => {
      if (blackMove) {
        clearBranch();
        navigateToMove(i + 1);
      }
    });

    moveEntry.innerHTML = `<span class="move-number">${moveNumber}.</span>`;
    moveEntry.appendChild(whiteMoveElement);
    moveEntry.appendChild(blackMoveElement);

    movesPanel.appendChild(moveEntry);

    // Display branch moves if this is where the branch should appear
    const isAtWhiteMove = appState.branchStartIndex % 2 === 0;
    const isAtBlackMove = appState.branchStartIndex % 2 === 1;

    log("Branch display check:", {
      i,
      branchStartIndex: appState.branchStartIndex,
      isInBranch: appState.isInBranch,
      branchMovesLength: appState.branchMoves.length,
      isAtWhiteMove,
      isAtBlackMove,
      shouldDisplay:
        appState.isInBranch &&
        appState.branchMoves.length > 0 &&
        ((isAtWhiteMove && i === appState.branchStartIndex) ||
          (isAtBlackMove &&
            i === Math.floor(appState.branchStartIndex / 2) * 2)),
    });

    if (
      appState.isInBranch &&
      appState.branchMoves.length > 0 &&
      i === appState.currentMoveIndex
    ) {
      const branchEntry = document.createElement("div");
      branchEntry.className = "branch-entry";
      branchEntry.style.marginLeft = "12px";
      branchEntry.style.marginRight = "-12px"; // tbh, i dunno why specifically -12 but this does prevent a horizontal scrollbar.
      branchEntry.style.position = "relative";
      branchEntry.style.borderLeft = "2px solid #007bff";
      branchEntry.style.paddingLeft = "10px";
      branchEntry.style.boxSizing = "border-box";

      // Determine the starting move number for the branch
      const currentMoveNumber = Math.floor(appState.branchStartIndex / 2) + 1;

      if (isAtWhiteMove) {
        // At a white move - create branch at same move number
        const moveNumberSpan = document.createElement("span");
        moveNumberSpan.className = "move-number";
        moveNumberSpan.textContent = `${currentMoveNumber}.`;
        branchEntry.appendChild(moveNumberSpan);

        // Add "..." for the white move (since we're branching from it)
        const whitePlaceholder = document.createElement("span");
        whitePlaceholder.className = "move-text";
        whitePlaceholder.textContent = "...";
        branchEntry.appendChild(whitePlaceholder);

        // Add all branch moves
        for (let i = 0; i < appState.branchMoves.length; i += 2) {
          const branchMoveNumber = currentMoveNumber + Math.floor(i / 2);

          // Add black move
          if (i < appState.branchMoves.length) {
            const blackMove = appState.branchMoves[i];
            const blackMoveElement = document.createElement("span");
            blackMoveElement.className = "move-text clickable branch-move";
            blackMoveElement.textContent = moveToNotation(
              blackMove,
              notationType,
              pieceType,
              "",
            );
            blackMoveElement.title = "Branch move";
            branchEntry.appendChild(blackMoveElement);
          }

          // Add white move
          if (i + 1 < appState.branchMoves.length) {
            const whiteMove = appState.branchMoves[i + 1];
            const whiteMoveElement = document.createElement("span");
            whiteMoveElement.className = "move-text clickable branch-move";
            // Add move number for all white moves in the branch
            const moveNumberText = ` ${branchMoveNumber + 1}.`;
            whiteMoveElement.textContent = `${moveNumberText}${moveToNotation(
              whiteMove,
              notationType,
              pieceType,
              "",
            )}`;
            whiteMoveElement.title = "Branch move";
            branchEntry.appendChild(whiteMoveElement);
          }
        }
      } else if (isAtBlackMove) {
        // At a black move - create branch under the current move
        const moveNumberSpan = document.createElement("span");
        moveNumberSpan.className = "move-number";
        moveNumberSpan.textContent = `${currentMoveNumber + 1}.`;
        branchEntry.appendChild(moveNumberSpan);

        // Add all branch moves
        for (let i = 0; i < appState.branchMoves.length; i += 2) {
          const branchMoveNumber = currentMoveNumber + Math.floor(i / 2);

          // Add white move
          if (i < appState.branchMoves.length) {
            const whiteMove = appState.branchMoves[i];
            const whiteMoveElement = document.createElement("span");
            whiteMoveElement.className = "move-text clickable branch-move";
            // Add move number for all white moves in the branch
            const moveNumberText = ` ${branchMoveNumber + 1}.`;
            whiteMoveElement.textContent = `${moveNumberText}${moveToNotation(
              whiteMove,
              notationType,
              pieceType,
              "",
            )}`;
            whiteMoveElement.title = "Branch move";
            branchEntry.appendChild(whiteMoveElement);
          }

          // Add black move
          if (i + 1 < appState.branchMoves.length) {
            const blackMove = appState.branchMoves[i + 1];
            const blackMoveElement = document.createElement("span");
            blackMoveElement.className = "move-text clickable branch-move";
            blackMoveElement.textContent = moveToNotation(
              blackMove,
              notationType,
              pieceType,
              "",
            );
            blackMoveElement.title = "Branch move";
            branchEntry.appendChild(blackMoveElement);
          }
        }
      }

      movesPanel.appendChild(branchEntry);
    }
  }
};

/**
 * Update navigation buttons
 */
const updateNavigationButtons = (): void => {
  const prevBtn = getButtonElement("prev-move");
  const nextBtn = getButtonElement("next-move");

  if (prevBtn) {
    prevBtn.disabled = appState.currentMoveIndex <= -1;
  }
  if (nextBtn) {
    nextBtn.disabled = appState.currentMoveIndex >= appState.moves.length - 1;
  }
};

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

export {
  // Initialization
  initializeApp,

  // State management
  getAppState,
  updateAppState,

  // Analysis
  startAnalysis,
  stopAnalysis,

  // Game management
  addMove,
  importGame,
  previousMove,
  nextMove,

  // UI updates
  updateResults,
  updateStatus,
  updateMoveList,
  updateNavigationButtons,

  // Move highlighting
  highlightLastMove,
  clearLastMoveHighlight,
};

// ============================================================================
// TREE DIGGER DOM MANAGEMENT
// ============================================================================

/**
 * Interface for tracking DOM elements associated with tree nodes
 */
interface TreeNodeDOM {
  element: HTMLElement;
  childrenContainer?: HTMLElement;
  nodeId: string;
}

/**
 * Map to track DOM elements for tree nodes
 */
const treeNodeDOMMap = new Map<string, TreeNodeDOM>();

/**
 * Clear all tracked DOM elements
 */
const clearTreeNodeDOMMap = (): void => {
  treeNodeDOMMap.clear();
};

/**
 * Debug function to log tree structure
 */
const logTreeStructure = (nodes: BestLineNode[], depth: number = 0): void => {
  for (const node of nodes) {
    const indent = "  ".repeat(depth);
    const moveText = moveToNotation(node.move);
    const parentText = node.parent
      ? ` (parent: ${moveToNotation(node.parent.move)})`
      : " (root)";
    console.log(
      `${indent}${moveText}${parentText} [${node.children.length} children]`,
    );

    if (node.children.length > 0) {
      logTreeStructure(node.children, depth + 1);
    }
  }
};

/**
 * Debug function to verify DOM structure matches data structure
 */
const verifyDOMStructure = (
  container: HTMLElement,
  nodes: BestLineNode[],
  depth: number = 0,
): void => {
  const domNodes = Array.from(container.children) as HTMLElement[];

  if (domNodes.length !== nodes.length) {
    console.log(
      `Depth ${depth}: DOM has ${domNodes.length} nodes, data has ${nodes.length} nodes`,
    );
  }

  // Check all nodes at this level
  for (let i = 0; i < Math.max(domNodes.length, nodes.length); i++) {
    if (i < domNodes.length && i < nodes.length) {
      const domNode = domNodes[i];
      const dataNode = nodes[i];
      const nodeId = generateNodeId(dataNode);
      const domNodeId = domNode.getAttribute("data-node-id");

      if (domNodeId !== nodeId) {
        console.log(
          `  Node ${i}: DOM ID: ${domNodeId}, Data ID: ${nodeId}, Match: false`,
        );
      }

      // Check children
      const childrenContainer = domNode.querySelector(".tree-children");
      if (childrenContainer && dataNode.children.length > 0) {
        verifyDOMStructure(
          childrenContainer as HTMLElement,
          dataNode.children,
          depth + 1,
        );
      }
    } else if (i < nodes.length) {
      console.log(
        `  Node ${i}: Missing in DOM, Data ID: ${generateNodeId(nodes[i])}`,
      );
    } else {
      console.log(
        `  Node ${i}: Extra in DOM, DOM ID: ${domNodes[i].getAttribute("data-node-id")}`,
      );
    }
  }
};

/**
 * Count total nodes in the tree recursively
 */
const countTotalNodes = (nodes: BestLineNode[]): number => {
  let count = 0;
  const countRecursive = (nodeList: BestLineNode[]): void => {
    for (const node of nodeList) {
      count++;
      if (node.children.length > 0) {
        countRecursive(node.children);
      }
    }
  };
  countRecursive(nodes);
  return count;
};

// Initialize copy button functionality
const initializeCopyButton = (): void => {
  const copyBtn = document.getElementById("copy-tree-digger-tree");
  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      const analysis = BestLines.getCurrentAnalysis();
      if (analysis && analysis.nodes.length > 0) {
        const treeText = generateAllLines(analysis.nodes);

        // Debug: Log the generated text to see if it's complete
        console.log("Generated tree text:", treeText);
        console.log("Text length:", treeText.length);
        console.log("Number of lines:", treeText.split("\n").length);

        navigator.clipboard
          .writeText(treeText)
          .then(() => {
            copyBtn.textContent = "Copied!";
            setTimeout(() => {
              copyBtn.textContent = "Copy";
            }, 2000);
          })
          .catch((err) => {
            console.error("Failed to copy: ", err);
            copyBtn.textContent = "Copy Failed";
            setTimeout(() => {
              copyBtn.textContent = "Copy";
            }, 2000);
          });
      } else {
        // Show a short confirmation for no data
        const toast = document.createElement("div");
        toast.textContent = "No tree to copy!";
        toast.style.position = "fixed";
        toast.style.bottom = "24px";
        toast.style.left = "50%";
        toast.style.transform = "translateX(-50%)";
        toast.style.background = "#dc3545";
        toast.style.color = "#fff";
        toast.style.padding = "8px 16px";
        toast.style.borderRadius = "6px";
        toast.style.zIndex = "9999";
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 1200);
      }
    });
  }
};

// Add debugging for tree digger initialization
const debugTreeDiggerStart = (): void => {
  console.log("=== Tree Digger Debug Info ===");
  console.log("Current board FEN:", Board.getFEN());
  console.log("Current move index:", getGlobalCurrentMoveIndex());
  console.log("Board position:", Board.getPosition());

  const analysis = BestLines.getCurrentAnalysis();
  if (analysis) {
    console.log("Analysis root FEN:", analysis.rootFen);
    console.log("Analysis nodes count:", analysis.nodes.length);
    console.log("Analysis max depth:", analysis.maxDepth);
    console.log("Analysis config:", analysis.config);
  } else {
    console.log("No current analysis found");
  }
  console.log("=== End Debug Info ===");
};

// 2. Function to generate all complete lines from the tree
function generateAllLines(nodes: BestLineNode[]): string {
  let result = "";
  let lineCount = 0;

  const traverseNode = (
    node: BestLineNode,
    currentLine: BestLineNode[] = [],
  ): void => {
    // Add current node to the line
    const newLine = [...currentLine, node];

    if (node.children.length === 0) {
      // Check if this is a transposed node (not a real leaf)
      const positionAfterMove = applyMoveToFEN(node.fen, node.move);
      const analysis = BestLines.getCurrentAnalysis();
      const isTransposition =
        analysis && analysis.analyzedPositions.has(positionAfterMove);

      if (!isTransposition) {
        // This is a real leaf node - output the complete line
        const lineText = formatLineWithMoveNumbers(newLine);
        result += `${lineText}\n`;
        lineCount++;
        console.log(`Generated line ${lineCount}:`, lineText);
      } else {
        console.log(`Skipping transposed node: ${moveToNotation(node.move)}`);
      }
    } else {
      // Continue traversing children
      for (const child of node.children) {
        traverseNode(child, newLine);
      }
    }
  };

  // Traverse all root nodes
  for (const rootNode of nodes) {
    traverseNode(rootNode);
  }

  console.log(`Total lines generated: ${lineCount}`);
  return result;
}

/**
 * Clear initiator move inputs when board changes
 */
const clearInitiatorMoveInputs = (): void => {
  const initiatorMove1Input = document.getElementById(
    "tree-digger-initiator-move-1",
  ) as HTMLInputElement;
  const initiatorMove2Input = document.getElementById(
    "tree-digger-initiator-move-2",
  ) as HTMLInputElement;

  if (initiatorMove1Input) initiatorMove1Input.value = "";
  if (initiatorMove2Input) initiatorMove2Input.value = "";
};

/**
 * Update FEN input with current board position
 */

// Add this near the top-level of your main.ts (after DOMContentLoaded or in initializeApp)
function showMoveParseWarningToast(message: string): void {
  const toast = document.createElement("div");
  toast.textContent = message;
  toast.style.position = "fixed";
  toast.style.bottom = "64px";
  toast.style.left = "50%";
  toast.style.transform = "translateX(-50%)";
  toast.style.background = "#ff9800";
  toast.style.color = "#fff";
  toast.style.padding = "8px 16px";
  toast.style.borderRadius = "6px";
  toast.style.zIndex = "9999";
  toast.style.fontWeight = "bold";
  toast.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

window.addEventListener("move-parse-warning", (event: Event) => {
  const detail = (event as CustomEvent).detail;
  if (detail && detail.message) {
    showToast(detail.message, "#ff9800", 5000);
    // Highlight the relevant input(s)
    let found = false;
    if (detail.move) {
      // Try to find an input whose value matches the move
      const inputs = document.querySelectorAll(
        'input[type="text"], input[type="search"]',
      );
      inputs.forEach((input: Element) => {
        if ((input as HTMLInputElement).value.trim() === detail.move.trim()) {
          input.classList.add("input-invalid");
          found = true;
          // Remove on input/change
          input.addEventListener("input", function handler() {
            input.classList.remove("input-invalid");
            input.removeEventListener("input", handler);
          });
          // Remove after 2 seconds if not edited
          setTimeout(() => input.classList.remove("input-invalid"), 2000);
        }
      });
    }
    if (!found) {
      // Fallback: highlight all move inputs by id pattern
      const moveInputs = document.querySelectorAll(
        'input[id^="tree-digger-initiator-move"], input[id^="tree-digger-responder-move"]',
      );
      moveInputs.forEach((input: Element) => {
        input.classList.add("input-invalid");
        input.addEventListener("input", function handler() {
          input.classList.remove("input-invalid");
          input.removeEventListener("input", handler);
        });
        setTimeout(() => input.classList.remove("input-invalid"), 2000);
      });
    }
  }
});
