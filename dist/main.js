import { PLAYER_COLORS, } from "./types.js";
import { setGlobalCurrentMoveIndex } from "./utils.js";
import { showToast, updateTreeFontSize } from "./utils/ui-utils.js";
import { formatScoreWithMateIn } from "./utils/formatting-utils.js";
import { compareAnalysisMoves } from "./utils/analysis-utils.js";
import { applyMoveToFEN } from "./utils/fen-manipulation.js";
import { moveToNotation } from "./utils/notation-utils.js";
import { parseFEN } from "./utils/fen-utils.js";
import { log } from "./utils/logging.js";
import { getInputElement, getTextAreaElement, getCheckedRadioByName, } from "./utils/dom-helpers.js";
import { initializeCopyButton } from "./utils/copy-utils.js";
import { formatPVWithEffects, updateResultsPanel } from "./utils/pv-utils.js";
import { updateFENInput, updateControlsFromPosition, updatePositionFromControls, resetPositionEvaluation, initializePositionEvaluationButton, } from "./utils/position-controls.js";
import { updateNavigationButtons } from "./utils/button-utils.js";
import { updateThreadsInputForFallbackMode, updateTreeDiggerThreadsForFallbackMode, } from "./utils/thread-utils.js";
import { getAnalysisOptions, } from "./utils/analysis-config.js";
import { updateTreeDiggerStatus, updateAnalysisStatus, } from "./utils/status-management.js";
import { updateTreeDiggerResults } from "./utils/tree-digger-results.js";
import { addMove, importGame, previousMove, nextMove, updateMoveList, } from "./utils/game-navigation.js";
import { startAnalysis, stopAnalysis, addPVClickListeners, handleMakeEngineMove, } from "./utils/analysis-manager.js";
import { startTreeDiggerAnalysis, stopTreeDiggerAnalysis, clearTreeDiggerAnalysis, updateTreeDiggerButtonStates, } from "./utils/tree-digger-manager.js";
import * as Board from "./chess-board.js";
import * as Stockfish from "./stockfish-client.js";
import { validateMove } from "./move-validator.js";
import * as BestLines from "./tree-digger.js";
import { hideMoveArrow } from "./utils/arrow-utils.js";
/**
 * Application state instance
 */
let appState = {
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
export const updateAppState = (updates) => {
    appState = { ...appState, ...updates };
    // Update global move index when it changes
    if (updates.currentMoveIndex !== undefined) {
        setGlobalCurrentMoveIndex(updates.currentMoveIndex);
    }
};
/**
 * Get current application state
 */
export const getAppState = () => ({ ...appState });
// ============================================================================
// INITIALIZATION
// ============================================================================
/**
 * Initialize the application
 */
export const initializeApp = () => {
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
// EVENT LISTENERS
// ============================================================================
/**
 * Load a FEN position and update all related state
 */
const loadFENPosition = (fen) => {
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
const initializeEventListeners = () => {
    // Board controls
    const resetBtn = document.getElementById("reset-board");
    const clearBtn = document.getElementById("clear-board");
    const fenInput = getInputElement("fen-input");
    const loadFenBtn = document.getElementById("load-fen");
    const gameNotation = getTextAreaElement("game-notation");
    const importGameBtn = document.getElementById("import-game");
    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            const initialFEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
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
    const prevMoveBtn = document.getElementById("prev-move");
    const nextMoveBtn = document.getElementById("next-move");
    if (prevMoveBtn) {
        prevMoveBtn.addEventListener("click", () => previousMove());
    }
    if (nextMoveBtn) {
        nextMoveBtn.addEventListener("click", () => nextMove());
    }
    // Load mate-in-4 position
    document.getElementById("load-mate-in-4")?.addEventListener("click", () => {
        loadFENPosition("r4r1k/2p3R1/5pQ1/pp1b4/8/3P4/1q3PPP/5RK1 b - - 0 2");
    });
    document
        .getElementById("load-mate-in-1-black")
        ?.addEventListener("click", () => {
        loadFENPosition("r4rbk/2p3R1/5p1Q/pp6/8/3P4/5RPP/6K1 b - - 2 4");
    });
    document
        .getElementById("load-mate-in-1-white")
        ?.addEventListener("click", () => {
        loadFENPosition("r4r1k/2p3Rb/5p1Q/pp6/8/3P4/5RPP/6K1 w - - 3 5");
    });
    // Analysis controls
    const startBtn = document.getElementById("start-analysis");
    const stopBtn = document.getElementById("stop-analysis");
    if (startBtn) {
        startBtn.addEventListener("click", () => startAnalysis());
    }
    if (stopBtn) {
        stopBtn.addEventListener("click", () => stopAnalysis());
    }
    // Tree digger analysis controls
    const startTreeDiggerBtn = document.getElementById("start-tree-digger");
    const stopTreeDiggerBtn = document.getElementById("stop-tree-digger");
    const clearTreeDiggerBtn = document.getElementById("clear-tree-digger");
    if (startTreeDiggerBtn) {
        startTreeDiggerBtn.addEventListener("click", () => startTreeDiggerAnalysis());
    }
    if (stopTreeDiggerBtn) {
        stopTreeDiggerBtn.addEventListener("click", () => {
            console.log("USER PRESSED STOP BUTTON - Analysis manually stopped");
            stopTreeDiggerAnalysis();
        });
    }
    if (clearTreeDiggerBtn) {
        clearTreeDiggerBtn.addEventListener("click", () => clearTreeDiggerAnalysis());
    }
    // Tree font size control
    const treeFontSizeInput = document.getElementById("tree-font-size");
    if (treeFontSizeInput) {
        // Initialize with default value
        updateTreeFontSize(16);
        treeFontSizeInput.addEventListener("input", () => {
            const fontSize = treeFontSizeInput.value;
            updateTreeFontSize(parseInt(fontSize));
        });
    }
    // Thread control for tree digger analysis
    const treeDiggerThreadsInput = document.getElementById("tree-digger-threads");
    const treeDiggerThreadsValue = document.getElementById("tree-digger-threads-value");
    if (treeDiggerThreadsInput && treeDiggerThreadsValue) {
        treeDiggerThreadsInput.addEventListener("input", () => {
            const threads = treeDiggerThreadsInput.value;
            treeDiggerThreadsValue.textContent = threads;
        });
    }
    // Update tree digger threads input for fallback mode
    updateTreeDiggerThreadsForFallbackMode();
    // Depth scaler control for tree digger analysis
    const treeDiggerDepthScalerInput = document.getElementById("tree-digger-depth-scaler");
    const treeDiggerDepthScalerValue = document.getElementById("tree-digger-depth-scaler-value");
    if (treeDiggerDepthScalerInput && treeDiggerDepthScalerValue) {
        treeDiggerDepthScalerInput.addEventListener("input", () => {
            const depthScaler = treeDiggerDepthScalerInput.value;
            treeDiggerDepthScalerValue.textContent = depthScaler;
        });
    }
    // Stockfish loading event listeners
    window.addEventListener("stockfish-loading", ((event) => {
        const customEvent = event;
        const message = customEvent.detail?.message || "Loading Stockfish...";
        updateTreeDiggerStatus(message);
        updateAnalysisStatus(message);
    }));
    window.addEventListener("stockfish-ready", (() => {
        updateTreeDiggerStatus("Stockfish ready");
        updateAnalysisStatus("Stockfish ready");
    }));
    window.addEventListener("stockfish-analyzing", ((event) => {
        const customEvent = event;
        const message = customEvent.detail?.message || "Analyzing...";
        const position = customEvent.detail?.position || "";
        updateTreeDiggerStatus(`${message} ${position}`);
        updateAnalysisStatus(`${message} ${position}`);
    }));
    window.addEventListener("stockfish-analysis-complete", ((event) => {
        const customEvent = event;
        const message = customEvent.detail?.message || "Analysis complete";
        const movesFound = customEvent.detail?.movesFound || 0;
        updateTreeDiggerStatus(`${message} (${movesFound} moves)`);
        updateAnalysisStatus(`${message} (${movesFound} moves)`);
    }));
    window.addEventListener("stockfish-pv-update", ((event) => {
        const customEvent = event;
        const pvLines = customEvent.detail?.pvLines || 0;
        // Update the status immediately with PV count
        const statusElement = document.getElementById("tree-digger-status");
        if (statusElement && BestLines.isAnalyzing()) {
            const progress = BestLines.getProgress();
            const progressPercent = progress.totalPositions > 0
                ? Math.round((progress.analyzedPositions / progress.totalPositions) * 100)
                : 0;
            const currentPos = progress.currentPosition.substring(0, 30) + "...";
            statusElement.textContent = `Analyzing... ${progress.analyzedPositions}/${progress.totalPositions} (${progressPercent}%) - ${currentPos}`;
        }
    }));
    window.addEventListener("stockfish-pv-line", ((event) => {
        // const customEvent = event as CustomEvent;
        // const depth = customEvent.detail?.depth || 0;
        // const multipv = customEvent.detail?.multipv || 0;
        // const score = customEvent.detail?.score || 0;
        // const pvMoves = customEvent.detail?.pvMoves || 0;
        // log(`Stockfish PV line: depth=${depth}, multipv=${multipv}, score=${score}, moves=${pvMoves}`);
        // Increment the PV lines counter in tree digger state
        if (BestLines.isAnalyzing()) {
            const progress = BestLines.getProgress();
            progress.pvLinesReceived++;
            // Update the status immediately
            const statusElement = document.getElementById("tree-digger-status");
            if (statusElement) {
                const progressPercent = progress.totalPositions > 0
                    ? Math.round((progress.analyzedPositions / progress.totalPositions) * 100)
                    : 0;
                const currentPos = progress.currentPosition.substring(0, 30) + "...";
                statusElement.textContent = `Analyzing... ${progress.analyzedPositions}/${progress.totalPositions} (${progressPercent}%) - ${currentPos}`;
            }
        }
    }));
    // Position controls
    initializePositionControls();
    // Analysis format controls
    const notationRadios = document.querySelectorAll('input[name="notation-format"]');
    const pieceRadios = document.querySelectorAll('input[name="piece-format"]');
    notationRadios.forEach((radio) => {
        radio.addEventListener("change", () => {
            updateMoveList();
            updateResultsPanel(appState.currentResults?.moves || []);
        });
    });
    pieceRadios.forEach((radio) => {
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
    [whiteMovesInput, responderMovesInput, maxDepthInput, threadsInput].forEach((input) => {
        if (input) {
            input.addEventListener("change", () => {
                // Update results panel to reflect new configuration
                if (appState.currentResults?.moves) {
                    updateResultsPanel(appState.currentResults.moves);
                }
            });
        }
    });
    // Update threads input based on fallback mode
    updateThreadsInputForFallbackMode();
    // Debounced update mechanism for tree digger analysis
    let treeDiggerUpdateTimeout = null;
    const debouncedTreeDiggerUpdate = () => {
        // Reset event rate when analysis stops
        if (BestLines.isAnalyzing()) {
            eventTrackingState.totalCount++;
        }
        else {
            eventTrackingState.recentCount = 0;
        }
        if (treeDiggerUpdateTimeout)
            return;
        treeDiggerUpdateTimeout = setTimeout(() => {
            treeDiggerUpdateTimeout = null;
            const now = Date.now();
            // Track recent events (last 1 second)
            if (now - eventTrackingState.recentStartTime > 1000) {
                // Reset recent window
                eventTrackingState.recentCount = 1;
                eventTrackingState.recentStartTime = now;
            }
            else {
                eventTrackingState.recentCount++;
            }
            eventTrackingState.lastEventTime = now;
            // Update immediately
            updateTreeDiggerStatus();
            updateTreeDiggerResults();
            updateTreeDiggerButtonStates();
        }, 200);
    };
    // Listen for Stockfish events to trigger UI updates
    window.addEventListener("stockfish-pv-update", debouncedTreeDiggerUpdate);
    window.addEventListener("stockfish-pv-line", debouncedTreeDiggerUpdate);
    window.addEventListener("stockfish-info-update", debouncedTreeDiggerUpdate);
    window.addEventListener("stockfish-analysis-complete", debouncedTreeDiggerUpdate);
    window.addEventListener("tree-digger-progress", debouncedTreeDiggerUpdate);
    // Responder moves control for tree digger
    const treeDiggerResponderMovesInput = document.getElementById("tree-digger-responder-moves");
    const responderMovesValue = document.getElementById("tree-digger-responder-moves-value");
    if (treeDiggerResponderMovesInput && responderMovesValue) {
        treeDiggerResponderMovesInput.addEventListener("input", () => {
            responderMovesValue.textContent = treeDiggerResponderMovesInput.value;
        });
    }
    // Override controls for tree digger
    const treeDiggerOverride1Input = document.getElementById("tree-digger-override-1");
    const override1Value = document.getElementById("tree-digger-override-1-value");
    if (treeDiggerOverride1Input && override1Value) {
        treeDiggerOverride1Input.addEventListener("input", () => {
            override1Value.textContent = treeDiggerOverride1Input.value;
        });
    }
    const treeDiggerOverride2Input = document.getElementById("tree-digger-override-2");
    const override2Value = document.getElementById("tree-digger-override-2-value");
    if (treeDiggerOverride2Input && override2Value) {
        treeDiggerOverride2Input.addEventListener("input", () => {
            override2Value.textContent = treeDiggerOverride2Input.value;
        });
    }
};
/**
 * Initialize position controls
 */
const initializePositionControls = () => {
    // Current player controls
    const playerRadios = document.querySelectorAll('input[name="current-player"]');
    playerRadios.forEach((radio) => {
        radio.addEventListener("change", updatePositionFromControls);
    });
    // Castling controls
    const castlingCheckboxes = document.querySelectorAll('input[type="checkbox"]');
    castlingCheckboxes.forEach((checkbox) => {
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
export const actuallyUpdateResultsPanel = (moves) => {
    const resultsPanel = document.getElementById("analysis-results");
    if (!resultsPanel)
        return;
    // Clear existing arrows
    hideMoveArrow();
    // Get current format settings
    const notationFormat = getCheckedRadioByName("notation-format")?.value || "algebraic-short";
    const pieceFormat = getCheckedRadioByName("piece-format")?.value || "symbols";
    // Convert format values to match moveToNotation parameters
    const notationType = notationFormat === "algebraic-short" ? "short" : "long";
    const pieceType = pieceFormat === "symbols" ? "unicode" : "english";
    // Filter moves based on analysis criteria
    const appState = getAppState();
    const isAnalyzing = appState.isAnalyzing;
    // First, separate mate lines from non-mate lines
    const mateLines = moves.filter((move) => Math.abs(move.score) >= 10000);
    const nonMateLines = moves.filter((move) => Math.abs(move.score) < 10000);
    // Sort mate lines using the updated comparison function that considers mateIn
    const currentFEN = Board.getFEN();
    const position = currentFEN ? parseFEN(currentFEN) : null;
    const direction = position && position.turn === PLAYER_COLORS.BLACK ? "asc" : "desc";
    mateLines.sort((a, b) => compareAnalysisMoves(a, b, direction));
    // Sort non-mate lines by depth (descending), then by score (descending), then by multipv
    nonMateLines.sort((a, b) => {
        // For score comparison, use shared logic
        const scoreComparison = compareAnalysisMoves(a, b, direction);
        if (scoreComparison !== 0)
            return scoreComparison;
        return (a.multipv || 1) - (b.multipv || 1);
    });
    // Get the configured number of lines from UI
    const analysisOptions = getAnalysisOptions();
    const maxLines = analysisOptions.multiPV;
    const filteredMoves = [];
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
        const visibleNonMatingMoves = filteredMoves.filter((move) => Math.abs(move.score) < 10000);
        const visibleMatingMoves = filteredMoves.filter((move) => Math.abs(move.score) >= 10000);
        let lowestDepth = 0;
        if (visibleNonMatingMoves.length > 0) {
            lowestDepth = Math.min(...visibleNonMatingMoves.map((move) => move.depth));
        }
        else if (visibleMatingMoves.length > 0) {
            lowestDepth = Math.max(...visibleMatingMoves.map((move) => move.mateIn));
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
    filteredMoves.forEach((move, index) => {
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
        const notation = moveToNotation(move.move, notationType, pieceType, Board.getFEN());
        const score = formatScoreWithMateIn(move.score, move.mateIn);
        const pv = formatPVWithEffects(move.pv, Board.getFEN(), notationType, pieceType);
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
            handleMakeEngineMove(move);
        });
        resultsPanel.appendChild(moveItem);
    });
    // Add arrows for each displayed analysis result
    filteredMoves.forEach((move, index) => {
        if (move.move.from && move.move.to && move.move.piece) {
            // Create a unique arrow ID for this specific analysis result
            const arrowId = `analysis-${index}-${move.move.from}-${move.move.to}`;
            Board.showMoveArrow(move.move.from, move.move.to, move.move.piece, move.score, filteredMoves, index, arrowId, // Pass the unique arrow ID
            move.mateIn);
        }
    });
    addPVClickListeners();
};
// ============================================================================
// MOVE HOVER EVENTS
// ============================================================================
/**
 * Create a branch from the current position
 */
export const createBranch = (branchMoves, originalPosition) => {
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
export const clearBranch = () => {
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
window.addEventListener("move-parse-warning", (event) => {
    const detail = event.detail;
    if (detail && detail.message) {
        showToast(detail.message, "#ff9800", 5000);
        // Highlight the relevant input(s)
        let found = false;
        if (detail.move) {
            // Try to find an input whose value matches the move
            const inputs = document.querySelectorAll('input[type="text"], input[type="search"]');
            inputs.forEach((input) => {
                if (input.value.trim() === detail.move.trim()) {
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
            const moveInputs = document.querySelectorAll('input[id^="tree-digger-initiator-move"], input[id^="tree-digger-responder-move"]');
            moveInputs.forEach((input) => {
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
//# sourceMappingURL=main.js.map