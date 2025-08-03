import { log } from "./utils/logging.js";
import { applyMoveToFEN } from "./utils/fen-manipulation.js";
import { parseMove } from "./utils/move-parsing.js";
import { rawMoveToSAN } from "./utils/notation-utils.js";
import { calculateTotalNodes, calculateTotalLines, } from "./utils/line-fisher-calculations.js";
import * as Stockfish from "./stockfish-client.js";
import { updateLineFisherConfigDisplay, updateLineFisherProgressDisplay, updateLineFisherExploredLines, } from "./utils/line-fisher-results.js";
import { updateLineFisherStatus } from "./utils/status-management.js";
import { addLineFisherTooltips, addLineFisherKeyboardShortcuts, } from "./utils/line-fisher-ui-utils.js";
import { getFEN } from "./chess-board.js";
// Track app start time for relative timestamps
const appStartTime = performance.now();
const getRelativeTime = () => {
    const elapsed = performance.now() - appStartTime;
    return `${(elapsed / 1000).toFixed(3)}s`;
};
// ============================================================================
// LINE FISHER CORE ANALYSIS ENGINE
// ============================================================================
/**
 * Create initial Line Fisher state
 */
const createInitialLineFisherState = () => ({
    isAnalyzing: false,
    config: {
        initiatorMoves: [],
        responderMoveCounts: [2, 2, 2, 2, 2], // Default: 2 responses per level
        maxDepth: 3,
        threads: 4,
        defaultResponderCount: 3, // Default responder count
    },
    progress: {
        totalNodes: 0,
        processedNodes: 0,
        totalLines: 0,
        completedLines: 0,
        currentPosition: "",
        currentAction: "Ready",
        eventsPerSecond: 0,
        totalEvents: 0,
        startTime: 0,
    },
    results: [],
    analyzedPositions: new Set(),
    analysisQueue: [],
    isComplete: false,
    rootNodes: [], // Initialize rootNodes
});
/**
 * Line Fisher Analysis Engine
 *
 * This module implements deep line analysis by building a recursive tree of moves
 * and responses. It starts from the current board position and explores multiple
 * lines to a specified depth, with user-defined initiator moves and configurable
 * responder move counts.
 *
 * Key Features:
 * - User-defined initiator moves for controlled analysis
 * - Configurable responder move counts for each level
 * - Transposition detection to avoid redundant work
 * - Real-time progress tracking and UI updates
 * - State persistence for sharing and resuming analysis
 * - Performance optimizations for large search spaces
 */
// Global state for Line Fisher analysis
let lineFisherState = createInitialLineFisherState();
/**
 * Track Stockfish events for progress monitoring
 */
let stockfishEventCount = 0;
let lastEventTime = 0;
let eventsInLastSecond = 0;
/**
 * Increment Stockfish event counter
 */
const trackStockfishEvent = () => {
    stockfishEventCount++;
    const now = Date.now();
    // Reset events per second counter if more than 1 second has passed
    if (now - lastEventTime >= 1000) {
        eventsInLastSecond = 0;
        lastEventTime = now;
    }
    eventsInLastSecond++;
    // Update progress
    lineFisherState.progress.totalEvents = stockfishEventCount;
    lineFisherState.progress.eventsPerSecond = eventsInLastSecond;
};
/**
 * Initialize Line Fisher with default configuration
 * Sets up the initial state and prepares for analysis
 */
export const initializeLineFisher = async () => {
    // Reset state to initial values
    lineFisherState = createInitialLineFisherState();
    // Initialize progress calculations
    initializeLineFisherProgress(lineFisherState);
    // Initialize UI enhancements
    try {
        addLineFisherTooltips();
        addLineFisherKeyboardShortcuts();
    }
    catch (error) {
        // UI enhancements failed, continue without them
    }
};
/**
 * Get current Line Fisher state
 * Returns a copy of the current state for external access
 */
export const getLineFisherState = () => {
    return { ...lineFisherState };
};
/**
 * Update Line Fisher state
 * Safely updates the global state with new values
 */
export const updateLineFisherState = (newState) => {
    lineFisherState = { ...lineFisherState, ...newState };
};
/**
 * Check if a position has already been analyzed (transposition detection)
 */
const isPositionAnalyzed = (fen, state) => {
    return state.analyzedPositions.has(fen);
};
/**
 * Find the result index for a given node
 */
const findResultForNode = (node, results) => {
    // Find the result that contains this node's move
    for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result.moves.length > 0 &&
            result.moves[result.moves.length - 1].from === node.move.from &&
            result.moves[result.moves.length - 1].to === node.move.to) {
            return i;
        }
    }
    return -1;
};
/**
 * Calculate delta for a move score against the baseline
 */
const calculateDelta = (score, baselineScore) => {
    if (baselineScore === undefined) {
        return 0; // No baseline available
    }
    return score - baselineScore;
};
/**
 * Build Line Fisher analysis tree
 * Recursively build the analysis tree by processing moves at each depth
 */
const buildLineFisherTree = async (fen, state, parentNode, depth) => {
    // Check if analysis has been stopped
    if (!state.isAnalyzing) {
        return;
    }
    // Check depth limit - stop if we've reached the maximum depth
    // Lines should end with initiator's move, so we need odd number of half-moves
    if (depth >= state.config.maxDepth * 2 + 1) {
        log("Max depth reached for this line, stopping analysis");
        // Log completion immediately when work is done
        if (parentNode) {
            // Log completion when max depth is reached
        }
        return;
    }
    // Check if position has already been analyzed (transposition detection)
    const isTransposition = isPositionAnalyzed(fen, state);
    // Update progress - count the node even if it's a transposition
    state.progress.processedNodes++;
    state.progress.currentPosition = fen;
    // If it's a transposition, we don't need to analyze it again
    if (isTransposition) {
        if (parentNode) {
            const resultIndex = findResultForNode(parentNode, state.results);
            if (resultIndex !== -1) {
                state.results[resultIndex].isComplete = true;
            }
        }
        return;
    }
    // Mark position as analyzed
    state.analyzedPositions.add(fen);
    // Check if this line is completed (reached max depth or can't continue)
    // Lines should end with initiator's move, so we need odd number of half-moves
    const maxDepthReached = depth >= state.config.maxDepth * 2;
    const isLineCompleted = maxDepthReached;
    if (isLineCompleted) {
        state.progress.completedLines++;
        // Mark the current result line as complete if we have a parent node
        if (parentNode) {
            const resultIndex = findResultForNode(parentNode, state.results);
            if (resultIndex !== -1) {
                state.results[resultIndex].isComplete = true;
            }
        }
    }
    // Add score to incomplete lines when they are processed
    if (parentNode) {
        const resultIndex = findResultForNode(parentNode, state.results);
        if (resultIndex !== -1) {
            const result = state.results[resultIndex];
            // If the line has moves but no scores, add the score from the parent node
            if (result.moves.length > 0 &&
                result.scores.length === 0 &&
                parentNode.score !== 0) {
                result.scores.push(parentNode.score);
                result.deltas.push(calculateDelta(parentNode.score, state.baselineScore));
                result.isDone = true; // Line is now done (has received its score)
                result.updateCount++;
                // Update results display to show the score
                try {
                    updateLineFisherExploredLines(state.results);
                }
                catch (error) {
                    // UI update failed, continue analysis
                }
            }
        }
    }
    // Update UI for every node
    try {
        await updateLineFisherConfigDisplay(state);
        updateLineFisherProgressDisplay(state.progress);
        // Update status with progress information
        const progressPercent = state.progress.totalLines > 0
            ? Math.round((state.progress.completedLines / state.progress.totalLines) * 100)
            : 0;
        updateLineFisherStatus(`Analyzing... ${state.progress.processedNodes}/${state.progress.totalNodes} nodes (${progressPercent}%) - ${state.progress.completedLines} lines completed`);
    }
    catch (error) {
        // UI update failed, continue analysis
        console.error("UI update failed, continue analysis; non-blocking. Message:", error.message);
    }
    // Determine if this is initiator's turn or responder's turn
    const isInitiatorTurn = fen.split(" ")[1] === "w";
    if (isInitiatorTurn) {
        await processInitiatorMovesInTree(fen, state, parentNode, depth);
    }
    else {
        await processResponderMovesInTree(fen, state, parentNode, depth);
    }
};
/**
 * Process initiator moves in the tree
 * Handle initiator move analysis with user-defined moves or Stockfish fallback.
 * Apply user-defined initiator moves, use Stockfish analysis as fallback,
 * create nodes for each initiator move, and update progress
 */
const processInitiatorMovesInTree = async (fen, state, parentNode, depth) => {
    // Check if analysis has been stopped
    if (!state.isAnalyzing) {
        return;
    }
    // Calculate move number (1-based) and move index (0-based)
    const moveNumber = Math.floor(depth / 2) + 1;
    const moveIndex = moveNumber - 1; // Convert to 0-based index
    // Check if there's a predefined move for this move number
    const predefinedMove = state.config.initiatorMoves[moveIndex];
    if (predefinedMove) {
        await processInitiatorPredefinedMove(fen, state, parentNode, depth, moveNumber, predefinedMove);
    }
    else {
        await processInitiatorStockfishMove(fen, state, parentNode, depth, moveNumber);
    }
};
async function processInitiatorPredefinedMove(fen, state, parentNode, depth, moveNumber, predefinedMove) {
    // Use predefined initiator move
    try {
        const move = parseMove(predefinedMove, fen);
        if (!move) {
            console.error(`[${getRelativeTime()}] Failed to parse predefined move: ${predefinedMove}, abort now`);
            return;
        }
        // Add line to UI immediately (before Stockfish analysis)
        if (!parentNode) {
            // This is a root node - add to rootNodes array
            const tempNode = {
                fen,
                move,
                score: 0, // Temporary score
                depth,
                moveNumber,
                children: [],
                parent: parentNode || undefined,
            };
            state.rootNodes.push(tempNode);
            // Add this move immediately to results (without score)
            if (depth % 2 === 0) {
                // White move - add move number
                const moveNumber = Math.floor(depth / 2) + 1;
                const notation = `${moveNumber}. ${predefinedMove}`;
                state.results.push({
                    lineIndex: state.results.length,
                    moves: [move],
                    scores: [], // No score yet
                    deltas: [0],
                    notation,
                    isComplete: depth + 1 >= state.config.maxDepth * 2, // Mark as complete if this reaches max depth
                    isDone: false, // Line is not done yet (waiting for score)
                    updateCount: 0, // No updates yet
                });
            }
            else {
                // Black move - just add the move
                const notation = `${predefinedMove}`;
                state.results.push({
                    lineIndex: state.results.length,
                    moves: [move],
                    scores: [], // No score yet
                    deltas: [0],
                    notation,
                    isComplete: depth + 1 >= state.config.maxDepth * 2, // Mark as complete if this reaches max depth
                    isDone: false, // Line is not done yet (waiting for score)
                    updateCount: 0, // No updates yet
                });
            }
            // Update results display immediately
            try {
                updateLineFisherExploredLines(state.results);
            }
            catch (error) {
                // UI update failed, continue analysis
                console.error("Unexpected error thrown (ignored) during updateLineFisherExploredLines():", error);
            }
        }
        // Get evaluation from Stockfish
        state.progress.currentAction = `Analyzing predefined move ${predefinedMove}`;
        updateLineFisherProgressDisplay(state.progress);
        const analysisResult = await Stockfish.analyzePosition(fen, {
            depth: 20, // Increased depth for proper analysis
            multiPV: 1,
            threads: state.config.threads,
        });
        trackStockfishEvent();
        if (analysisResult &&
            analysisResult.moves &&
            analysisResult.moves.length > 0) {
            const bestMove = analysisResult.moves[0];
            const score = bestMove.score;
            const newNode = {
                fen,
                move,
                score,
                depth,
                moveNumber,
                children: [],
                parent: parentNode || undefined,
                analysisResult,
            };
            // Add to parent's children
            if (parentNode) {
                parentNode.children.push(newNode);
                // Find the corresponding result line and add this move
                const resultIndex = findResultForNode(parentNode, state.results);
                if (resultIndex !== -1) {
                    const result = state.results[resultIndex];
                    if (depth % 2 === 0) {
                        // White move - add move number
                        const moveNumber = Math.floor(depth / 2) + 1;
                        result.notation += ` ${moveNumber}. ${predefinedMove}`;
                    }
                    else {
                        // Black move - just add the move
                        result.notation += ` ${predefinedMove}`;
                    }
                    result.moves.push(move);
                    result.scores.push(score);
                    result.deltas.push(calculateDelta(score, state.baselineScore));
                    result.isDone = true; // Line is now done (has received its score)
                    result.updateCount++;
                    // Update results display
                    try {
                        updateLineFisherExploredLines(state.results);
                    }
                    catch (error) {
                        // UI update failed, continue analysis
                    }
                }
            }
            else {
                // Update the existing root node with the real score
                const rootNodeIndex = state.rootNodes.length - 1;
                if (rootNodeIndex >= 0) {
                    state.rootNodes[rootNodeIndex] = newNode;
                }
                // Don't add the score yet - keep the line incomplete until it's processed further
                // The score will be added when the line is actually analyzed in buildLineFisherTree
            }
            // Continue building the tree from the new position
            const newFen = applyMoveToFEN(fen, move);
            await buildLineFisherTree(newFen, state, newNode, depth + 1);
        }
    }
    catch (error) {
        // Update UI status with error
        updateLineFisherStatus(`Error processing move ${predefinedMove}: ${error instanceof Error ? error.message : String(error)}`);
    }
    // Update progress after processing predefined move
    try {
        updateLineFisherProgressDisplay(state.progress);
    }
    catch (error) {
        // UI update failed, continue analysis
        console.error("Unexpected error thrown (ignored) during updateLineFisherProgressDisplay():", error);
    }
}
async function processInitiatorStockfishMove(fen, state, parentNode, depth, moveNumber) {
    // No predefined move - get best move from Stockfish
    try {
        state.progress.currentAction = `Finding best initiator move for line ${moveNumber}`;
        updateLineFisherProgressDisplay(state.progress);
        const analysisResult = await Stockfish.analyzePosition(fen, {
            depth: 20, // Increased depth for proper analysis
            multiPV: 1,
            threads: state.config.threads,
        });
        trackStockfishEvent();
        if (analysisResult &&
            analysisResult.moves &&
            analysisResult.moves.length > 0) {
            const bestMove = analysisResult.moves[0];
            const moveNotation = bestMove.move.san ||
                rawMoveToSAN(`${bestMove.move.from}${bestMove.move.to}`, fen);
            const move = parseMove(moveNotation, fen);
            if (move) {
                const newNode = {
                    fen,
                    move,
                    score: bestMove.score,
                    depth,
                    moveNumber,
                    children: [],
                    parent: parentNode || undefined,
                    analysisResult,
                };
                // Add to parent's children
                if (parentNode) {
                    parentNode.children.push(newNode);
                    // Find the corresponding result line and add this move
                    const resultIndex = findResultForNode(parentNode, state.results);
                    if (resultIndex !== -1) {
                        const result = state.results[resultIndex];
                        if (depth % 2 === 0) {
                            // White move - add move number
                            const moveNumber = Math.floor(depth / 2) + 1;
                            result.notation += ` ${moveNumber}. ${moveNotation}`;
                        }
                        else {
                            // Black move - just add the move
                            result.notation += ` ${moveNotation}`;
                        }
                        result.moves.push(move);
                        result.scores.push(bestMove.score);
                        result.deltas.push(calculateDelta(bestMove.score, state.baselineScore));
                        result.isDone = true; // Line is now done (has received its score)
                        result.updateCount++;
                        // Update results display
                        try {
                            updateLineFisherExploredLines(state.results);
                        }
                        catch (error) {
                            // UI update failed, continue analysis
                        }
                    }
                }
                else {
                    // This is a root node - add to rootNodes array
                    state.rootNodes.push(newNode);
                    // Add this move immediately to results
                    if (depth % 2 === 0) {
                        // White move - add move number
                        const moveNumber = Math.floor(depth / 2) + 1;
                        const notation = `${moveNumber}. ${moveNotation}`;
                        state.results.push({
                            lineIndex: state.results.length,
                            moves: [move],
                            scores: [bestMove.score], // We already have the score from Stockfish
                            deltas: [calculateDelta(bestMove.score, state.baselineScore)], // We can calculate delta immediately
                            notation,
                            isComplete: depth + 1 >= state.config.maxDepth * 2, // Mark as complete if this reaches max depth
                            isDone: true, // Line is done (we have the score and won't update it further)
                            updateCount: 1, // One update (the initial score)
                        });
                    }
                    else {
                        // Black move - just add the move
                        const notation = `${moveNotation}`;
                        state.results.push({
                            lineIndex: state.results.length,
                            moves: [move],
                            scores: [bestMove.score], // We already have the score from Stockfish
                            deltas: [calculateDelta(bestMove.score, state.baselineScore)], // We can calculate delta immediately
                            notation,
                            isComplete: depth + 1 >= state.config.maxDepth * 2, // Mark as complete if this reaches max depth
                            isDone: true, // Line is done (we have the score and won't update it further)
                            updateCount: 1, // One update (the initial score)
                        });
                    }
                    // Update results display immediately
                    try {
                        updateLineFisherExploredLines(state.results);
                    }
                    catch (error) {
                        // UI update failed, continue analysis
                        console.error("Unexpected error thrown (ignored) during updateLineFisherExploredLines():", error);
                    }
                }
                // Update the existing root node with the real score
                const rootNodeIndex = state.rootNodes.length - 1;
                if (rootNodeIndex >= 0) {
                    state.rootNodes[rootNodeIndex] = newNode;
                }
                // Continue building the tree from the new position
                const newFen = applyMoveToFEN(fen, move);
                await buildLineFisherTree(newFen, state, newNode, depth + 1);
            }
        }
    }
    catch (error) {
        // Update UI status with error
        updateLineFisherStatus(`Error getting best move from Stockfish: ${error instanceof Error ? error.message : String(error)}`);
    }
    // Update progress after processing Stockfish move
    try {
        updateLineFisherProgressDisplay(state.progress);
    }
    catch (error) {
        // UI update failed, continue analysis
        console.error("Unexpected error thrown (ignored) during updateLineFisherProgressDisplay():", error);
    }
}
/**
 * Process responder moves in the tree
 * Analyze multiple responder moves for each position.
 * Analyze multiple responder moves per position, use Stockfish for move generation,
 * create nodes for each responder move, and update progress
 */
const processResponderMovesInTree = async (fen, state, parentNode, depth) => {
    // Check if analysis has been stopped
    if (!state.isAnalyzing) {
        return;
    }
    // Calculate move number (1-based) and move index (0-based)
    const moveNumber = Math.floor(depth / 2) + 1;
    const moveIndex = moveNumber - 1; // Convert to 0-based index
    // Determine how many responder moves to analyze
    // Use count-override if available, otherwise use slider value
    const responderCountIndex = Math.min(moveIndex, state.config.responderMoveCounts.length - 1);
    const responderCount = state.config.responderMoveCounts.length > 0 && responderCountIndex >= 0
        ? state.config.responderMoveCounts[responderCountIndex]
        : state.config.defaultResponderCount;
    try {
        // Use Stockfish to analyze the position and get top moves
        state.progress.currentAction = `Finding top ${responderCount} responder moves`;
        updateLineFisherProgressDisplay(state.progress);
        const analysisResult = await Stockfish.analyzePosition(fen, {
            depth: 20, // Increased depth for proper analysis
            multiPV: responderCount,
            threads: state.config.threads,
        });
        trackStockfishEvent();
        if (analysisResult && analysisResult.moves) {
            // Sort moves by score (best first) and take top responderCount moves
            const sortedMoves = analysisResult.moves
                .sort((a, b) => b.score - a.score)
                .slice(0, responderCount);
            // First, add ALL lines to UI immediately with incomplete indicator
            const newLines = [];
            for (const moveData of sortedMoves) {
                // Skip invalid moves where from and to are the same
                if (moveData.move.from === moveData.move.to) {
                    continue;
                }
                const moveNotation = moveData.move.san ||
                    rawMoveToSAN(`${moveData.move.from}${moveData.move.to}`, fen);
                const move = parseMove(moveNotation, fen);
                if (move) {
                    const newNode = {
                        fen,
                        move,
                        score: moveData.score,
                        depth,
                        moveNumber,
                        children: [],
                        parent: parentNode || undefined,
                        analysisResult,
                    };
                    // Add to parent's children
                    if (parentNode) {
                        parentNode.children.push(newNode);
                        // Create a NEW line for this responder move
                        const parentResultIndex = findResultForNode(parentNode, state.results);
                        if (parentResultIndex !== -1) {
                            const parentResult = state.results[parentResultIndex];
                            // Check if this leads to a transposed position
                            const newFen = applyMoveToFEN(fen, move);
                            const isTransposition = state.analyzedPositions.has(newFen);
                            // Create new result line
                            const newResult = {
                                lineIndex: state.results.length,
                                moves: [...parentResult.moves, move],
                                scores: [...parentResult.scores], // Don't add score yet - will be added when analyzed
                                deltas: [...parentResult.deltas], // Don't add delta yet
                                notation: depth % 2 === 0
                                    ? parentResult.notation +
                                        ` ${Math.floor(depth / 2) + 1}. ${moveNotation}`
                                    : parentResult.notation + ` ${moveNotation}`,
                                isComplete: depth + 1 >= state.config.maxDepth * 2, // Mark as complete if this reaches max depth
                                isDone: false, // Line is not done yet (waiting for score)
                                isTransposition,
                                updateCount: 0, // No updates yet
                            };
                            newLines.push({ node: newNode, result: newResult });
                        }
                    }
                }
            }
            // Update the parent initiator line with the best 5 responder moves
            if (parentNode) {
                const parentResultIndex = findResultForNode(parentNode, state.results);
                if (parentResultIndex !== -1) {
                    const parentResult = state.results[parentResultIndex];
                    // Store the top 5 responder moves and their scores in simplified format
                    parentResult.responderMoveList = sortedMoves.slice(0, 5).map((moveData) => {
                        const moveNotation = moveData.move.san || `${moveData.move.from}${moveData.move.to}`;
                        const scoreInPawns = moveData.score / 100;
                        const scoreText = scoreInPawns > 0 ? `+${scoreInPawns.toFixed(1)}` : scoreInPawns.toFixed(1);
                        return `${moveNotation} (${scoreText})`;
                    });
                    // Mark the parent line as done since it has received its responder moves
                    parentResult.isDone = true;
                }
            }
            // Add all lines to state and update UI once
            for (const { result } of newLines) {
                state.results.push(result);
            }
            // Update results display to show all new lines with incomplete indicator
            try {
                updateLineFisherExploredLines(state.results);
            }
            catch (error) {
                // UI update failed, continue analysis
            }
            // Now process each line one by one
            for (const { node } of newLines) {
                // Continue building the tree from the new position
                const newFen = applyMoveToFEN(fen, node.move);
                await buildLineFisherTree(newFen, state, node, depth + 1);
            }
            // Log completion of responder analysis
            if (parentNode) {
                // Log completion of responder analysis
            }
        }
    }
    catch (error) {
        // Update UI status with error
        updateLineFisherStatus(`Error processing responder moves at depth ${depth}: ${error instanceof Error ? error.message : String(error)}`);
    }
};
// ============================================================================
// LINE FISHER PROGRESS TRACKING
// ============================================================================
/**
 * Update Line Fisher progress
 * Update progress tracking with current analysis state
 */
/**
 * Initialize Line Fisher progress
 */
const initializeLineFisherProgress = (state) => {
    const totalNodes = calculateTotalNodes(state.config);
    const totalLines = calculateTotalLines(state.config);
    state.progress = {
        totalNodes,
        processedNodes: 0,
        totalLines,
        completedLines: 0,
        currentPosition: "",
        currentAction: "Initializing...",
        eventsPerSecond: 0,
        totalEvents: 0,
        startTime: Date.now(),
    };
};
/**
 * Save Line Fisher progress
 */
const saveLineFisherProgress = (_state) => {
    try {
        const progressData = {
            timestamp: Date.now(),
            progress: _state.progress,
            results: _state.results,
            analyzedPositions: Array.from(_state.analyzedPositions),
        };
        localStorage.setItem("lineFisherProgress", JSON.stringify(progressData));
        log("Line Fisher progress saved");
    }
    catch (error) {
        log(`Failed to save Line Fisher progress: ${error}`);
    }
};
/**
 * Resume Line Fisher analysis from saved state
 */
const resumeLineFisherAnalysis = (_state) => {
    // The analysis can resume from the current state
    // The analyzedPositions set contains all positions that have been analyzed
    // The results array contains all completed lines
    // The progress object contains current progress information
};
/**
 * Handle Line Fisher interruption
 */
// ============================================================================
// LINE FISHER CORE ANALYSIS ENGINE
// ============================================================================
/**
 * Start Line Fisher analysis
 * Begin the fishing analysis process with current configuration
 */
export const startLineFisherAnalysis = async () => {
    // Get the current board position instead of always starting from the initial position
    const startFEN = getFEN();
    // Check if we're starting from the standard starting position
    const isStartingPosition = startFEN === "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    // Log the configuration immediately
    console.log("Line Fisher Configuration:", {
        initiatorMoves: lineFisherState.config.initiatorMoves,
        responderMoveCounts: lineFisherState.config.responderMoveCounts,
        maxDepth: lineFisherState.config.maxDepth,
        threads: lineFisherState.config.threads,
        defaultResponderCount: lineFisherState.config.defaultResponderCount,
        startFEN: startFEN,
    });
    try {
        // Reset Stockfish event counters
        stockfishEventCount = 0;
        lastEventTime = Date.now();
        eventsInLastSecond = 0;
        // Clear initiator moves and responder counts if not starting from the initial position
        if (!isStartingPosition) {
            lineFisherState.config.initiatorMoves = [];
            lineFisherState.config.responderMoveCounts = [2, 2, 2, 2, 2]; // Reset to defaults
            // Clear the UI inputs as well
            try {
                const initiatorMovesInput = document.getElementById("line-fisher-initiator-moves");
                const responderCountsInput = document.getElementById("line-fisher-responder-counts");
                if (initiatorMovesInput) {
                    initiatorMovesInput.value = "";
                    initiatorMovesInput.classList.remove("error"); // Clear any error styling
                }
                if (responderCountsInput) {
                    responderCountsInput.value = "";
                    responderCountsInput.classList.remove("error"); // Clear any error styling
                }
            }
            catch (error) {
                // UI update failed, continue analysis
            }
        }
        // Initialize progress
        initializeLineFisherProgress(lineFisherState);
        // Start analysis
        lineFisherState.isAnalyzing = true;
        lineFisherState.isComplete = false;
        lineFisherState.progress.startTime = Date.now();
        // Update UI status
        updateLineFisherStatus("Starting Line Fisher analysis...");
        // Update initial UI displays
        try {
            await updateLineFisherConfigDisplay(lineFisherState);
            updateLineFisherProgressDisplay(lineFisherState.progress);
        }
        catch (error) {
            // UI update failed, continue analysis
        }
        // Begin recursive tree building from the current position
        lineFisherState.progress.currentAction = "Starting analysis...";
        updateLineFisherProgressDisplay(lineFisherState.progress);
        // Get baseline score for delta calculations
        try {
            lineFisherState.progress.currentAction =
                "Getting baseline position score";
            updateLineFisherProgressDisplay(lineFisherState.progress);
            const baselineAnalysis = await Stockfish.analyzePosition(startFEN, {
                depth: 20,
                multiPV: 5,
                threads: lineFisherState.config.threads,
            });
            if (baselineAnalysis &&
                baselineAnalysis.moves &&
                baselineAnalysis.moves.length > 0) {
                lineFisherState.baselineScore = baselineAnalysis.moves[0].score;
                // Convert to simplified format with just move notation and score
                lineFisherState.baselineMoves = baselineAnalysis.moves.slice(0, 5).map((move) => ({
                    move: move.move.san || rawMoveToSAN(`${move.move.from}${move.move.to}`, startFEN),
                    score: move.score,
                }));
            }
        }
        catch (error) {
            console.warn("Failed to get baseline score:", error);
        }
        await buildLineFisherTree(startFEN, lineFisherState, null, 0);
        // Mark analysis as complete
        lineFisherState.isAnalyzing = false;
        lineFisherState.isComplete = true;
        lineFisherState.progress.currentAction = "Analysis complete";
        updateLineFisherProgressDisplay(lineFisherState.progress);
        // Update final UI displays
        try {
            await updateLineFisherConfigDisplay(lineFisherState);
            updateLineFisherProgressDisplay(lineFisherState.progress);
            updateLineFisherExploredLines(lineFisherState.results);
            // Final status update
            updateLineFisherStatus(`Line Fisher analysis completed - ${lineFisherState.progress.completedLines} lines analyzed`);
        }
        catch (error) {
            // UI update failed, continue analysis
        }
    }
    catch (error) {
        // Update UI status with error
        updateLineFisherStatus(`Line Fisher error: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
    }
};
/**
 * Stop Line Fisher analysis
 * Halt the current analysis process
 */
export const stopLineFisherAnalysis = () => {
    lineFisherState.isAnalyzing = false;
    // Save progress for potential continuation
    saveLineFisherProgress(lineFisherState);
};
/**
 * Reset Line Fisher analysis
 * Clear all results and reset to initial state
 */
export const resetLineFisherAnalysis = () => {
    // Reset state to initial values
    lineFisherState = createInitialLineFisherState();
};
/**
 * Find parent node for a given position
 */
const findParentNodeForPosition = (fen, rootNodes) => {
    for (const rootNode of rootNodes) {
        const found = findNodeInTree(rootNode, fen);
        if (found && found.parent) {
            return found.parent;
        }
    }
    return null;
};
/**
 * Calculate depth for a given position
 */
const calculateDepthForPosition = (fen, rootNodes) => {
    for (const rootNode of rootNodes) {
        const found = findNodeInTree(rootNode, fen);
        if (found) {
            return found.depth;
        }
    }
    return 0;
};
/**
 * Find a node in the tree by FEN
 */
const findNodeInTree = (node, fen) => {
    if (node.fen === fen) {
        return node;
    }
    for (const child of node.children) {
        const found = findNodeInTree(child, fen);
        if (found) {
            return found;
        }
    }
    return null;
};
/**
 * Continue Line Fisher analysis
 * Resume analysis from where it left off
 */
export const continueLineFisherAnalysis = async () => {
    try {
        // Resume from saved progress
        resumeLineFisherAnalysis(lineFisherState);
        // Continue analysis
        lineFisherState.isAnalyzing = true;
        lineFisherState.progress.currentAction = "Continuing analysis...";
        updateLineFisherProgressDisplay(lineFisherState.progress);
        // Continue from the analysis queue
        while (lineFisherState.analysisQueue.length > 0) {
            const nextPosition = lineFisherState.analysisQueue.shift();
            if (nextPosition && !lineFisherState.analyzedPositions.has(nextPosition)) {
                // Find the parent node for this position
                const parentNode = findParentNodeForPosition(nextPosition, lineFisherState.rootNodes);
                const depth = calculateDepthForPosition(nextPosition, lineFisherState.rootNodes);
                await buildLineFisherTree(nextPosition, lineFisherState, parentNode, depth);
            }
        }
        // If no more positions in queue, mark as complete
        if (lineFisherState.analysisQueue.length === 0) {
            lineFisherState.isComplete = true;
        }
        lineFisherState.isAnalyzing = false;
        lineFisherState.progress.currentAction = "Analysis complete";
        updateLineFisherProgressDisplay(lineFisherState.progress);
    }
    catch (error) {
        // Update UI status with error
        updateLineFisherStatus(`Error continuing Line Fisher analysis: ${error instanceof Error ? error.message : String(error)}`);
        lineFisherState.isAnalyzing = false;
        lineFisherState.progress.currentAction = "Error occurred";
        updateLineFisherProgressDisplay(lineFisherState.progress);
        throw error;
    }
};
// ============================================================================
// LINE FISHER EXPORTS
// ============================================================================
export const getLineFisherConfig = () => ({
    ...lineFisherState.config,
});
export const updateLineFisherConfig = (updates) => {
    lineFisherState.config = { ...lineFisherState.config, ...updates };
};
//# sourceMappingURL=line_fisher.js.map