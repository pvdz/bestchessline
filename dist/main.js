import { PLAYER_COLORS, } from "./types.js";
import { setGlobalCurrentMoveIndex, } from "./utils.js";
import { showToast, updateTreeFontSize, } from "./utils/ui-utils.js";
import { formatScoreWithMateIn, } from "./utils/formatting-utils.js";
import { compareAnalysisMoves, } from "./utils/analysis-utils.js";
import { applyMoveToFEN, } from "./utils/fen-manipulation.js";
import { moveToNotation, } from "./utils/notation-utils.js";
import { parseFEN, } from "./utils/fen-utils.js";
import { log, logError, } from "./utils/logging.js";
import { getInputElement, getTextAreaElement, getButtonElement, getCheckedRadioByName, } from "./utils/dom-helpers.js";
import { parseGameNotation, } from "./utils/move-parsing.js";
import { formatNodeScore, } from "./utils/node-utils.js";
import { highlightLastMove, clearLastMoveHighlight, } from "./utils/board-utils.js";
import { clearTreeNodeDOMMap, } from "./utils/debug-utils.js";
import { initializeCopyButton, } from "./utils/copy-utils.js";
import { getLineCompletion, } from "./utils/line-analysis.js";
import { formatPVWithEffects, updateResultsPanel, } from "./utils/pv-utils.js";
import { updateStatus, } from "./utils/status-utils.js";
import { updateFENInput, updateControlsFromPosition, updatePositionFromControls, } from "./utils/position-controls.js";
import { navigateToMove, applyMovesUpToIndex, } from "./utils/navigation-utils.js";
import { updateNavigationButtons, } from "./utils/button-utils.js";
import { handleTreeNodeClick, } from "./utils/tree-debug-utils.js";
import { updateThreadsInputForFallbackMode, updateTreeDiggerThreadsForFallbackMode, } from "./utils/thread-utils.js";
import { getAnalysisOptions, updateButtonStates, } from "./utils/analysis-config.js";
import { updateBestLinesStatus, updateAnalysisStatus, } from "./utils/status-management.js";
import { updateBestLinesResults, } from "./utils/best-lines-results.js";
import { buildShadowTree, findNodeById } from "./utils/tree-building.js";
import * as Board from "./chess-board.js";
import * as Stockfish from "./stockfish-client.js";
import { validateMove } from "./move-validator.js";
import * as BestLines from "./best-lines.js";
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
const getEventTrackingState = () => ({ ...eventTrackingState });
/**
 * Update application state
 */
const updateAppState = (updates) => {
    appState = { ...appState, ...updates };
    // Update global move index when it changes
    if (updates.currentMoveIndex !== undefined) {
        setGlobalCurrentMoveIndex(updates.currentMoveIndex);
    }
};
/**
 * Get current application state
 */
const getAppState = () => ({ ...appState });
// ============================================================================
// INITIALIZATION
// ============================================================================
/**
 * Initialize the application
 */
const initializeApp = () => {
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
const resetPositionEvaluation = () => {
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
const initializePositionEvaluationButton = () => {
    const evaluationButton = document.getElementById("position-evaluation-btn");
    if (evaluationButton) {
        evaluationButton.addEventListener("click", () => {
            evaluateCurrentPosition();
        });
    }
};
/**
 * Evaluate the current board position using Stockfish
 */
const evaluateCurrentPosition = async () => {
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
            new Promise((_, reject) => setTimeout(() => reject(new Error("Analysis timeout")), 10000)),
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
        }
        else {
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
    }
    catch (error) {
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
const updatePositionEvaluationDisplay = () => {
    const evaluationButton = document.getElementById("position-evaluation-btn");
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
    let displayText;
    let className;
    if (isMate) {
        // Use the new formatter for mate scores
        displayText = formatScoreWithMateIn(score, mateIn ?? 0);
        className = "evaluation-button mate";
    }
    else {
        // Convert centipawns to pawns and format
        const scoreInPawns = score / 100;
        displayText = score > 0
            ? `+${scoreInPawns.toFixed(1)}`
            : `${scoreInPawns.toFixed(1)}`;
        className = score > 0
            ? "evaluation-button positive"
            : score < 0
                ? "evaluation-button negative"
                : "evaluation-button neutral";
    }
    evaluationButton.textContent = displayText;
    evaluationButton.className = className;
    evaluationButton.disabled = false;
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
        startTreeDiggerBtn.addEventListener("click", () => startBestLinesAnalysis());
    }
    if (stopTreeDiggerBtn) {
        stopTreeDiggerBtn.addEventListener("click", () => {
            console.log("USER PRESSED STOP BUTTON - Analysis manually stopped");
            stopBestLinesAnalysis();
        });
    }
    if (clearTreeDiggerBtn) {
        clearTreeDiggerBtn.addEventListener("click", () => clearBestLinesAnalysis());
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
        updateBestLinesStatus(message);
        updateAnalysisStatus(message);
    }));
    window.addEventListener("stockfish-ready", (() => {
        updateBestLinesStatus("Stockfish ready");
        updateAnalysisStatus("Stockfish ready");
    }));
    window.addEventListener("stockfish-analyzing", ((event) => {
        const customEvent = event;
        const message = customEvent.detail?.message || "Analyzing...";
        const position = customEvent.detail?.position || "";
        updateBestLinesStatus(`${message} ${position}`);
        updateAnalysisStatus(`${message} ${position}`);
    }));
    window.addEventListener("stockfish-analysis-complete", ((event) => {
        const customEvent = event;
        const message = customEvent.detail?.message || "Analysis complete";
        const movesFound = customEvent.detail?.movesFound || 0;
        updateBestLinesStatus(`${message} (${movesFound} moves)`);
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
        // Increment the PV lines counter in best lines state
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
    // Debounced update mechanism for best lines analysis
    let bestLinesUpdateTimeout = null;
    const debouncedBestLinesUpdate = () => {
        // Reset event rate when analysis stops
        if (BestLines.isAnalyzing()) {
            eventTrackingState.totalCount++;
        }
        else {
            eventTrackingState.recentCount = 0;
        }
        if (bestLinesUpdateTimeout)
            return;
        bestLinesUpdateTimeout = setTimeout(() => {
            bestLinesUpdateTimeout = null;
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
            updateBestLinesStatus();
            updateBestLinesResults();
            updateBestLinesButtonStates();
        }, 200);
    };
    // Listen for Stockfish events to trigger UI updates
    window.addEventListener("stockfish-pv-update", debouncedBestLinesUpdate);
    window.addEventListener("stockfish-pv-line", debouncedBestLinesUpdate);
    window.addEventListener("stockfish-info-update", debouncedBestLinesUpdate);
    window.addEventListener("stockfish-analysis-complete", debouncedBestLinesUpdate);
    window.addEventListener("best-lines-progress", debouncedBestLinesUpdate);
    // Responder moves control for best lines
    const treeDiggerResponderMovesInput = document.getElementById("tree-digger-responder-moves");
    const responderMovesValue = document.getElementById("tree-digger-responder-moves-value");
    if (treeDiggerResponderMovesInput && responderMovesValue) {
        treeDiggerResponderMovesInput.addEventListener("input", () => {
            responderMovesValue.textContent = treeDiggerResponderMovesInput.value;
        });
    }
    // Override controls for best lines
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
/**
 * Start analysis
 */
const startAnalysis = async () => {
    if (appState.isAnalyzing)
        return;
    updateAppState({
        isAnalyzing: true,
    });
    updateButtonStates();
    updatePositionEvaluationDisplay();
    try {
        const options = getAnalysisOptions();
        const fen = Board.getFEN();
        const result = await Stockfish.analyzePosition(fen, options, (analysisResult) => {
            updateAppState({
                currentResults: analysisResult,
                isAnalyzing: !analysisResult.completed,
            });
            updateResults(analysisResult);
            updateButtonStates();
        });
        updateAppState({
            currentResults: result,
            isAnalyzing: false,
        });
        updateButtonStates();
    }
    catch (error) {
        logError("Analysis failed:", error);
        updateAppState({ isAnalyzing: false });
        updateButtonStates();
    }
};
/**
 * Stop analysis
 */
const stopAnalysis = () => {
    Stockfish.stopAnalysis();
    updateAppState({
        isAnalyzing: false,
        currentResults: null,
    });
    updateButtonStates();
    updateResultsPanel([]);
};
// ============================================================================
// BEST LINES ANALYSIS FUNCTIONS
// ============================================================================
/**
 * Start best lines analysis
 */
const startBestLinesAnalysis = async () => {
    try {
        // Clear any previous analysis results first
        BestLines.clearBestLinesAnalysis();
        await BestLines.startBestLinesAnalysis();
        updateBestLinesButtonStates();
        updateBestLinesStatus();
        updateBestLinesResults();
    }
    catch (error) {
        logError("Failed to start best lines analysis:", error);
        updateBestLinesStatus("Error starting analysis");
    }
};
/**
 * Stop best lines analysis
 */
const stopBestLinesAnalysis = () => {
    console.log("Stop button clicked - calling stopBestLinesAnalysis");
    try {
        BestLines.stopBestLinesAnalysis();
        console.log("BestLines.stopBestLinesAnalysis() completed");
        clearTreeNodeDOMMap(); // Clear tracked DOM elements
        updateBestLinesButtonStates();
        updateBestLinesStatus("Analysis stopped");
        console.log("Stop analysis completed successfully");
    }
    catch (error) {
        console.error("Failed to stop best lines analysis:", error);
        logError("Failed to stop best lines analysis:", error);
    }
};
/**
 * Clear best lines analysis
 */
const clearBestLinesAnalysis = () => {
    try {
        BestLines.clearBestLinesAnalysis();
        clearTreeNodeDOMMap(); // Clear tracked DOM elements
        updateBestLinesButtonStates();
        updateBestLinesStatus("Ready");
        updateBestLinesResults();
    }
    catch (error) {
        logError("Failed to clear best lines analysis:", error);
    }
};
/**
 * Update best lines button states
 */
const updateBestLinesButtonStates = () => {
    const startBtn = getButtonElement("start-tree-digger");
    const stopBtn = getButtonElement("stop-tree-digger");
    const clearBtn = getButtonElement("clear-tree-digger");
    const isAnalyzing = BestLines.isAnalyzing();
    const isStockfishBusy = appState.isAnalyzing || appState.positionEvaluation.isAnalyzing;
    if (startBtn) {
        startBtn.disabled = isAnalyzing || isStockfishBusy;
    }
    else {
        console.error("Start button not found!");
    }
    if (stopBtn) {
        stopBtn.disabled = !isAnalyzing;
    }
    else {
        console.error("Stop button not found!");
    }
    if (clearBtn) {
        clearBtn.disabled = isAnalyzing;
    }
    else {
        console.error("Clear button not found!");
    }
};
/**
 * Update an existing DOM element for a tree node
 */
const updateTreeNodeElement = (element, node, analysis) => {
    const moveInfo = element.querySelector(".move-info");
    const moveText = moveToNotation(node.move);
    const scoreText = formatNodeScore(node);
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
            if (moveInfo) {
                moveInfo.appendChild(scoreSpan);
            }
        }
        scoreSpan.innerHTML = scoreText;
    }
    else if (scoreSpan) {
        scoreSpan.remove();
    }
    // Update transposition indicator
    const positionAfterMove = applyMoveToFEN(node.fen, node.move);
    const isTransposition = node.children.length === 0 &&
        analysis.analyzedPositions.has(positionAfterMove);
    let transpositionSpan = element.querySelector(".transposition-indicator");
    if (isTransposition) {
        if (!transpositionSpan) {
            transpositionSpan = document.createElement("span");
            transpositionSpan.className = "transposition-indicator";
            transpositionSpan.textContent = "🔄";
            if (moveInfo) {
                moveInfo.appendChild(transpositionSpan);
            }
        }
    }
    else if (transpositionSpan) {
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
    }
    else if (lineCompletion) {
        lineCompletion.remove();
    }
    // Update classes
    element.className = element.className.replace(/tree-depth-\d+/, `tree-depth-${node.depth || 0}`);
    if (isTransposition) {
        element.classList.add("transposition");
    }
    else {
        element.classList.remove("transposition");
    }
    // Ensure clickable class and styles are applied
    if (moveInfo) {
        moveInfo.classList.add("clickable");
        moveInfo.style.cursor = "pointer";
        moveInfo.title = "Click to view this position on the board";
    }
};
/**
 * Sync the DOM with the shadow tree
 */
const syncDOMWithShadowTree = (container, shadowNodes, analysis) => {
    // Get existing DOM nodes
    const existingNodes = Array.from(container.children);
    const existingNodeMap = new Map();
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
            let childrenContainer = existingElement.querySelector(".tree-children");
            if (shadowNode.children.length > 0) {
                if (!childrenContainer) {
                    childrenContainer = document.createElement("div");
                    childrenContainer.className = "tree-children";
                    existingElement.appendChild(childrenContainer);
                }
                syncDOMWithShadowTree(childrenContainer, shadowNode.children, analysis);
            }
            else if (childrenContainer) {
                childrenContainer.remove();
            }
        }
        else {
            // Create new element
            const newElement = shadowNode.element;
            // Insert at correct position
            if (i < container.children.length) {
                container.insertBefore(newElement, container.children[i]);
            }
            else {
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
const updateBestLinesTreeIncrementally = (resultsElement, analysis) => {
    let treeSection = resultsElement.querySelector(".tree-digger-tree");
    if (!treeSection) {
        treeSection = document.createElement("div");
        treeSection.className = "tree-digger-tree";
        resultsElement.appendChild(treeSection);
    }
    // Always update the tree section, even when there are no nodes
    if (analysis.nodes.length === 0) {
        treeSection.innerHTML =
            "<p id='tree-digger-tree-empty-message'>No analysis results yet. Starting analysis...</p>";
        return;
    }
    // Build the new shadow tree
    const newShadowNodes = buildShadowTree(analysis.nodes, analysis);
    // Sync the DOM with the shadow tree
    syncDOMWithShadowTree(treeSection, newShadowNodes, analysis);
    // Apply current font size to the updated tree
    const treeFontSizeInput = document.getElementById("tree-font-size");
    if (treeFontSizeInput) {
        const currentFontSize = parseInt(treeFontSizeInput.value);
        updateTreeFontSize(currentFontSize);
    }
    // Add click event delegation to the tree section for better performance
    // Only add the listener if it doesn't already exist
    if (!treeSection.hasAttribute("data-tree-digger-clicks-enabled")) {
        treeSection.setAttribute("data-tree-digger-clicks-enabled", "true");
        treeSection.addEventListener("click", (e) => {
            const target = e.target;
            const moveInfo = target.closest(".move-info.clickable");
            if (moveInfo) {
                const treeNode = moveInfo.closest(".tree-node");
                if (treeNode) {
                    const nodeId = treeNode.getAttribute("data-node-id");
                    if (nodeId) {
                        const node = findNodeById(nodeId, analysis.nodes);
                        if (node) {
                            handleTreeNodeClick(node, analysis);
                        }
                    }
                }
            }
        });
    }
};
/**
 * Render a tree node recursively
 */
const renderTreeNode = (node, depth, analysis) => {
    const moveText = moveToNotation(node.move);
    const scoreText = formatNodeScore(node);
    const moveClass = node.isWhiteMove ? "white-move" : "black-move";
    // Use the move number from the node itself (calculated based on game position)
    const moveNumber = node.moveNumber;
    let moveNumberText = "";
    if (node.isWhiteMove) {
        moveNumberText = `${moveNumber}.`;
    }
    else {
        moveNumberText = `${moveNumber}...`;
    }
    const depthClass = `tree-depth-${depth}`;
    // Generate a unique node ID for debugging
    const nodeId = `node-${node.fen.replace(/[^a-zA-Z0-9]/g, "")}-${node.move.from}-${node.move.to}`;
    // Check if this position is a transposition (has been analyzed before)
    // We show transposition when this node has no children because the position was already analyzed
    const positionAfterMove = applyMoveToFEN(node.fen, node.move);
    const isTransposition = node.children.length === 0 &&
        analysis.analyzedPositions.has(positionAfterMove);
    const transpositionClass = isTransposition ? "transposition" : "";
    let html = `
    <div class="tree-node ${moveClass} ${depthClass} ${transpositionClass}" data-node-id="${nodeId}">
      <div class="move-info">
        <span class="move-number">${moveNumberText}</span>
        <span class="move-text">${moveText}</span>
        ${scoreText ? `<span class="move-score">${scoreText}</span>` : ""}

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
 * Render a best line node
 */
const renderBestLineNode = (node) => {
    const moveText = moveToNotation(node.move);
    const scoreText = formatNodeScore(node);
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
const updateResults = (result) => {
    if (!result || !result.moves)
        return;
    updateResultsPanel(result.moves);
    updateStatus(`Analysis complete: ${result.moves.length} moves found`);
};
// Debounce mechanism for analysis updates
let analysisUpdateTimeout = null;
let queuedMoves = [];
/**
 * Update results panel
 */
const actuallyUpdateResultsPanel = (moves) => {
    analysisUpdateTimeout = null;
    const resultsPanel = document.getElementById("analysis-results");
    if (!resultsPanel)
        return;
    // Clear existing arrows
    Board.hideMoveArrow();
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
/**
 * Make a move from analysis results
 */
const makeAnalysisMove = (move) => {
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
// ============================================================================
// MOVE HOVER EVENTS
// ============================================================================
/**
 * Create a branch from the current position
 */
const createBranch = (branchMoves, originalPosition) => {
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
const clearBranch = () => {
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
const addPVClickListeners = () => {
    // Use event delegation on the results panel
    const resultsPanel = document.getElementById("analysis-results");
    if (!resultsPanel)
        return;
    // Remove any existing listeners to prevent duplicates
    resultsPanel.removeEventListener("click", handlePVClick);
    // Add the event listener
    resultsPanel.addEventListener("click", handlePVClick);
};
const handlePVClick = (e) => {
    const target = e.target;
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
                console.error("Could not find matching analysis result for clicked move");
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
                const isAtLastMove = appState.currentMoveIndex === appState.moves.length - 1;
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
                }
                else {
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
const handleMakeEngineMove = (move) => {
    console.log("Main move clicked:", move);
    const appState = getAppState();
    const currentFEN = Board.getFEN();
    // Check if we're at the last move of the game
    const isAtLastMove = appState.currentMoveIndex === appState.moves.length - 1;
    if (isAtLastMove) {
        // If we're at the last move, just make the move directly
        console.log("At last move, making move directly");
        makeAnalysisMove(move.move);
    }
    else {
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
// GAME MANAGEMENT
// ============================================================================
/**
 * Add move to game history
 */
const addMove = (move) => {
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
const importGame = (notation) => {
    console.log("Importing game:", notation);
    // Reset game state
    updateAppState({
        moves: [],
        currentMoveIndex: -1,
    });
    // Parse moves
    const moves = parseGameNotation(notation, appState.initialFEN);
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
 * Navigate to previous move
 */
const previousMove = () => {
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
const nextMove = () => {
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
 * Update move list display
 */
const updateMoveList = () => {
    const movesPanel = document.getElementById("game-moves");
    if (!movesPanel)
        return;
    // Get current format settings
    const notationFormat = getCheckedRadioByName("notation-format")?.value || "algebraic-short";
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
            shouldDisplay: appState.isInBranch &&
                appState.branchMoves.length > 0 &&
                ((isAtWhiteMove && i === appState.branchStartIndex) ||
                    (isAtBlackMove &&
                        i === Math.floor(appState.branchStartIndex / 2) * 2)),
        });
        if (appState.isInBranch &&
            appState.branchMoves.length > 0 &&
            i === appState.currentMoveIndex) {
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
                        blackMoveElement.textContent = moveToNotation(blackMove, notationType, pieceType, "");
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
                        whiteMoveElement.textContent = `${moveNumberText}${moveToNotation(whiteMove, notationType, pieceType, "")}`;
                        whiteMoveElement.title = "Branch move";
                        branchEntry.appendChild(whiteMoveElement);
                    }
                }
            }
            else if (isAtBlackMove) {
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
                        whiteMoveElement.textContent = `${moveNumberText}${moveToNotation(whiteMove, notationType, pieceType, "")}`;
                        whiteMoveElement.title = "Branch move";
                        branchEntry.appendChild(whiteMoveElement);
                    }
                    // Add black move
                    if (i + 1 < appState.branchMoves.length) {
                        const blackMove = appState.branchMoves[i + 1];
                        const blackMoveElement = document.createElement("span");
                        blackMoveElement.className = "move-text clickable branch-move";
                        blackMoveElement.textContent = moveToNotation(blackMove, notationType, pieceType, "");
                        blackMoveElement.title = "Branch move";
                        branchEntry.appendChild(blackMoveElement);
                    }
                }
            }
            movesPanel.appendChild(branchEntry);
        }
    }
};
// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================
export { 
// Initialization
initializeApp, 
// State management
getAppState, updateAppState, 
// Analysis
startAnalysis, stopAnalysis, 
// Game management
addMove, importGame, previousMove, nextMove, 
// UI updates
updateResults, updateStatus, updateMoveList, updateNavigationButtons, 
// Move highlighting
highlightLastMove, clearLastMoveHighlight, 
// Branch management
clearBranch, 
// Position evaluation
resetPositionEvaluation, 
// Results panel
actuallyUpdateResultsPanel, 
// Best lines tree management
updateBestLinesTreeIncrementally, 
// Event tracking
getEventTrackingState, };
/**
 * Map to track DOM elements for tree nodes
 */
const treeNodeDOMMap = new Map();
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