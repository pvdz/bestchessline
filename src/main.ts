import {
  ChessMove,
  AnalysisResult,
  ChessPosition,
  AnalysisOptions,
  AnalysisMove,
  NotationFormat,
  PieceFormat,
} from "./types.js";
import {
  moveToNotation,
  pvToNotation,
  parseFEN,
  toFEN,
  squareToCoords,
  coordsToSquare,
  log,
  logError,
  setLoggingEnabled,
  getInputElement,
  getTextAreaElement,
  getButtonElement,
  getCheckedRadio,
  getCheckedRadioByName,
  querySelector,
  isHTMLElement,
  querySelectorHTMLElementBySelector,
} from "./utils.js";
import * as Board from "./chess-board.js";
import * as Stockfish from "./stockfish-client.js";
import { validateMove } from "./move-validator.js";

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
};

/**
 * Update application state
 */
const updateAppState = (updates: Partial<AppState>): void => {
  appState = { ...appState, ...updates };
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
  });

  Board.setOnMoveMade((move) => {
    // Clear analysis arrows when a move is made on the board
    Board.hideMoveArrow();
    addMove(move);
  });

  // Initialize event listeners
  initializeEventListeners();
  initializeMoveHoverEvents();

  // Initialize controls from current board state
  updateControlsFromPosition();

  log("Application initialized successfully");
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
  const blackMovesInput = getInputElement("black-moves");
  const maxDepthInput = getInputElement("max-depth");
  const threadsInput = getInputElement("threads");

  [whiteMovesInput, blackMovesInput, maxDepthInput, threadsInput].forEach(
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

  updateAppState({ isAnalyzing: true });
  updateButtonStates();

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
  const blackMoves = getInputElement("black-moves")?.value || "5";

  // Force threads to 1 in fallback mode
  const threads = Stockfish.isFallbackMode()
    ? "1"
    : getInputElement("threads")?.value || "1";

  return {
    depth: parseInt(maxDepth),
    threads: parseInt(threads),
    multiPV: Math.max(parseInt(whiteMoves), parseInt(blackMoves)),
  };
};

/**
 * Update button states
 */
const updateButtonStates = (): void => {
  const startBtn = getButtonElement("start-analysis");
  const stopBtn = getButtonElement("stop-analysis");

  if (startBtn) startBtn.disabled = appState.isAnalyzing;
  if (stopBtn) stopBtn.disabled = !appState.isAnalyzing;
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
  const isBlackTurn = parsedPosition.turn === "b";

  // Get current game state to determine starting move number
  const appState = getAppState();
  const currentMoveCount = appState.currentMoveIndex + 1; // +1 because currentMoveIndex is 0-based
  const currentMoveNumber = Math.floor(currentMoveCount / 2) + 1;

  // Process moves in the context of the actual position
  let currentPosition = parseFEN(position);
  const moves = pv.map((move, index) => {
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
  const targetDepth = getAnalysisOptions().depth;

  // First, separate mate lines from non-mate lines
  const mateLines = moves.filter((move) => Math.abs(move.score) >= 10000);
  const nonMateLines = moves.filter((move) => Math.abs(move.score) < 10000);

  // Sort mate lines by score (best mate first)
  mateLines.sort((a, b) => b.score - a.score);

  // Sort non-mate lines by depth (descending), then by score (descending), then by multipv
  nonMateLines.sort((a, b) => {
    if (b.depth !== a.depth) return b.depth - a.depth;
    if (b.score !== a.score) return b.score - a.score;
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
      (move) => Math.abs(move.score) < 10000,
    );
    const visibleMatingMoves = filteredMoves.filter(
      (move) => Math.abs(move.score) >= 10000,
    );

    let lowestDepth = 0;
    if (visibleNonMatingMoves.length > 0) {
      lowestDepth = Math.min(
        ...visibleNonMatingMoves.map((move) => move.depth),
      );
    } else if (visibleMatingMoves.length > 0) {
      lowestDepth = Math.max(...visibleMatingMoves.map((move) => move.depth));
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
      <div class="move-header">
        <span class="move-rank" title="Move rank">${rank}</span>
        <span class="move-notation" title="Move notation">${notation}</span>
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

    // Add click handler to make the move
    // Temporarily disabled to test PV click handling
    // moveItem.addEventListener("click", () => {
    //   makeAnalysisMove(move.move);
    // });

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
  console.trace("clearBranch stack trace");
  updateAppState({
    branchMoves: [],
    branchStartIndex: -1,
    isInBranch: false,
  });
  updateMoveList();
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
        pvMoves: pvMoves.map((m) => `${m.from}${m.to}`),
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

// ============================================================================
// FEN MANAGEMENT
// ============================================================================

/**
 * Update FEN input field
 */
const updateFENInput = (): void => {
  const fenInput = getInputElement("fen-input");
  if (fenInput) {
    fenInput.value = Board.getFEN();
  }
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

  console.log("Game import complete, parsed moves:", moves);
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
  const isWhiteTurn = position.turn === "w";

  // Handle castling
  if (moveText === "O-O" || moveText === "0-0") {
    if (isWhiteTurn) {
      return {
        from: "e1",
        to: "g1",
        piece: "K",
        special: "castling",
        rookFrom: "h1",
        rookTo: "f1",
      };
    } else {
      return {
        from: "e8",
        to: "g8",
        piece: "k",
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
        piece: "K",
        special: "castling",
        rookFrom: "a1",
        rookTo: "d1",
      };
    } else {
      return {
        from: "e8",
        to: "c8",
        piece: "k",
        special: "castling",
        rookFrom: "a8",
        rookTo: "d8",
      };
    }
  }

  // Handle pawn moves (both white and black)
  if (moveText.match(/^[a-h][2-7]$/)) {
    // Simple pawn move
    const toSquare = moveText;
    const fromSquare = findFromSquare("P", toSquare, currentFEN);
    if (fromSquare) {
      const piece = isWhiteTurn ? "P" : "p";
      return { from: fromSquare, to: toSquare, piece };
    }
  }

  // Handle pawn captures (both white and black)
  if (moveText.match(/^[a-h]x[a-h][2-7]$/)) {
    const fromFile = moveText[0];
    const toSquare = moveText.substring(2);
    const fromSquare = findFromSquare("P", toSquare, currentFEN);
    if (fromSquare) {
      const piece = isWhiteTurn ? "P" : "p";
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
    const fromSquare = findFromSquareWithDisambiguation(
      pieceType,
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
 * Find from square for a piece
 */
const findFromSquare = (
  piece: string,
  toSquare: string,
  currentFEN: string,
): string | null => {
  const position = parseFEN(currentFEN);
  const [toRank, toFile] = squareToCoords(toSquare);

  // Find all pieces of the given type
  const candidates: string[] = [];

  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const squarePiece = position.board[rank][file];
      if (squarePiece && squarePiece.toUpperCase() === piece) {
        // Check if piece color matches current turn
        const isWhitePiece = squarePiece === squarePiece.toUpperCase();
        const isWhiteTurn = position.turn === "w";
        if (isWhitePiece === isWhiteTurn) {
          const fromSquare = coordsToSquare(rank, file);
          if (canPieceMoveTo(fromSquare, toSquare, piece, position.board)) {
            candidates.push(fromSquare);
          }
        }
      }
    }
  }

  if (candidates.length === 1) {
    return candidates[0];
  } else if (candidates.length > 1) {
    return selectCorrectMove(candidates, toSquare, piece, position.board);
  }

  return null;
};

/**
 * Find from square with disambiguation
 */
const findFromSquareWithDisambiguation = (
  piece: string,
  toSquare: string,
  disambiguation: string,
  currentFEN: string,
): string | null => {
  const position = parseFEN(currentFEN);
  const [toRank, toFile] = squareToCoords(toSquare);

  // Find all pieces of the given type
  const candidates: string[] = [];

  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const squarePiece = position.board[rank][file];
      if (squarePiece && squarePiece.toUpperCase() === piece) {
        // Check if piece color matches current turn
        const isWhitePiece = squarePiece === squarePiece.toUpperCase();
        const isWhiteTurn = position.turn === "w";
        if (isWhitePiece === isWhiteTurn) {
          const fromSquare = coordsToSquare(rank, file);
          if (canPieceMoveTo(fromSquare, toSquare, piece, position.board)) {
            candidates.push(fromSquare);
          }
        }
      }
    }
  }

  // Apply disambiguation
  if (disambiguation) {
    const filtered = candidates.filter(
      (square) =>
        square.includes(disambiguation[0]) ||
        square.includes(disambiguation[1]),
    );
    if (filtered.length > 0) {
      candidates.splice(0, candidates.length, ...filtered);
    }
  }

  if (candidates.length === 1) {
    return candidates[0];
  } else if (candidates.length > 1) {
    return selectCorrectMove(candidates, toSquare, piece, position.board);
  }

  return null;
};

/**
 * Check if piece can move to destination
 */
const canPieceMoveTo = (
  fromSquare: string,
  toSquare: string,
  piece: string,
  board: string[][],
): boolean => {
  const [fromRank, fromFile] = squareToCoords(fromSquare);
  const [toRank, toFile] = squareToCoords(toSquare);

  // Check if destination is occupied by same color
  const fromPiece = board[fromRank][fromFile];
  const toPiece = board[toRank][toFile];
  if (
    toPiece &&
    (fromPiece.toUpperCase() === fromPiece) ===
      (toPiece.toUpperCase() === toPiece)
  ) {
    return false;
  }

  const pieceType = piece.toUpperCase();

  switch (pieceType) {
    case "P":
      return canPawnMoveTo(fromSquare, toSquare, board);
    case "R":
      return canRookMoveTo(fromSquare, toSquare, board);
    case "N":
      return canKnightMoveTo(fromSquare, toSquare, board);
    case "B":
      return canBishopMoveTo(fromSquare, toSquare, board);
    case "Q":
      return canQueenMoveTo(fromSquare, toSquare, board);
    case "K":
      return canKingMoveTo(fromSquare, toSquare, board);
    default:
      return false;
  }
};

/**
 * Check if pawn can move to destination
 */
const canPawnMoveTo = (
  fromSquare: string,
  toSquare: string,
  board: string[][],
): boolean => {
  const [fromRank, fromFile] = squareToCoords(fromSquare);
  const [toRank, toFile] = squareToCoords(toSquare);

  const fromPiece = board[fromRank][fromFile];
  const isWhite = fromPiece === fromPiece.toUpperCase();
  const direction = isWhite ? -1 : 1;

  // Forward move
  if (fromFile === toFile && toRank === fromRank + direction) {
    return board[toRank][toFile] === "";
  }

  // Double move from starting position
  if (fromFile === toFile && toRank === fromRank + 2 * direction) {
    const startRank = isWhite ? 6 : 1;
    if (fromRank === startRank) {
      return (
        board[fromRank + direction][fromFile] === "" &&
        board[toRank][toFile] === ""
      );
    }
  }

  // Capture
  if (Math.abs(fromFile - toFile) === 1 && toRank === fromRank + direction) {
    return board[toRank][toFile] !== "";
  }

  return false;
};

/**
 * Check if rook can move to destination
 */
const canRookMoveTo = (
  fromSquare: string,
  toSquare: string,
  board: string[][],
): boolean => {
  const [fromRank, fromFile] = squareToCoords(fromSquare);
  const [toRank, toFile] = squareToCoords(toSquare);

  // Rook moves horizontally or vertically
  if (fromRank !== toRank && fromFile !== toFile) {
    return false;
  }

  // Check path
  const rankStep = fromRank === toRank ? 0 : toRank > fromRank ? 1 : -1;
  const fileStep = fromFile === toFile ? 0 : toFile > fromFile ? 1 : -1;

  let currentRank = fromRank + rankStep;
  let currentFile = fromFile + fileStep;

  while (currentRank !== toRank || currentFile !== toFile) {
    if (board[currentRank][currentFile] !== "") {
      return false;
    }
    currentRank += rankStep;
    currentFile += fileStep;
  }

  return true;
};

/**
 * Check if knight can move to destination
 */
const canKnightMoveTo = (
  fromSquare: string,
  toSquare: string,
  board: string[][],
): boolean => {
  const [fromRank, fromFile] = squareToCoords(fromSquare);
  const [toRank, toFile] = squareToCoords(toSquare);

  const rankDiff = Math.abs(fromRank - toRank);
  const fileDiff = Math.abs(fromFile - toFile);

  return (
    (rankDiff === 2 && fileDiff === 1) || (rankDiff === 1 && fileDiff === 2)
  );
};

/**
 * Check if bishop can move to destination
 */
const canBishopMoveTo = (
  fromSquare: string,
  toSquare: string,
  board: string[][],
): boolean => {
  const [fromRank, fromFile] = squareToCoords(fromSquare);
  const [toRank, toFile] = squareToCoords(toSquare);

  // Bishop moves diagonally
  if (Math.abs(fromRank - toRank) !== Math.abs(fromFile - toFile)) {
    return false;
  }

  // Check path
  const rankStep = toRank > fromRank ? 1 : -1;
  const fileStep = toFile > fromFile ? 1 : -1;

  let currentRank = fromRank + rankStep;
  let currentFile = fromFile + fileStep;

  while (currentRank !== toRank && currentFile !== toFile) {
    if (board[currentRank][currentFile] !== "") {
      return false;
    }
    currentRank += rankStep;
    currentFile += fileStep;
  }

  return true;
};

/**
 * Check if queen can move to destination
 */
const canQueenMoveTo = (
  fromSquare: string,
  toSquare: string,
  board: string[][],
): boolean => {
  return (
    canRookMoveTo(fromSquare, toSquare, board) ||
    canBishopMoveTo(fromSquare, toSquare, board)
  );
};

/**
 * Check if king can move to destination
 */
const canKingMoveTo = (
  fromSquare: string,
  toSquare: string,
  board: string[][],
): boolean => {
  const [fromRank, fromFile] = squareToCoords(fromSquare);
  const [toRank, toFile] = squareToCoords(toSquare);

  const rankDiff = Math.abs(fromRank - toRank);
  const fileDiff = Math.abs(fromFile - toFile);

  return rankDiff <= 1 && fileDiff <= 1;
};

/**
 * Select correct move when multiple options exist
 */
const selectCorrectMove = (
  candidates: string[],
  toSquare: string,
  piece: string,
  board: string[][],
): string => {
  // For now, just return the first candidate
  // In a full implementation, this would use more sophisticated logic
  return candidates[0];
};

/**
 * Apply move to FEN
 */
const applyMoveToFEN = (fen: string, move: ChessMove): string => {
  const position = parseFEN(fen);
  const [fromRank, fromFile] = squareToCoords(move.from);
  const [toRank, toFile] = squareToCoords(move.to);

  // Create new board
  const newBoard = position.board.map((row) => [...row]);
  newBoard[toRank][toFile] = newBoard[fromRank][fromFile];
  newBoard[fromRank][fromFile] = "";

  // Handle special moves
  if (move.special === "castling") {
    if (move.rookFrom && move.rookTo) {
      const [rookFromRank, rookFromFile] = squareToCoords(move.rookFrom);
      const [rookToRank, rookToFile] = squareToCoords(move.rookTo);
      newBoard[rookToRank][rookToFile] = newBoard[rookFromRank][rookFromFile];
      newBoard[rookFromRank][rookFromFile] = "";
    }
  }

  // Update castling rights
  let newCastling = position.castling;

  // Remove castling rights when king moves
  if (move.piece.toUpperCase() === "K") {
    if (move.piece === "K") {
      // White king moved
      newCastling = newCastling.replace(/[KQ]/g, "");
    } else {
      // Black king moved
      newCastling = newCastling.replace(/[kq]/g, "");
    }
  }

  // Remove castling rights when rooks move
  if (move.piece.toUpperCase() === "R") {
    if (move.from === "a1") newCastling = newCastling.replace("Q", "");
    if (move.from === "h1") newCastling = newCastling.replace("K", "");
    if (move.from === "a8") newCastling = newCastling.replace("q", "");
    if (move.from === "h8") newCastling = newCastling.replace("k", "");
  }

  // Update en passant
  let newEnPassant = null;
  if (move.piece.toUpperCase() === "P") {
    const [fromRank, fromFile] = squareToCoords(move.from);
    const [toRank, toFile] = squareToCoords(move.to);

    // Check if it's a double pawn move
    if (Math.abs(fromRank - toRank) === 2) {
      const enPassantRank = fromRank + (toRank > fromRank ? 1 : -1);
      newEnPassant = coordsToSquare(enPassantRank, fromFile);
    }
  }

  // Update position
  const newPosition: ChessPosition = {
    ...position,
    board: newBoard,
    turn: position.turn === "w" ? "b" : "w",
    castling: newCastling || "-",
    enPassant: newEnPassant,
  };

  return toFEN(newPosition);
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

    console.log("Branch display check:", {
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
