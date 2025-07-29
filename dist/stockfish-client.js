import { parseFEN, squareToCoords, log, logError, querySelectorHTMLElement, querySelectorButton, } from "./utils.js";
// ============================================================================
// SHAREDARRAYBUFFER DETECTION
// ============================================================================
/**
 * Check if SharedArrayBuffer is available and supported
 */
const isSharedArrayBufferSupported = () => {
    try {
        // Check if SharedArrayBuffer exists
        if (typeof SharedArrayBuffer === "undefined") {
            return false;
        }
        // Check if WebAssembly threads are supported
        if (typeof WebAssembly === "undefined" || !WebAssembly.Memory) {
            return false;
        }
        // Try to create a shared memory instance
        const memory = new WebAssembly.Memory({
            initial: 1,
            maximum: 1,
            shared: true,
        });
        // Check if the buffer is actually a SharedArrayBuffer
        return memory.buffer instanceof SharedArrayBuffer;
    }
    catch (error) {
        logError("SharedArrayBuffer not supported:", error);
        return false;
    }
};
/**
 * Get the appropriate Stockfish worker URL based on environment
 */
const getStockfishWorkerUrl = () => {
    if (isSharedArrayBufferSupported()) {
        return "dist/stockfish.js";
    }
    else {
        // For GitHub Pages, we'll need to use a different approach
        // This will be handled by the fallback mechanism
        return "dist/stockfish-single.js";
    }
};
/**
 * Stockfish state instance
 */
let stockfishState = {
    worker: null,
    isReady: false,
    isAnalyzing: false,
    currentAnalysis: null,
    analysisCallbacks: [],
    engineStatus: {
        engineLoaded: false,
        engineReady: false,
    },
    waitingForReady: false,
    pendingAnalysis: null,
    sharedArrayBufferSupported: isSharedArrayBufferSupported(),
    fallbackMode: false,
};
/**
 * Update Stockfish state
 */
const updateStockfishState = (updates) => {
    stockfishState = { ...stockfishState, ...updates };
};
/**
 * Get current Stockfish state
 */
const getStockfishState = () => ({ ...stockfishState });
/**
 * Check if running in fallback mode
 */
const isFallbackMode = () => stockfishState.fallbackMode;
// ============================================================================
// STOCKFISH INITIALIZATION
// ============================================================================
/**
 * Initialize Stockfish with fallback support
 */
const initializeStockfish = () => {
    try {
        const sharedArrayBufferSupported = isSharedArrayBufferSupported();
        updateStockfishState({
            sharedArrayBufferSupported,
            fallbackMode: !sharedArrayBufferSupported,
        });
        if (!sharedArrayBufferSupported) {
            log("SharedArrayBuffer not supported - using fallback mode");
            log("Note: Analysis performance may be reduced");
            // Show user notification about fallback mode
            showFallbackNotification();
        }
        log(`Initializing Stockfish with ${sharedArrayBufferSupported ? "multi-threaded" : "single-threaded"} mode...`);
        // Create Web Worker for Stockfish
        const workerUrl = getStockfishWorkerUrl();
        const worker = new Worker(workerUrl);
        // Set up message handler
        worker.onmessage = (event) => {
            const message = event.data;
            log("Received message from Stockfish:", message);
            handleMessage(message);
        };
        // Set up error handler
        worker.onerror = (error) => {
            logError("Stockfish worker error:", error);
            // If the main worker fails, try fallback
            if (!stockfishState.fallbackMode) {
                log("Trying fallback mode...");
                updateStockfishState({ fallbackMode: true });
                initializeStockfishFallback();
            }
        };
        updateStockfishState({ worker });
        // Initialize with UCI protocol
        log("Starting UCI protocol...");
        uciCmd("uci");
    }
    catch (error) {
        logError("Failed to initialize Stockfish:", error);
        // Try fallback if main initialization fails
        if (!stockfishState.fallbackMode) {
            log("Trying fallback mode...");
            updateStockfishState({ fallbackMode: true });
            initializeStockfishFallback();
        }
    }
};
/**
 * Initialize Stockfish in fallback mode (single-threaded)
 */
const initializeStockfishFallback = () => {
    try {
        log("Initializing Stockfish in fallback mode...");
        // Create Web Worker for single-threaded Stockfish
        const worker = new Worker("dist/stockfish-single.js");
        // Set up message handler
        worker.onmessage = (event) => {
            const message = event.data;
            log("Received message from Stockfish fallback:", message);
            handleMessage(message);
        };
        // Set up error handler
        worker.onerror = (error) => {
            logError("Stockfish fallback worker error:", error);
        };
        updateStockfishState({
            worker,
            fallbackMode: true,
        });
        // Initialize with UCI protocol
        log("Starting UCI protocol for fallback mode...");
        uciCmd("uci");
        // Notify user about fallback mode
        showFallbackNotification();
    }
    catch (error) {
        logError("Failed to initialize Stockfish fallback:", error);
    }
};
/**
 * Show notification about fallback mode
 */
const showFallbackNotification = () => {
    // Create notification element
    const notification = document.createElement("div");
    notification.className = "fallback-notification";
    notification.innerHTML = `
    <div class="notification-content">
      <strong>Single-Threaded Analysis Mode</strong><br>
      Note: Using fallback mode for compatibility.<br>
      Analysis includes full engine lines but may be slower because multi-threading is not supported without special http headers.
      <button onclick="this.parentElement.parentElement.remove()">×</button>
    </div>
  `;
    // Add styles
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
    const contentElement = querySelectorHTMLElement(notification, ".notification-content");
    if (contentElement) {
        contentElement.style.cssText = `
      position: relative;
    `;
    }
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
};
/**
 * Send UCI command to Stockfish
 */
const uciCmd = (cmd) => {
    log("UCI Command:", cmd);
    if (stockfishState.worker) {
        stockfishState.worker.postMessage(cmd);
    }
};
// ============================================================================
// MESSAGE HANDLING
// ============================================================================
/**
 * Handle messages from Stockfish
 */
const handleMessage = (message) => {
    if (message === "uciok") {
        log("UCI protocol ready, engine loaded");
        updateStockfishState({
            engineStatus: { ...stockfishState.engineStatus, engineLoaded: true },
        });
        uciCmd("isready");
    }
    else if (message === "readyok") {
        log("Stockfish is ready!");
        updateStockfishState({
            engineStatus: { ...stockfishState.engineStatus, engineReady: true },
            isReady: true,
        });
        if (stockfishState.pendingAnalysis) {
            stockfishState.pendingAnalysis();
            updateStockfishState({ pendingAnalysis: null });
        }
    }
    else if (message.startsWith("bestmove")) {
        handleBestMove(message);
    }
    else if (message.startsWith("info")) {
        parseInfoMessage(message);
    }
    else if (message.startsWith("Stockfish")) {
        log("Received Stockfish version info");
    }
};
/**
 * Parse info message from Stockfish
 */
const parseInfoMessage = (message) => {
    if (!stockfishState.currentAnalysis || !stockfishState.isAnalyzing)
        return;
    const parts = message.split(" ");
    let depth = 0;
    let score = 0;
    let pv = [];
    let nodes = 0;
    let time = 0;
    let multipv = 1; // Default to first principal variation
    for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        switch (part) {
            case "depth":
                depth = parseInt(parts[++i]);
                break;
            case "multipv":
                multipv = parseInt(parts[++i]);
                break;
            case "score":
                const scoreType = parts[++i];
                if (scoreType === "cp") {
                    score = parseInt(parts[++i]);
                }
                else if (scoreType === "mate") {
                    const mateScore = parseInt(parts[++i]);
                    score = mateScore > 0 ? 10000 : -10000;
                }
                break;
            case "nodes":
                nodes = parseInt(parts[++i]);
                break;
            case "time":
                time = parseInt(parts[++i]);
                break;
            case "pv":
                // Collect all remaining parts as PV moves
                pv = parts.slice(++i);
                break;
        }
    }
    // Log the parsed info for debugging
    log(`Info: depth=${depth}, multipv=${multipv}, score=${score}, nodes=${nodes}, time=${time}, pv=${pv.join(" ")}`);
    // Convert PV moves to ChessMove objects
    const pvMoves = [];
    for (const moveStr of pv) {
        const move = parseRawMove(moveStr);
        if (move) {
            pvMoves.push(move);
        }
    }
    // Update analysis result
    if (stockfishState.currentAnalysis && pvMoves.length > 0) {
        const firstMove = pvMoves[0];
        // Find existing move by move coordinates (from and to squares)
        // This is more reliable than multipv in single-threaded mode
        const existingMoveIndex = stockfishState.currentAnalysis.moves.findIndex((move) => move.move.from === firstMove.from &&
            move.move.to === firstMove.to &&
            move.move.piece === firstMove.piece);
        const analysisMove = {
            move: firstMove,
            score,
            depth,
            pv: pvMoves,
            nodes,
            time,
            multipv, // Add multipv to track which variation this is
        };
        if (existingMoveIndex >= 0) {
            // Update existing move with new depth and score
            // Only update if this result is better (higher depth or better score)
            const existingMove = stockfishState.currentAnalysis.moves[existingMoveIndex];
            const shouldUpdate = depth > existingMove.depth ||
                (depth === existingMove.depth && score > existingMove.score);
            if (shouldUpdate) {
                log(`Updating existing move ${firstMove.from}${firstMove.to} (multipv=${multipv}) at depth ${depth}`);
                stockfishState.currentAnalysis.moves[existingMoveIndex] = analysisMove;
            }
            else {
                log(`Skipping update for ${firstMove.from}${firstMove.to} - existing result is better (depth: ${existingMove.depth} vs ${depth})`);
                return; // Don't trigger callback if we didn't update
            }
        }
        else {
            // Add new variation
            log(`Adding new move ${firstMove.from}${firstMove.to} (multipv=${multipv}) at depth ${depth}`);
            stockfishState.currentAnalysis.moves.push(analysisMove);
        }
        // Sort moves by score (best first), then by depth for same scores
        stockfishState.currentAnalysis.moves.sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }
            return b.depth - a.depth; // Higher depth first for same scores
        });
        // Notify callbacks
        stockfishState.analysisCallbacks.forEach((callback) => {
            callback(stockfishState.currentAnalysis);
        });
    }
};
/**
 * Handle best move message
 */
const handleBestMove = (message) => {
    const parts = message.split(" ");
    if (parts.length >= 2) {
        const bestMove = parts[1];
        log("Best move:", bestMove);
        // Stop analysis
        updateStockfishState({ isAnalyzing: false });
        if (stockfishState.currentAnalysis) {
            stockfishState.currentAnalysis.completed = true;
            // Notify callbacks of final result
            stockfishState.analysisCallbacks.forEach((callback) => {
                callback(stockfishState.currentAnalysis);
            });
        }
    }
};
/**
 * Parse raw move string from Stockfish
 */
const parseRawMove = (moveStr) => {
    if (moveStr.length !== 4)
        return null;
    const from = moveStr.substring(0, 2);
    const to = moveStr.substring(2, 4);
    // Determine piece type from current board position
    const currentFEN = stockfishState.currentAnalysis?.position || "";
    if (!currentFEN)
        return null;
    const board = parseFEN(currentFEN).board;
    const [fromRank, fromFile] = squareToCoords(from);
    if (fromRank < 0 || fromRank >= 8 || fromFile < 0 || fromFile >= 8)
        return null;
    const piece = board[fromRank][fromFile];
    if (!piece)
        return null;
    return { from, to, piece };
};
/**
 * Parse move string (for compatibility)
 */
const parseMove = (moveStr) => {
    return parseRawMove(moveStr);
};
// ============================================================================
// ANALYSIS FUNCTIONS
// ============================================================================
/**
 * Analyze position with Stockfish
 */
const analyzePosition = async (fen, options = {}, onUpdate) => {
    return new Promise((resolve, reject) => {
        if (!stockfishState.isReady) {
            log("Stockfish not ready, queuing analysis...");
            updateStockfishState({
                pendingAnalysis: () => analyzePosition(fen, options, onUpdate).then(resolve).catch(reject),
            });
            return;
        }
        // Create new analysis result
        const analysisResult = {
            moves: [],
            position: fen,
            depth: options.depth || 20,
            completed: false,
        };
        updateStockfishState({
            currentAnalysis: analysisResult,
            isAnalyzing: true,
        });
        if (onUpdate) {
            updateStockfishState({
                analysisCallbacks: [...stockfishState.analysisCallbacks, onUpdate],
            });
        }
        // Set up completion callback
        const finalCallback = (result) => {
            if (result.completed) {
                resolve(result);
                // Remove this callback
                updateStockfishState({
                    analysisCallbacks: stockfishState.analysisCallbacks.filter((cb) => cb !== finalCallback),
                });
            }
        };
        updateStockfishState({
            analysisCallbacks: [...stockfishState.analysisCallbacks, finalCallback],
        });
        // Configure Stockfish
        uciCmd("position fen " + fen);
        // Set options
        if (options.threads) {
            uciCmd(`setoption name Threads value ${options.threads}`);
        }
        if (options.hash) {
            uciCmd(`setoption name Hash value ${options.hash}`);
        }
        if (options.multiPV) {
            uciCmd(`setoption name MultiPV value ${options.multiPV}`);
        }
        // Start analysis
        const goCommand = [
            "go",
            options.depth ? `depth ${options.depth}` : "",
            options.movetime ? `movetime ${options.movetime}` : "",
            options.nodes ? `nodes ${options.nodes}` : "",
        ]
            .filter(Boolean)
            .join(" ");
        uciCmd(goCommand);
    });
};
const stopAnalysis = () => {
    if (stockfishState.isAnalyzing) {
        uciCmd("stop");
        updateStockfishState({ isAnalyzing: false });
    }
};
/**
 * Check if currently analyzing
 */
const isAnalyzingPosition = () => stockfishState.isAnalyzing;
/**
 * Get current analysis result
 */
const getCurrentAnalysis = () => stockfishState.currentAnalysis;
/**
 * Destroy Stockfish client
 */
const destroy = () => {
    stopAnalysis();
    if (stockfishState.worker) {
        stockfishState.worker.terminate();
        updateStockfishState({ worker: null });
    }
    updateStockfishState({
        isReady: false,
        isAnalyzing: false,
        currentAnalysis: null,
        analysisCallbacks: [],
        engineStatus: { engineLoaded: false, engineReady: false },
        waitingForReady: false,
        pendingAnalysis: null,
    });
};
// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================
export { 
// Initialization
initializeStockfish, 
// State management
getStockfishState, updateStockfishState, 
// Analysis
analyzePosition, stopAnalysis, isAnalyzingPosition, getCurrentAnalysis, 
// Utility
destroy, isFallbackMode, };
//# sourceMappingURL=stockfish-client.js.map