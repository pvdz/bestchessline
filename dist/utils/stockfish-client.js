import { PLAYER_COLORS, } from "../line/types.js";
import { showErrorToast } from "./ui-utils.js";
import { compareAnalysisMoves } from "../line/best/bestmove-utils.js";
import { parseFEN } from "./fen-utils.js";
import { analyzeMove } from "./move-validator.js";
import { ASSERT, assertFenParsable } from "./assert-utils.js";
import { log, logError } from "./logging.js";
import { querySelectorHTMLElement, querySelectorButton, } from "./dom-helpers.js";
import { isSharedArrayBufferSupported, getStockfishWorkerUrlThreaded, getStockfishWorkerUrlFallback, } from "./stockfish-utils.js";
import { parseLongMove } from "./move-parser.js";
import { applyMoveToFEN } from "./fen-manipulation.js";
/**
 * Stockfish state instance
 */
let stockfishState = {
    worker: null,
    isOk: false,
    isAnalyzing: false,
    currentAnalysis: null,
    resolve: Promise.resolve,
    reject: Promise.reject,
    onUpdate: () => { },
    engineStatus: {
        engineLoaded: false,
        engineReady: false,
    },
    waitingForReady: false,
    pendingAnalysis: null,
    sharedArrayBufferSupported: isSharedArrayBufferSupported(),
    fallbackMode: false,
    go: "",
    fen: "",
};
// ============================================================================
// STOCKFISH STATE MANAGEMENT
// ============================================================================
/**
 * Update Stockfish state
 */
function updateStockfishState(updates) {
    stockfishState = { ...stockfishState, ...updates };
}
/**
 * Check if running in fallback mode
 */
export function isFallbackMode() {
    // TODO: eliminate function in favor of isSharedArrayBufferSupported()
    return !isSharedArrayBufferSupported();
}
// ============================================================================
// STOCKFISH INITIALIZATION
// ============================================================================
export function initializeStockfish() {
    try {
        // Set up global error handlers for crash detection
        setupGlobalErrorHandlers();
        // Dispatch loading event
        window.dispatchEvent(new CustomEvent("stockfish-loading", {
            detail: { message: "Initializing Stockfish engine..." },
        }));
        if (isSharedArrayBufferSupported()) {
            stockfishState.sharedArrayBufferSupported = true;
            stockfishState.fallbackMode = false;
            console.log(`Initializing Stockfish with multi-threaded mode...`);
        }
        else {
            stockfishState.sharedArrayBufferSupported = false;
            stockfishState.fallbackMode = true;
            log("SharedArrayBuffer not supported - using fallback mode");
            log("Note: Analysis performance may be reduced");
            console.log(`Initializing Stockfish with single-threaded mode...`);
            // Show user notification about fallback mode
            showFallbackNotification();
        }
        stockfishState.worker = createStockfishThreadedWorker();
        // Initialize with UCI protocol
        log("Starting UCI protocol...");
        window.dispatchEvent(new CustomEvent("stockfish-loading", {
            detail: { message: "Starting UCI protocol..." },
        }));
        uciCmd("uci");
    }
    catch (error) {
        logError("Failed to initialize Stockfish:", error);
        showErrorToast("Failed to initialize Stockfish engine: " + error?.message);
        // Try fallback if main initialization fails
        if (!stockfishState.fallbackMode) {
            log("Trying fallback mode...");
            updateStockfishState({ fallbackMode: true });
            createStockfishFallbackWorker();
        }
    }
}
/**
 * Set up global error handlers for crash detection
 */
function setupGlobalErrorHandlers() {
    // Handle unhandled promise rejections
    window.addEventListener("unhandledrejection", (event) => {
        const error = event.reason;
        const errorMessage = error?.message || String(error);
        // Check for Stockfish-related crashes
        if (errorMessage.includes("Maximum call stack size exceeded") ||
            errorMessage.includes("stockfish") ||
            errorMessage.includes("Stockfish")) {
            logError("Unhandled promise rejection (Stockfish crash):", error);
            event.preventDefault(); // Prevent default handling
            handleStockfishCrash();
        }
    });
    // Handle global errors
    window.addEventListener("error", (event) => {
        const error = event.error;
        const errorMessage = error?.message || event.message || String(error);
        // Check for Stockfish-related crashes
        if (errorMessage.includes("Maximum call stack size exceeded") ||
            errorMessage.includes("stockfish") ||
            errorMessage.includes("Stockfish")) {
            logError("Global error (Stockfish crash):", error);
            event.preventDefault(); // Prevent default handling
            handleStockfishCrash();
        }
    });
}
function createStockfishThreadedWorker() {
    // Create Web Worker for Stockfish
    const workerUrl = getStockfishWorkerUrlThreaded();
    const worker = new Worker(workerUrl);
    // Set up message handler
    worker.onmessage = async (event) => {
        const message = event.data;
        log("Received message from Stockfish:", message);
        await handleUciMessageFromStockfish(message);
    };
    // Set up error handler
    worker.onerror = (error) => {
        logError("Stockfish worker error:", error);
        // Check for specific crash conditions
        const errorMessage = error?.message || "";
        const isStackOverflow = errorMessage.includes("Maximum call stack size exceeded");
        const isMemoryError = errorMessage.includes("out of memory") || errorMessage.includes("memory");
        if (isStackOverflow || isMemoryError) {
            logError("Stockfish crash detected:", errorMessage);
            handleStockfishCrash();
            return;
        }
        // Only switch to fallback mode if we're not already in fallback mode
        // and this is an initialization error (not a runtime analysis error)
        if (!stockfishState.fallbackMode && !stockfishState.isOk) {
            log("Initialization error - trying fallback mode...");
            showErrorToast("Stockfish engine initialization failed. Trying fallback mode...");
            stockfishState.fallbackMode = true;
            createStockfishFallbackWorker();
        }
        else if (stockfishState.isOk) {
            // If engine is ready but we get a runtime error, log it but don't switch modes
            logError("Runtime error during analysis:", error);
            showErrorToast("Stockfish engine encountered an error during analysis: " +
                (error?.message ?? error));
            // Handle crash by resetting UI state
            if (stockfishState.isAnalyzing) {
                log("Analysis error occurred - resetting UI state");
                handleStockfishCrash();
            }
        }
    };
    return worker;
}
/**
 * Initialize Stockfish in fallback mode (single-threaded)
 */
function createStockfishFallbackWorker() {
    try {
        console.log("Initializing Stockfish in fallback mode...");
        // Create Web Worker for single-threaded Stockfish
        const worker = new Worker(getStockfishWorkerUrlFallback());
        // Set up message handler
        worker.onmessage = async (event) => {
            const message = event.data;
            log("Received message from Stockfish fallback:", message);
            await handleUciMessageFromStockfish(message);
        };
        // Set up error handler
        worker.onerror = (error) => {
            logError("Stockfish fallback worker error:", error);
            // For fallback mode, just log the error but don't try to switch modes again
            if (stockfishState.isAnalyzing) {
                log("Fallback analysis error occurred - continuing with current results");
            }
            showErrorToast("Stockfish fallback engine encountered an error: " +
                (error?.message ?? error));
        };
        stockfishState.worker = worker;
        stockfishState.fallbackMode = true;
        // Initialize with UCI protocol
        log("Starting UCI protocol for fallback mode...");
        uciCmd("uci");
        // Notify user about fallback mode
        showFallbackNotification();
    }
    catch (error) {
        logError("Failed to initialize Stockfish fallback:", error);
        showErrorToast("Failed to initialize Stockfish fallback engine: " +
            error?.message);
    }
}
/**
 * Show notification about fallback mode
 */
function showFallbackNotification() {
    // Create notification element
    const notification = document.createElement("div");
    notification.className = "fallback-notification";
    // FIXME: move in html, hidden by default
    notification.innerHTML = `
    <div class="notification-content">
      <strong>Single-Threaded Analysis Mode</strong><br>
      Note: Using fallback mode for compatibility.<br>
      Analysis includes full engine lines but may be slower because multi-threading is not supported without special http headers.
      <button onclick="this.parentElement.parentElement.remove()">×</button>
    </div>
  `;
    // FIXME: just use CSS
    notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #ff9800;
    color: white;
    padding: 15px;
    border-radius: 5px;
    z-index: 1000;
    max-width: 300px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  `;
    const contentElement = querySelectorHTMLElement(
    // FIXME: just use CSS
    notification, ".notification-content");
    if (contentElement) {
        // FIXME: just use CSS
        contentElement.style.cssText = `
      position: relative;
    `;
    }
    // FIXME: just use CSS
    const buttonElement = querySelectorButton(notification, "button");
    if (buttonElement) {
        buttonElement.style.cssText = `
      position: absolute;
      top: -10px;
      right: -10px;
      background: #f44336;
      color: white;
      border: none;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      cursor: pointer;
      font-size: 14px;
    `;
    }
    document.body.appendChild(notification);
    // Auto-remove after 10 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 10000);
}
/**
 * Send UCI command to Stockfish
 */
function uciCmd(cmd) {
    log("UCI Command:", cmd);
    if (stockfishState.worker) {
        stockfishState.worker.postMessage(cmd);
    }
    else {
        console.error("uciCmd: Wanted to talk to Stockfish but its worker is not initialized");
    }
}
// ============================================================================
// MESSAGE HANDLING
// ============================================================================
/**
 * Handle messages from Stockfish
 */
async function handleUciMessageFromStockfish(message) {
    // console.log('handleUciMessageFromStockfish:', message);
    if (message === "uciok") {
        stockfishState.isOk = true;
        log("UCI protocol ready, engine loaded");
        window.dispatchEvent(new CustomEvent("stockfish-loading", {
            detail: { message: "UCI protocol ready, configuring engine..." },
        }));
        window.dispatchEvent(new CustomEvent("stockfish-analyzing", {
            detail: { message: "Analyzing...", position: stockfishState.fen },
        }));
    }
    else if (message === "readyok") {
        // console.log("Stockfish readyok!");
        window.dispatchEvent(new CustomEvent("stockfish-ready"));
        stockfishState.engineStatus.engineReady = true;
        if (stockfishState.pendingAnalysis) {
            const cb = stockfishState.pendingAnalysis;
            updateStockfishState({ pendingAnalysis: null });
            cb();
        }
        // console.log("Go!", stockfishState.go);
        uciCmd(stockfishState.go);
    }
    else if (message.startsWith("bestmove")) {
        // Okay, treat as finish. Assume we've collected all lines (pv's) reported so far
        await handleStockfishBestMoveMessage();
    }
    else if (message.startsWith("info")) {
        parseInfoMessage(message);
    }
    else if (message.startsWith("Stockfish")) {
        log("Received Stockfish version info");
    }
    else if (message.includes("Threads")) {
        log(`Thread setting response: ${message}`);
    }
    else if (!message ||
        message.startsWith("id name ") ||
        message.startsWith("id author ") ||
        message.startsWith("option name Debug ") ||
        message.startsWith("option name Hash ") ||
        message.startsWith("option name Clear Hash ") ||
        message.startsWith("option name Ponder ") ||
        message.startsWith("option name MultiPV ") ||
        message.startsWith("option name Skill ") ||
        message.startsWith("option name Move Overhead ") ||
        message.startsWith("option name Slow Mover ") ||
        message.startsWith("option name nodestime ") ||
        message.startsWith("option name UCI_Chess960 ") ||
        message.startsWith("option name UCI_AnalyseMode ") ||
        message.startsWith("option name UCI_LimitStrength ") ||
        message.startsWith("option name UCI_Elo ") ||
        message.startsWith("option name UCI_ShowWDL ") ||
        message.startsWith("option name Use NNUE ") ||
        message.startsWith("option name EvalFile ")) {
        // ignore
    }
    else {
        console.log("Unexpected stockfish uci message:", message);
    }
}
/**
 * Parse info message from Stockfish
 */
function parseInfoMessage(message) {
    if (!stockfishState.currentAnalysis || !stockfishState.isAnalyzing)
        return;
    const parts = message.split(" ");
    let depth = 0;
    let score = 0;
    let pv = [];
    let nodes = 0;
    let nps = 0;
    let time = 0;
    let multipv = 1; // Default to first principal variation
    let mateIn = 0;
    for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        switch (part) {
            case "depth": {
                depth = parseInt(parts[++i]);
                break;
            }
            case "multipv": {
                // Sort of a line identifier but not reliable/consistent throughout a search so effectively meaningless for us
                multipv = parseInt(parts[++i]);
                break;
            }
            case "score": {
                const scoreType = parts[++i];
                if (scoreType === "cp") {
                    score = parseInt(parts[++i]);
                }
                else if (scoreType === "mate") {
                    const mateScore = parseInt(parts[++i]);
                    score = mateScore > 0 ? 10000 : -10000;
                }
                break;
            }
            case "nodes": {
                nodes = parseInt(parts[++i]);
                break;
            }
            case "time": {
                time = parseInt(parts[++i]);
                break;
            }
            case "pv": {
                // Collect all remaining parts as PV moves
                pv = parts.slice(++i);
                i = parts.length; // break out of the loop
                break;
            }
            case "mate": {
                mateIn = parseInt(parts[++i]);
                break;
            }
            case "nps": {
                nps = parseInt(parts[++i]);
                break;
            }
            case "seldepth":
            case "multipv":
            case "hashfull":
            case "currmovenumber":
            case "currmove": {
                ++i; // skip
                break;
            }
            case "string": {
                // skip remainder
                i = parts.length;
                break;
            }
            case "lowerbound":
            case "upperbound": {
                break;
            }
            default: {
                console.log("Unexpected stockfish info message part:", part, [message]);
            }
        }
    }
    // Okay, we basically only care about infos with a pv
    if (pv.length === 0) {
        // console.log('No pv in info message, skipping...');
        return;
    }
    // Normalize score to always be from white's perspective
    // When it's black's turn, Stockfish returns scores from black's perspective
    // Use the original FEN passed to analyzePosition; do not depend on currentAnalysis snapshot
    const fen = stockfishState.fen || "";
    assertFenParsable("stockfish-info(position)", fen, { message });
    // TOFIX: which fen is this getting? is this even getting a fen at all?
    const position = fen && parseFEN(fen);
    let isBlack = !!(position && position.turn === PLAYER_COLORS.BLACK);
    if (isBlack) {
        score = -score;
    }
    // Convert PV moves to ChessMove objects, validating sequentially from fen
    const pvMoves = [];
    let validateFen = fen;
    for (let idx = 0; idx < pv.length; idx++) {
        const moveStr = pv[idx];
        const move = parseLongMove(moveStr, validateFen);
        if (!move) {
            console.warn("stockfish-info: failed to parse PV move", {
                moveStr,
                validateFen,
            });
            // If PV looks corrupt (parse failed), stop ongoing analysis to avoid cascading
            return; // skip this info update entirely
        }
        // For the first move, sanity check side-to-move matches
        if (idx === 0) {
            const pos0 = parseFEN(validateFen);
            const isWhitePiece = move.piece === move.piece.toUpperCase();
            const shouldBeWhite = pos0.turn === PLAYER_COLORS.WHITE;
            if (isWhitePiece !== shouldBeWhite) {
                console.warn("stockfish-info: PV[0] does not match side-to-move; skipping info line", {
                    fen: validateFen,
                    moveStr,
                    piece: move.piece,
                    turn: pos0.turn,
                });
                return; // skip this info update
            }
        }
        // Normalize castling for validation (king two files on same rank)
        // Note: we don't validate it, just assert that if the king moves two spaces, it must be castling
        if ((move.from === "e1" && move.to === "g1" && move.piece === "K") ||
            (move.from === "e1" && move.to === "c1" && move.piece === "K") ||
            (move.from === "e8" && move.to === "g8" && move.piece === "k") ||
            (move.from === "e8" && move.to === "c8" && move.piece === "k")) {
            move.special = "castling";
            move.rookFrom =
                move.to === "g1"
                    ? "h1"
                    : move.to === "c1"
                        ? "a1"
                        : move.to === "g8"
                            ? "h8"
                            : "a8";
            move.rookTo =
                move.to === "g1"
                    ? "f1"
                    : move.to === "c1"
                        ? "d1"
                        : move.to === "g8"
                            ? "f8"
                            : "d8";
        }
        // Validate move; if invalid, HARD STOP fishing for investigation
        const vr = analyzeMove(validateFen, move);
        if (!vr.isValid) {
            console.error("stockfish-info: HARD-STOP — validator rejected engine PV move", {
                fen: validateFen,
                moveStr,
                index: idx,
                error: vr.error,
                pv,
            });
            // Trigger global assertion failure to stop fishing immediately
            ASSERT(false, "Engine PV move rejected by validator", {
                source: "stockfish-info",
                fen: validateFen,
                moveStr,
                index: idx,
                error: vr.error,
                pv,
            });
            return;
        }
        pvMoves.push(move);
        validateFen = applyMoveToFEN(validateFen, move, { assert: false });
    }
    if (pv.length !== pvMoves.length) {
        console.warn("stockfish-info: PV length mismatch", [message], [pv], [pvMoves], {
            fen,
            pvLength: pv.length,
            pvMovesLength: pvMoves.length,
        });
        return;
    }
    const firstMove = pvMoves[0];
    if (!firstMove) {
        console.warn("stockfish-info: dropping PV because no valid moves remained", [message], [pv], {
            fen,
            pvLength: pv.length,
        });
        return;
    }
    const analysisMove = {
        move: firstMove,
        score,
        depth,
        pv: pvMoves,
        nodes,
        time,
        multipv, // Add multipv to track which variation this is
        mateIn, // Actual number of moves required for mate
    };
    // Add new variation
    log(`Adding new move ${firstMove.from}${firstMove.to} (multipv=${multipv}) at depth ${depth}, isBlack=${isBlack}, moves=${stockfishState.currentAnalysis.moves.map((m) => m.move.from + m.move.to).join(", ")}`);
    ASSERT(analysisMove.move != null, "stockfish-info: analysisMove.move missing", { analysisMove });
    stockfishState.currentAnalysis.moves.push(analysisMove);
    // Broadcast live stats for interested UIs (e.g., Fisher)
    try {
        window.dispatchEvent(new CustomEvent("stockfish-stats", {
            detail: { nps, depth, nodes, time },
        }));
    }
    catch { }
    // Determine direction based on whose turn it is
    const direction = isBlack ? "asc" : "desc";
    // Sort moves based on direction
    stockfishState.currentAnalysis.moves.sort((a, b) => {
        return compareAnalysisMoves(a, b, direction);
    });
    stockfishState.onUpdate(stockfishState.currentAnalysis);
}
/**
 * Handle best move message
 */
async function handleStockfishBestMoveMessage() {
    stockfishState.isAnalyzing = false;
    if (stockfishState.currentAnalysis) {
        stockfishState.currentAnalysis.completed = true;
        stockfishState.onUpdate(stockfishState.currentAnalysis);
        // TOFIX: which fen is this getting? is this even getting a fen at all?
        // const fen = stockfishState.currentAnalysis?.position || "";
        // const position = fen && parseFEN(fen);
        // let isBlack = !!(position && position.turn === PLAYER_COLORS.BLACK);
        // console.log('Final score of this pass: isblack=', isBlack, ', moves=', stockfishState.currentAnalysis.moves);
        // await emphasizeFishTickerWithPause();
        stockfishState.resolve(stockfishState.currentAnalysis);
    }
    else {
        throw new Error("No current analysis to resolve");
    }
}
// ============================================================================
// ANALYSIS FUNCTIONS
// ============================================================================
/**
 * Analyze position with Stockfish
 */
export async function analyzePosition(fen, options = {}, onUpdate) {
    if (stockfishState.isAnalyzing) {
        throw new Error("Stockfish analyzePosition() called while already analyzing");
    }
    const promise = new Promise((resolve, reject) => {
        stockfishState.resolve = resolve;
        stockfishState.reject = reject;
    });
    stockfishState.onUpdate = onUpdate;
    stockfishState.fen = fen;
    stockfishState.isAnalyzing = true;
    await analyzePositionMono(fen, options);
    return promise;
}
async function analyzePositionMono(fen, options = {}) {
    // Validate input parameters
    if (!fen || typeof fen !== "string") {
        console.warn("Stockfish analyzePosition: Invalid FEN parameter:", fen, options);
        throw new Error("Invalid FEN parameter");
    }
    if (!stockfishState.isOk) {
        console.log("Waiting 1s for Stockfish to isOk...");
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return await analyzePositionMono(fen, options);
    }
    // Validate FEN format
    const fenParts = fen.split(" ");
    if (fenParts.length < 4) {
        console.warn("Stockfish analyzePosition: Invalid FEN format:", fen);
        throw new Error("Invalid FEN format");
    }
    // Create new analysis result
    const analysisResult = {
        moves: [],
        position: fen,
        depth: options.depth || 20,
        completed: false,
    };
    stockfishState.currentAnalysis = analysisResult;
    // Setup Stockfish internal state
    uciCmd("ucinewgame");
    uciCmd("position fen " + fen);
    uciCmd(`setoption name Threads value ${options.threads || 1}`);
    // If a targetMove is provided, force MultiPV=1 and restrict search to that move
    const forceSinglePv = !!options.targetMove;
    const multiPvValue = forceSinglePv ? 1 : options.multiPV || 1;
    uciCmd(`setoption name MultiPV value ${multiPvValue}`);
    const searchmoves = options.targetMove
        ? [`searchmoves ${options.targetMove}`]
        : options.searchMoves && options.searchMoves.length
            ? [`searchmoves ${options.searchMoves.join(" ")}`]
            : [];
    stockfishState.go = [
        "go",
        options.depth ? `depth ${options.depth}` : "",
        ...searchmoves,
    ]
        .filter(Boolean)
        .join(" ");
    // console.log("Sending isready...", options);
    uciCmd("isready");
}
export function stopAnalysis() {
    if (stockfishState.isAnalyzing) {
        uciCmd("stop");
        updateStockfishState({ isAnalyzing: false });
    }
}
// Expose a snapshot of the current analysis (for UI rendering)
export function getCurrentAnalysisSnapshot() {
    const cur = stockfishState.currentAnalysis;
    if (!cur)
        return null;
    return {
        position: cur.position,
        depth: cur.depth,
        completed: cur.completed,
        moves: [...cur.moves],
    };
}
/**
 * Handle Stockfish crash and reset UI state
 */
export function handleStockfishCrash() {
    logError("Stockfish crash detected, resetting UI state...");
    // Reset Stockfish state
    stockfishState.isOk = false;
    stockfishState.isAnalyzing = false;
    stockfishState.currentAnalysis = null;
    stockfishState.resolve = Promise.resolve;
    stockfishState.reject = Promise.reject;
    // Terminate existing worker if it exists
    if (stockfishState.worker) {
        try {
            stockfishState.worker.terminate();
        }
        catch (error) {
            logError("Error terminating Stockfish worker:", error);
        }
        updateStockfishState({ worker: null });
    }
    // Show error notification
    showErrorToast("Stockfish crashed. Please refresh the page to restart.");
    // Dispatch crash event for UI components to handle
    window.dispatchEvent(new CustomEvent("stockfish-crash"));
}
/**
 * Check if currently analyzing
 */
export function isAnalyzingPosition() {
    return stockfishState.isAnalyzing;
}
//# sourceMappingURL=stockfish-client.js.map