import { analyzePosition } from "../../utils/stockfish-client.js";
import { parseMove } from "../../utils/move-parsing.js";
import { applyMoveToFEN } from "../../utils/fen-manipulation.js";
import { formatPCNLineWithMoveNumbers, computeSanGameFromPCN, } from "../../utils/pcn-utils.js";
import { getPieceCapitalized } from "../../utils/notation-utils.js";
import { getPieceAtSquareFromFEN, coordsToSquare, } from "../../utils/fen-utils.js";
import { log } from "../../utils/logging.js";
import { compareAnalysisMoves } from "../best/analysis-utils.js";
import { getElementByIdOrThrow, querySelectorOrThrow, } from "../../utils/dom-helpers.js";
import { calculateTotalNodes, calculateTotalLines, } from "./line-fisher-calculations.js";
import { showToast } from "../../utils/ui-utils.js";
// Global state for fish function
let currentFishState = null;
let isFishAnalysisRunning = false;
let shouldStopFishAnalysis = false;
/**
 * Continue fish analysis from current state
 * Resume fish analysis from the current state if there are WIP lines
 */
export const continueFishAnalysis = async () => {
    console.log("Continuing fish analysis");
    try {
        if (!currentFishState) {
            showToast("No fish analysis state to continue", "#FF9800", 3000);
            return;
        }
        if (currentFishState.wip.length === 0) {
            showToast("No work-in-progress lines to continue", "#FF9800", 3000);
            return;
        }
        console.log("Continuing fish analysis with WIP count:", currentFishState.wip.length);
        showToast("Continuing fish analysis...", "#007bff", 2000);
        // Update button states - disable start, enable stop
        updateFishButtonStates(true);
        // Continue the analysis from where it left off by running the main loop
        console.log("Continuing main analysis loop with WIP count:", currentFishState.wip.length);
        // Set fishing flag to true when continuing
        currentFishState.isFishing = true;
        while (currentFishState.wip.length > 0 && currentFishState.isFishing) {
            // Check if analysis should be stopped
            if (shouldStopFishAnalysis) {
                console.log("Fish analysis continue stopped by user");
                currentFishState.isFishing = false;
                updateFishStatus("Analysis continue stopped by user");
                updateFishButtonStates(false);
                return;
            }
            const currentLine = currentFishState.wip.shift();
            console.log("Continue loop, next line:", currentLine.pcns.join(" "));
            console.log("WIP count at start of iteration:", currentFishState.wip.length);
            const halfMoves = currentLine.pcns.length;
            const isEvenHalfMoves = halfMoves % 2 === 0;
            updateFishStatus(`Continuing analysis: ${currentLine.pcns.join(" ")}`);
            if (isEvenHalfMoves) {
                console.group("continueInitiatorMove()");
                // Initiator move - get best move from Stockfish
                await findBestInitiatorMove(currentFishState, currentLine);
            }
            else {
                // Responder move - get N best moves from Stockfish
                console.group("continueResponderMove()");
                await findNextResponseMoves(currentFishState, currentLine);
            }
            // Update progress in UI
            updateFishProgress(currentFishState);
            // Update global state for export functionality
            console.log("Updated global state. WIP count:", currentFishState.wip.length, "Done count:", currentFishState.done.length);
            console.groupEnd();
        }
        console.log("Fish analysis continue END. Wip len:", currentFishState.wip.length, ", done len:", currentFishState.done.length);
        console.log("Final done lines:", currentFishState.done);
        // Set fishing to false when analysis completes
        currentFishState.isFishing = false;
        // Update final results in UI
        updateFishStatus("Analysis continue complete");
        updateFishProgress(currentFishState);
        updateFishResults(currentFishState.done);
        // Update global state one final time
        console.log("Final global state updated. WIP count:", currentFishState.wip.length, "Done count:", currentFishState.done.length);
        showToast(`Fish analysis continued and completed: ${currentFishState.done.length} lines found`, "#28a745", 5000);
        // Update button states - enable start, disable stop
        updateFishButtonStates(false);
    }
    catch (error) {
        console.error("Error continuing fish analysis:", error);
        showToast(`Fish continue error: ${error instanceof Error ? error.message : String(error)}`, "#dc3545", 5000);
        // Update button states - enable start, disable stop (even on error)
        updateFishButtonStates(false);
    }
};
/**
 * Import fish state from clipboard
 * Import fish analysis state from clipboard JSON format.
 * Parse JSON state, validate format, and load into current state
 */
export const importFishStateFromClipboard = async () => {
    console.log("Importing fish state from clipboard");
    try {
        // Read from clipboard
        const clipboardText = await navigator.clipboard.readText();
        if (!clipboardText) {
            showToast("No text found in clipboard", "#FF9800", 3000);
            return;
        }
        // Try to parse as JSON first (for backward compatibility)
        let importedState;
        try {
            importedState = JSON.parse(clipboardText);
            // Validate JSON state format
            if (!importedState.type || importedState.type !== "fish-state") {
                throw new Error("Invalid JSON fish state format");
            }
            if (!importedState.config || !importedState.wip || !importedState.done) {
                throw new Error("Incomplete JSON fish state");
            }
            // Validate that lines have required fields
            const validateLine = (line, arrayName) => {
                if (!line.pcns || !Array.isArray(line.pcns)) {
                    throw new Error(`Invalid ${arrayName} line: missing pcns array`);
                }
                if (typeof line.score !== "number") {
                    throw new Error(`Invalid ${arrayName} line: missing score`);
                }
                if (typeof line.delta !== "number") {
                    throw new Error(`Invalid ${arrayName} line: missing delta`);
                }
            };
            // Validate all lines
            importedState.wip.forEach((line, index) => {
                validateLine(line, `wip[${index}]`);
            });
            importedState.done.forEach((line, index) => {
                validateLine(line, `done[${index}]`);
            });
            // Handle JSON format (existing functionality)
            console.log("Importing JSON fish state format");
            // Reconstruct full FishLine objects from streamlined format
            const reconstructFishLine = (streamlinedLine, isFromDoneArray) => {
                // Reconstruct position by applying moves to root FEN
                let currentFEN = importedState.config.rootFEN;
                console.log(`Reconstructing position for line: ${streamlinedLine.pcns.join(" ")}`);
                console.log(`Starting from root FEN: ${currentFEN}`);
                // Apply each move in the line to reconstruct the position
                for (const pcn of streamlinedLine.pcns) {
                    const move = parseMove(pcn, currentFEN);
                    if (move) {
                        currentFEN = applyMoveToFEN(currentFEN, move);
                        console.log(`Applied move ${pcn}, new FEN: ${currentFEN}`);
                    }
                    else {
                        console.warn(`Failed to parse move ${pcn} in position ${currentFEN}`);
                        // Fallback to empty string if move parsing fails
                        currentFEN = "";
                        break;
                    }
                }
                console.log(`Final reconstructed position: ${currentFEN}`);
                return {
                    lineIndex: 0,
                    nodeId: "",
                    sanGame: streamlinedLine.sanGame, // Use sanGame for reconstruction
                    pcns: streamlinedLine.pcns,
                    score: streamlinedLine.score,
                    delta: streamlinedLine.delta,
                    position: currentFEN, // Reconstructed position
                    isDone: isFromDoneArray, // Done lines are marked as done
                    isFull: isFromDoneArray, // Done lines are also marked as full
                };
            };
            const reconstructedWip = importedState.wip.map((line) => reconstructFishLine(line, false));
            const reconstructedDone = importedState.done.map((line) => reconstructFishLine(line, true));
            // Load state into global state
            currentFishState = {
                isFishing: false, // Imported state should not be fishing by default
                lineCounter: 0,
                config: importedState.config,
                wip: reconstructedWip,
                done: reconstructedDone,
            };
            console.log("Imported JSON fish state:", currentFishState);
            showToast("Imported JSON fish state successfully", "#4CAF50", 3000);
        }
        catch (jsonError) {
            // If JSON parsing fails, try to parse as plain text lines
            console.log("JSON parsing failed, trying plain text format:", jsonError);
            // Parse plain text lines
            const lines = clipboardText
                .trim()
                .split("\n")
                .filter((line) => line.trim());
            if (lines.length === 0) {
                showToast("No valid lines found in clipboard", "#FF9800", 3000);
                return;
            }
            console.log("Importing plain text fish state format");
            // Convert plain text lines back to FishLine format
            const convertPlainTextToFishLine = (lineText) => {
                // Parse the line to extract moves
                const moves = [];
                const moveRegex = /(\d+\.\s*)?([NBRQKP]?[a-h]?[1-8]?x?[a-h][1-8](?:=[NBRQ])?[+#]?)/g;
                let match;
                while ((match = moveRegex.exec(lineText)) !== null) {
                    if (match[2]) {
                        // The actual move
                        moves.push(match[2]);
                    }
                }
                console.log(`Parsed moves from line "${lineText}":`, moves);
                return {
                    lineIndex: 0,
                    nodeId: "",
                    sanGame: "", // No SAN for imported lines
                    pcns: moves,
                    score: 0, // Default score for imported lines
                    delta: 0, // Default delta for imported lines
                    position: "", // Will be reconstructed if needed
                    isDone: true, // Imported lines are considered done
                    isFull: true, // Imported lines are considered full
                };
            };
            const importedLines = lines.map(convertPlainTextToFishLine);
            // Create a minimal config for imported lines
            const defaultConfig = {
                rootFEN: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
                maxDepth: 10,
                defaultResponderCount: 1,
                initiatorMoves: [],
                responderMoveCounts: [],
                threads: 1,
            };
            // Load state into global state
            currentFishState = {
                isFishing: false,
                lineCounter: 0,
                config: defaultConfig,
                wip: [],
                done: importedLines,
            };
            console.log("Imported plain text fish state:", currentFishState);
            showToast(`Imported ${importedLines.length} lines from plain text`, "#4CAF50", 3000);
        }
        // Update the display
        if (currentFishState) {
            updateFishResultsRealTime(currentFishState);
            updateFishProgress(currentFishState);
        }
        console.log("Fish state import completed successfully");
    }
    catch (error) {
        console.error("Error importing fish state:", error);
        showToast("Failed to import fish state", "#f44336", 4000);
    }
};
/**
 * Update Fish button states using existing Line Fisher button management
 */
function updateFishButtonStates(isAnalyzing) {
    isFishAnalysisRunning = isAnalyzing;
    shouldStopFishAnalysis = false;
    updateLineFisherButtonStates();
}
/**
 * Stop Fish analysis
 */
export const stopFishAnalysis = () => {
    console.log("Stopping Fish analysis");
    if (!isFishAnalysisRunning) {
        console.log("Fish analysis not running, nothing to stop");
        return;
    }
    // Set the stop flag to interrupt the analysis loop
    shouldStopFishAnalysis = true;
    // Set isFishing to false in current state if it exists
    if (currentFishState) {
        currentFishState.isFishing = false;
    }
    // Update button states
    updateFishButtonStates(false);
    // Update UI status
    updateFishStatus("Analysis stopped");
    showToast("Fish analysis stopped", "#FF9800", 3000);
};
/**
 * Fish function - performs line analysis according to the algorithm in the comment
 *
 * Algorithm:
 * 1. Create initial move (predefined or from Stockfish)
 * 2. Add to wip list
 * 3. Loop until wip list is empty:
 *    - Get next line from wip
 *    - If even half-moves: responder move (get N best moves)
 *    - If odd half-moves: initiator move (get best move)
 *    - Mark lines as done when max depth reached
 */
export async function fish(config) {
    // - create a state object, empty wip/done list.
    // - show config in UI (root board, limits, the whole thing)
    // - get root score, update config
    // - update root score in UI
    // - create an initial move
    //   - if there is a predefined move, use that, ask stockfish for the score
    //   - otherwise, ask stockfish for the best move of the root FEN
    // - add move to UI
    //   - when adding moves, create a node in the line-fisher-results box to represent the move
    //   - give the node the id of the move.sans, concatenated with underscores
    // add this move to the wip list and the UI
    // now loop:
    // - get the next element in the wip list
    //   - if the number of half-moves is even, the next step is a responder move
    //   - otherwise the next step is an initiator move
    //   - responder move:
    //     - take the position and ask stockfish for the next N best moves
    //       - if there is a responder count override at this depth, use that for N
    //       - otherwise use the default responder count for N.
    //     - add this top list as moves to the line, mark line as done, move it from wip list to done list
    //     - for each response gotten this way, create a _new_ line object that extends the line with the new move
    //     - add these to the wip list
    //     - add these to the UI
    //  - initiator move
    //    - ask stockfish for the best move in the current line
    //    - once you have it, record it as the next move in the line
    //    - if the number of half-moves now exceeds maxDepth/2+1, mark the line as done and complete, remove it from wip list, add it to done list
    //    - otherwise the line can stay in queue and will be picked up again for responder moves
    // repeat until wip queue is drained.
    // Reset stop flag for new analysis
    shouldStopFishAnalysis = false;
    // Update button states - disable start, enable stop
    updateFishButtonStates(true);
    try {
        // Create state object with empty wip/done lists
        const state = {
            isFishing: true, // Start with fishing enabled
            lineCounter: 0,
            wip: [],
            done: [],
            config,
        };
        // Store state globally for export functionality
        currentFishState = state;
        // Show config in UI
        updateFishConfigDisplay(config);
        updateFishStatus("Starting root analysis...");
        updateFishProgress(state);
        // Get root score and update config
        let rootAnalysis;
        try {
            rootAnalysis = await analyzePosition(config.rootFEN, {
                threads: config.threads,
                multiPV: 1,
                depth: 20,
            });
        }
        catch (error) {
            console.error("Error in root analysis:", error);
            throw error;
        }
        // For LineFisherConfig, we assume white is the initiator (standard chess)
        const direction = "desc"; // White pieces are uppercase, so desc for white
        const bestMove = rootAnalysis.moves.sort((a, b) => compareAnalysisMoves(a, b, direction))[0];
        // Store baseline score for delta calculations
        const baselineScore = bestMove.score;
        state.config.baselineScore = baselineScore;
        state.config.baselineMoves = [
            {
                move: bestMove.move.toString(),
                score: bestMove.score,
            },
        ];
        // Update root score in UI
        updateFishRootScore(bestMove.score);
        updateFishStatus(`Creating initial move`);
        // Create initial move
        const initialLine = await createInitialMove(state);
        state.wip.push(initialLine);
        // Update progress and results after initial move
        updateFishProgress(state);
        updateFishResultsRealTime(state);
        // Main analysis loop
        while (state.wip.length > 0 && state.isFishing) {
            // Check if analysis should be stopped
            if (shouldStopFishAnalysis) {
                state.isFishing = false;
                updateFishStatus("Analysis stopped by user");
                updateFishButtonStates(false);
                return state.done;
            }
            const currentLine = state.wip.shift();
            const halfMoves = currentLine.pcns.length;
            const isEvenHalfMoves = halfMoves % 2 === 0;
            updateFishStatus(`Analyzing line: ${currentLine.pcns.join(" ")}`);
            if (isEvenHalfMoves) {
                // Initiator move - get best move from Stockfish
                await findBestInitiatorMove(state, currentLine);
            }
            else {
                // Responder move - get N best moves from Stockfish
                await findNextResponseMoves(state, currentLine);
            }
            // Update progress and results in UI
            updateFishProgress(state);
            updateFishResultsRealTime(state);
            // Update global state for export functionality
            currentFishState = state;
        }
        // Set fishing to false when analysis completes
        state.isFishing = false;
        // Update final results in UI
        updateFishStatus("Analysis complete");
        updateFishProgress(state);
        updateFishResults(state.done);
        // Update global state one final time
        currentFishState = state;
        // Update button states - enable start, disable stop
        updateFishButtonStates(false);
        return state.done;
    }
    catch (error) {
        console.error("Error in fish analysis:", error);
        // Reset button states on error
        updateFishButtonStates(false);
        // Update UI status
        updateFishStatus("Analysis failed");
        showToast(`Fish analysis failed: ${error instanceof Error ? error.message : String(error)}`, "#dc3545", 5000);
        throw error; // Re-throw to let caller handle it
    }
}
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
 * Create the initial move for analysis
 */
async function createInitialMove(state) {
    const { config } = state;
    // Check if there's a predefined move for depth 0
    const predefinedMove = config.initiatorMoves[0];
    if (predefinedMove) {
        // Use predefined move
        const move = parseMove(predefinedMove, config.rootFEN);
        if (!move) {
            throw new Error("Failed to parse predefined move");
        }
        // Get score for the predefined move
        const newFEN = applyMoveToFEN(config.rootFEN, move);
        const analysis = await analyzePosition(newFEN, {
            threads: config.threads,
            multiPV: 1,
            depth: 20,
        });
        const score = analysis.moves[0]?.score || 0;
        // Convert SAN predefined move to PCN format
        const parsedMove = parseMove(predefinedMove, config.rootFEN);
        let pcnMove = predefinedMove; // Fallback
        if (parsedMove) {
            const piece = getPieceAtSquareFromFEN(parsedMove.from, config.rootFEN);
            const pieceName = getPieceCapitalized(piece);
            pcnMove = `${pieceName}${parsedMove.from}${parsedMove.to}`;
        }
        return {
            lineIndex: 0,
            nodeId: "",
            sanGame: "", // Will be computed on demand
            pcns: [pcnMove],
            score: score,
            delta: calculateDelta(score, config.baselineScore),
            position: newFEN,
            isDone: false,
            isFull: false,
        };
    }
    else {
        // Ask Stockfish for best move
        const analysis = await analyzePosition(config.rootFEN, {
            threads: config.threads,
            depth: 20,
        });
        const bestMove = analysis.moves[0];
        if (!bestMove) {
            log("No moves available from Stockfish");
            throw new Error("No moves available from Stockfish. Mate? Stalemate?");
        }
        const newFEN = applyMoveToFEN(config.rootFEN, bestMove.move);
        // Convert Stockfish's from-to notation to PCN format
        const fromSquare = bestMove.move.from;
        const toSquare = bestMove.move.to;
        const piece = getPieceAtSquareFromFEN(fromSquare, config.rootFEN);
        const pieceName = getPieceCapitalized(piece);
        const pcnMove = `${pieceName}${fromSquare}${toSquare}`;
        return {
            lineIndex: 0,
            nodeId: "",
            sanGame: "", // Will be computed on demand
            pcns: [pcnMove],
            score: bestMove.score,
            delta: calculateDelta(bestMove.score, config.baselineScore),
            position: newFEN,
            isDone: false,
            isFull: false,
        };
    }
}
/**
 * Process responder move - get N best moves from current position
 */
async function findNextResponseMoves(state, line) {
    const { config } = state;
    const depth = Math.floor(line.pcns.length / 2);
    // Determine number of responses to analyze
    const responderCount = config.responderMoveCounts?.[depth] || config.defaultResponderCount;
    // Get N best moves from Stockfish
    const analysis = await analyzePosition(line.position, {
        threads: config.threads,
        multiPV: responderCount,
        depth: 20,
    });
    //   console.log('responses:', analysis.moves);
    // Mark current line as done and move to done list
    line.isDone = true;
    state.done.push(line);
    // Sort by quality: mate moves first, then by score
    // For LineFisherConfig, we assume white is the initiator (standard chess)
    const direction = "desc"; // White pieces are uppercase, so desc for white
    const responses = analysis.moves
        .sort((a, b) => compareAnalysisMoves(a, b, direction))
        .slice(0, responderCount);
    // Create new lines for each response
    for (const analysisMove of responses) {
        const newFEN = applyMoveToFEN(line.position, analysisMove.move);
        // Stockfish returns from-to notation, convert to PCN format
        const fromSquare = analysisMove.move.from;
        const toSquare = analysisMove.move.to;
        const piece = getPieceAtSquareFromFEN(fromSquare, line.position);
        const pieceName = getPieceCapitalized(piece);
        const pcnMove = `${pieceName}${fromSquare}${toSquare}`;
        const newLine = {
            lineIndex: ++state.lineCounter, // Note: 0 is initial move.
            nodeId: "",
            sanGame: "", // Will be computed on demand
            pcns: [...line.pcns, pcnMove], // Store PCN format
            score: analysisMove.score,
            delta: calculateDelta(analysisMove.score, config.baselineScore),
            position: newFEN,
            isDone: false,
            isFull: false,
        };
        state.wip.push(newLine);
        // Update global state for export functionality
        currentFishState = state;
    }
    log(`Created ${responses.length} new lines from responder analysis`);
    // Update UI
    updateLineFisherExploredLines(state.done, config.rootFEN);
}
/**
 * Process initiator move - get best move from current position
 */
async function findBestInitiatorMove(state, line) {
    const { config } = state;
    const depth = Math.floor(line.pcns.length / 2);
    console.log("Processing initiator move at depth:", depth);
    // Check if there's a predefined move for this depth
    const predefinedMove = config.initiatorMoves[depth];
    if (predefinedMove) {
        // Use predefined move
        const move = parseMove(predefinedMove, line.position);
        if (!move) {
            line.isDone = true;
            state.done.push(line);
            // Update UI
            updateLineFisherExploredLines(state.done, config.rootFEN);
            return;
        }
        // Get score for the predefined move
        const newFEN = applyMoveToFEN(line.position, move);
        const analysis = await analyzePosition(newFEN, {
            threads: config.threads,
            depth: 20,
        });
        const score = analysis.moves[0]?.score || 0;
        // Add the predefined move to the line
        // Convert SAN predefined move to PCN format
        const parsedMove = parseMove(predefinedMove, line.position);
        if (parsedMove) {
            const piece = getPieceAtSquareFromFEN(parsedMove.from, line.position);
            const pieceName = getPieceCapitalized(piece);
            const pcnMove = `${pieceName}${parsedMove.from}${parsedMove.to}`;
            line.pcns.push(pcnMove);
            line.sanGame = ""; // Will be computed on demand
        }
        else {
            // Fallback to original move if parsing fails
            line.pcns.push(predefinedMove);
            line.sanGame = ""; // Will be computed on demand
        }
        line.score = score;
        line.delta = calculateDelta(score, config.baselineScore);
        line.position = newFEN;
    }
    else {
        // Get best move from Stockfish
        const analysis = await analyzePosition(line.position, {
            threads: config.threads,
            depth: 20,
            multiPV: 1,
        });
        // For LineFisherConfig, we assume white is the initiator (standard chess)
        const direction = "desc"; // White pieces are uppercase, so desc for white
        // console.log('analysis.moves:', analysis.moves);
        const bestMove = analysis.moves.sort((a, b) => compareAnalysisMoves(a, b, direction))[0];
        // console.log('bestMove:', bestMove);
        if (!bestMove) {
            line.isDone = true;
            state.done.push(line);
            // Update UI
            updateLineFisherExploredLines(state.done, config.rootFEN);
            return;
        }
        // Add the best move to the line
        const newFEN = applyMoveToFEN(line.position, bestMove.move);
        // Convert Stockfish's from-to notation to PCN format
        const fromSquare = bestMove.move.from;
        const toSquare = bestMove.move.to;
        const piece = getPieceAtSquareFromFEN(fromSquare, line.position);
        const pieceName = getPieceCapitalized(piece);
        const pcnMove = `${pieceName}${fromSquare}${toSquare}`;
        line.pcns.push(pcnMove);
        line.sanGame = ""; // Will be computed on demand
        line.score = bestMove.score;
        line.delta = calculateDelta(bestMove.score, config.baselineScore);
        line.position = newFEN;
    }
    // Update global state for export functionality
    currentFishState = state;
    // Check if max depth reached
    const halfMoves = line.pcns.length;
    if (halfMoves >= config.maxDepth * 2 + 1) {
        line.isDone = true;
        line.isFull = true;
        state.done.push(line);
    }
    else {
        // Line can stay in queue for next responder move
        state.wip.push(line);
    }
    // Update UI
    updateLineFisherExploredLines(state.done, config.rootFEN);
}
/**
 * Update fish config display in UI
 * Non-blocking UI update with error handling
 */
function updateFishConfigDisplay(config) {
    try {
        // Calculate total nodes and lines using existing line-fisher functions
        const totalNodes = calculateTotalNodes(config);
        const totalLines = calculateTotalLines(config);
        // Generate formulas
        const { nodeFormula, lineFormula } = generateLineFisherFormula(config);
        // Update config display elements using existing line-fisher UI
        const initiatorDisplay = getElementByIdOrThrow("line-fisher-initiator-display");
        const responderDisplay = getElementByIdOrThrow("line-fisher-responder-display");
        const depthDisplay = getElementByIdOrThrow("line-fisher-depth-display");
        const threadsDisplay = getElementByIdOrThrow("line-fisher-threads-display");
        if (initiatorDisplay) {
            initiatorDisplay.textContent =
                config.initiatorMoves.join(", ") || "(none)";
        }
        if (responderDisplay) {
            responderDisplay.textContent =
                config.responderMoveCounts.join(", ") || "(default)";
        }
        if (depthDisplay) {
            depthDisplay.textContent = config.maxDepth.toString();
        }
        if (threadsDisplay) {
            const threads = config.threads;
            threadsDisplay.textContent = threads.toString();
        }
        // Add total nodes, lines, and formulas to config display
        const configDetails = querySelectorOrThrow(document, ".line-fisher-config-details");
        if (configDetails) {
            // Check if total nodes element already exists
            let totalNodesElement = configDetails.querySelector(".fish-total-nodes");
            if (!totalNodesElement) {
                totalNodesElement = document.createElement("div");
                totalNodesElement.className =
                    "line-fisher-config-item fish-total-nodes";
                totalNodesElement.innerHTML =
                    "<label>Total Nodes:</label><span>-</span>";
                configDetails.appendChild(totalNodesElement);
            }
            const totalNodesSpan = totalNodesElement.querySelector("span");
            if (totalNodesSpan) {
                totalNodesSpan.textContent = totalNodes.toString();
            }
            // Check if total lines element already exists
            let totalLinesElement = configDetails.querySelector(".fish-total-lines");
            if (!totalLinesElement) {
                totalLinesElement = document.createElement("div");
                totalLinesElement.className =
                    "line-fisher-config-item fish-total-lines";
                totalLinesElement.innerHTML =
                    "<label>Total Lines:</label><span>-</span>";
                configDetails.appendChild(totalLinesElement);
            }
            const totalLinesSpan = totalLinesElement.querySelector("span");
            if (totalLinesSpan) {
                totalLinesSpan.textContent = totalLines.toString();
            }
            // Check if node formula element already exists
            let nodeFormulaElement = configDetails.querySelector(".fish-node-formula");
            if (!nodeFormulaElement) {
                nodeFormulaElement = document.createElement("div");
                nodeFormulaElement.className =
                    "line-fisher-config-item fish-node-formula";
                nodeFormulaElement.innerHTML =
                    "<label>Node Formula:</label><span>-</span>";
                configDetails.appendChild(nodeFormulaElement);
            }
            const nodeFormulaSpan = nodeFormulaElement.querySelector("span");
            if (nodeFormulaSpan) {
                nodeFormulaSpan.innerHTML = `<span style="font-family: monospace; font-size: 0.9em;">${nodeFormula}</span>`;
            }
            // Check if line formula element already exists
            let lineFormulaElement = configDetails.querySelector(".fish-line-formula");
            if (!lineFormulaElement) {
                lineFormulaElement = document.createElement("div");
                lineFormulaElement.className =
                    "line-fisher-config-item fish-line-formula";
                lineFormulaElement.innerHTML =
                    "<label>Line Formula:</label><span>-</span>";
                configDetails.appendChild(lineFormulaElement);
            }
            const lineFormulaSpan = lineFormulaElement.querySelector("span");
            if (lineFormulaSpan) {
                lineFormulaSpan.innerHTML = `<span style="font-family: monospace; font-size: 0.9em;">${lineFormula}</span>`;
            }
        }
        // Render the board with the current position
        renderLineFisherBoard(config.rootFEN);
    }
    catch (error) {
        console.error("Failed to update fish config display:", error);
        // Non-blocking: continue analysis even if UI update fails
    }
}
/**
 * Update fish status display
 * Non-blocking UI update with error handling
 */
function updateFishStatus(message) {
    try {
        const statusElement = getElementByIdOrThrow("line-fisher-status");
        if (statusElement) {
            statusElement.textContent = message;
        }
    }
    catch (error) {
        console.error("Failed to update fish status:", error);
        // Non-blocking: continue analysis even if UI update fails
    }
}
/**
 * Update fish progress display
 * Non-blocking UI update with error handling
 */
function updateFishProgress(state) {
    try {
        const actionDisplay = getElementByIdOrThrow("line-fisher-action-display");
        const linesDisplay = getElementByIdOrThrow("line-fisher-lines-display");
        const positionDisplay = getElementByIdOrThrow("line-fisher-position-display");
        const progressFill = getElementByIdOrThrow("line-fisher-progress-fill");
        if (actionDisplay) {
            const wipCount = state.wip.length;
            const doneCount = state.done.length;
            actionDisplay.textContent = `WIP: ${wipCount}, Done: ${doneCount}`;
        }
        if (linesDisplay) {
            // Calculate total expected lines for display
            const totalNodes = calculateTotalNodes(state.config);
            const totalExpectedLines = Math.floor((totalNodes - 1) / 2) + 1;
            const progressPercent = totalExpectedLines > 0
                ? (state.done.length / totalExpectedLines) * 100
                : 0;
            linesDisplay.textContent = `${state.done.length} / ${totalExpectedLines} (${progressPercent.toFixed(2)}%)`;
        }
        if (positionDisplay) {
            // Show current position being analyzed (if any)
            const currentLine = state.wip[0];
            if (currentLine) {
                // Compute sanGame on demand if needed
                const sanGame = currentLine.sanGame ||
                    computeSanGameFromPCN(currentLine.pcns, state.config.rootFEN);
                positionDisplay.textContent = sanGame || "Root position";
            }
            else {
                positionDisplay.textContent = "Complete";
            }
        }
        // Update progress bar
        if (progressFill) {
            // Calculate progress based on completed lines vs total expected lines
            // Use the formula: (total nodes - 1) / 2 + 1
            const totalNodes = calculateTotalNodes(state.config);
            const totalExpectedLines = Math.floor((totalNodes - 1) / 2) + 1;
            const progressPercent = totalExpectedLines > 0
                ? (state.done.length / totalExpectedLines) * 100
                : 0;
            // Cap progress at 100%
            const cappedProgress = Math.min(progressPercent, 100);
            progressFill.style.width = `${cappedProgress}%`;
        }
    }
    catch (error) {
        console.error("Failed to update fish progress:", error);
        // Non-blocking: continue analysis even if UI update fails
    }
}
/**
 * Update fish root score display
 * Non-blocking UI update with error handling
 */
function updateFishRootScore(score) {
    try {
        // Add root score to config display
        const configDetails = querySelectorOrThrow(document, ".line-fisher-config-details");
        if (configDetails) {
            // Check if root score element already exists
            let rootScoreElement = configDetails.querySelector(".fish-root-score");
            if (!rootScoreElement) {
                rootScoreElement = document.createElement("div");
                rootScoreElement.className = "line-fisher-config-item fish-root-score";
                rootScoreElement.innerHTML = "<label>Root Score:</label><span>-</span>";
                configDetails.appendChild(rootScoreElement);
            }
            const scoreSpan = rootScoreElement.querySelector("span");
            if (scoreSpan) {
                const scoreInPawns = score / 100;
                const scoreText = scoreInPawns > 0
                    ? `+${scoreInPawns.toFixed(1)}`
                    : scoreInPawns.toFixed(1);
                scoreSpan.textContent = scoreText;
            }
        }
    }
    catch (error) {
        console.error("Failed to update fish root score:", error);
        // Non-blocking: continue analysis even if UI update fails
    }
}
/**
 * Generate line ID from SAN moves
 */
function generateLineId(sans) {
    return sans.join("_") + "_" + Math.random().toString(36).substring(2, 8);
}
/**
 * Update fish results display with real-time updates
 * Non-blocking UI update with error handling
 */
function updateFishResults(results) {
    try {
        updateLineFisherExploredLines(results, currentFishState.config.rootFEN);
    }
    catch (error) {
        console.error("Failed to update fish results:", error);
        // Non-blocking: continue analysis even if UI update fails
    }
}
/**
 * Update fish results display with real-time updates including WIP lines
 * Non-blocking UI update with error handling
 */
function updateFishResultsRealTime(state) {
    try {
        // Combine done and wip lines for display
        const allLines = state.done.concat(state.wip);
        // Work directly with FishLine[] - no conversion needed
        updateLineFisherExploredLines(allLines, state.config.rootFEN);
    }
    catch (error) {
        console.error("Failed to update fish results real-time:", error);
        // Non-blocking: continue analysis even if UI update fails
    }
}
/**
 * Export fish state to clipboard
 * Export current analysis state to clipboard in JSON format for import.
 * Serialize current state, copy to clipboard, and show success notification
 */
export const exportFishStateToClipboard = async () => {
    console.log("Exporting fish state to clipboard");
    console.log("Current fish state:", currentFishState);
    console.log("Current fish state wip length:", currentFishState?.wip?.length);
    console.log("Current fish state done length:", currentFishState?.done?.length);
    console.log("Current fish state isFishing:", currentFishState?.isFishing);
    console.log("Current fish state config:", currentFishState?.config);
    try {
        if (!currentFishState) {
            console.log("No currentFishState found - fish analysis may not have been run yet");
            showToast("No fish analysis state to export", "#FF9800", 3000);
            return;
        }
        // Get all lines (both WIP and done)
        const allLines = [...currentFishState.wip, ...currentFishState.done];
        console.log("WIP lines:", currentFishState.wip);
        console.log("Done lines:", currentFishState.done);
        console.log("All lines:", allLines);
        console.log("WIP count:", currentFishState.wip.length);
        console.log("Done count:", currentFishState.done.length);
        console.log("Total lines:", allLines.length);
        if (allLines.length === 0) {
            console.log("No lines found in state - analysis may not have completed or started");
            showToast("No lines to export", "#FF9800", 3000);
            return;
        }
        // Create streamlined line objects with all necessary properties for reconstruction
        const streamlinedWip = currentFishState.wip.map((line) => ({
            sanGame: line.sanGame ||
                computeSanGameFromPCN(line.pcns, currentFishState.config.rootFEN),
            pcns: line.pcns,
            score: line.score,
            delta: line.delta,
        }));
        const streamlinedDone = currentFishState.done.map((line) => ({
            sanGame: line.sanGame ||
                computeSanGameFromPCN(line.pcns, currentFishState.config.rootFEN),
            pcns: line.pcns,
            score: line.score,
            delta: line.delta,
        }));
        // Create exportable state object
        const exportState = {
            version: "1.0",
            timestamp: new Date().toISOString(),
            type: "fish-state",
            config: currentFishState.config,
            wip: streamlinedWip,
            done: streamlinedDone,
        };
        console.log("Export state object:", exportState);
        // Convert to JSON and copy to clipboard
        const jsonState = JSON.stringify(exportState, null, 2);
        await navigator.clipboard.writeText(jsonState);
        // Show success notification
        const wipCount = currentFishState.wip.length;
        const doneCount = currentFishState.done.length;
        showToast(`Exported ${allLines.length} lines to clipboard (${wipCount} WIP, ${doneCount} done)`, "#4CAF50", 3000);
        console.log("Fish state exported to clipboard successfully");
    }
    catch (error) {
        console.error("Error exporting fish state:", error);
        showToast("Failed to export state", "#f44336", 4000);
    }
};
/**
 * Copy fish state to clipboard (for copy button)
 * Copy current analysis state to clipboard in plain text format.
 * Serialize current state, copy to clipboard, and show success notification
 */
export const copyFishStateToClipboard = async () => {
    console.log("Copying fish state to clipboard");
    try {
        if (!currentFishState) {
            showToast("No fish analysis state to copy", "#FF9800", 3000);
            return;
        }
        // Get all lines (both WIP and done)
        const allLines = [...currentFishState.wip, ...currentFishState.done];
        if (allLines.length === 0) {
            showToast("No lines to copy", "#FF9800", 3000);
            return;
        }
        // Lines are already in PCN format, just format them with move numbers
        const pcnLines = allLines.map((line) => {
            return formatPCNLineWithMoveNumbers(line.pcns);
        });
        // Create plain text format - one line per opening line in PCN notation
        const plainTextLines = pcnLines.join("\n");
        // Copy plain text to clipboard
        await navigator.clipboard.writeText(plainTextLines);
        // Show success notification
        const wipCount = currentFishState.wip.length;
        const doneCount = currentFishState.done.length;
        showToast(`Copied ${allLines.length} lines to clipboard (PCN notation) (${wipCount} WIP, ${doneCount} done)`, "#4CAF50", 3000);
        console.log("Fish state copied to clipboard successfully");
    }
    catch (error) {
        console.error("Error copying fish state:", error);
        showToast("Failed to copy state", "#f44336", 4000);
    }
};
/**
 * Render chess board in the Line Fisher config section
 * Similar to tree digger board rendering
 */
const renderLineFisherBoard = (fen) => {
    const boardDisplay = getElementByIdOrThrow("line-fisher-board-display");
    // Check if the board already shows this position
    const currentFEN = boardDisplay.getAttribute("data-fen");
    if (currentFEN === fen) {
        return; // Don't re-render if it's the same position
    }
    // Clear existing content
    boardDisplay.innerHTML = "";
    boardDisplay.setAttribute("data-fen", fen);
    // Parse FEN and create squares
    // const fenParts = fen.split(" ");
    // const piecePlacement = fenParts[0];
    // const ranks = piecePlacement.split("/");
    // Create proper table structure for CSS table layout
    for (let rank = 0; rank < 8; rank++) {
        const tableRow = document.createElement("tr");
        for (let file = 0; file < 8; file++) {
            const tableCell = document.createElement("td");
            tableCell.className = "line-fisher-board-square";
            // Get piece from FEN using existing utility function
            const square = coordsToSquare(rank, file);
            const piece = getPieceAtSquareFromFEN(square, fen);
            if (piece) {
                tableCell.textContent = piece;
            }
            tableRow.appendChild(tableCell);
        }
        boardDisplay.appendChild(tableRow);
    }
};
const getRandomProofString = () => {
    return `R_${Math.random().toString(36).substring(2, 8)}`;
};
/**
 * Create a new line element and add it to the DOM
 */
const createLineElement = (line) => {
    const resultsElement = getElementByIdOrThrow("line-fisher-results");
    if (resultsElement.childElementCount === 1) {
        // Add a random proof string as the first child if this is the first line
        const randomProofString = getRandomProofString();
        const proofElement = document.createElement("div");
        proofElement.className = "random-proof-string";
        proofElement.style.color = "#ff0000";
        proofElement.style.fontWeight = "bold";
        proofElement.textContent = randomProofString;
        resultsElement.appendChild(proofElement);
    }
    line.nodeId = generateLineId(line.pcns);
    const lineElement = document.createElement("div");
    lineElement.id = line.nodeId;
    lineElement.className = "line-fisher-result-compact";
    lineElement.style.cursor = "pointer";
    lineElement.setAttribute("data-line-index", line.lineIndex.toString());
    resultsElement.appendChild(lineElement);
    return lineElement;
};
/**
 * Update an existing line element's content without re-rendering
 */
const updateLineElement = (lineElement, line) => {
    const scoreInPawns = line.score / 100;
    const deltaInPawns = line.delta / 100;
    const scoreText = scoreInPawns > 0 ? `+${scoreInPawns.toFixed(1)}` : scoreInPawns.toFixed(1);
    const deltaText = Math.abs(deltaInPawns) < 0.05
        ? "="
        : deltaInPawns > 0
            ? `+${deltaInPawns.toFixed(1)}`
            : deltaInPawns.toFixed(1);
    const deltaClass = Math.abs(deltaInPawns) < 0.05
        ? ""
        : deltaInPawns > 0
            ? "positive"
            : deltaInPawns < 0
                ? "negative"
                : "";
    let lineNumberStyle = "";
    let lineNumberPrefix = "";
    if (!line.isDone) {
        lineNumberStyle =
            "background-color: #ffeb3b; color: #000; padding: 1px 3px; border-radius: 3px;";
    }
    else if (line.isFull) {
        lineNumberStyle =
            "border: 1px solid #666; padding: 1px 3px; border-radius: 3px;";
    }
    // Update individual child elements instead of setting innerHTML
    const lineNumberElement = querySelectorOrThrow(lineElement, ".line-number");
    const lineScoreElement = querySelectorOrThrow(lineElement, ".line-score");
    const lineDeltaElement = querySelectorOrThrow(lineElement, ".line-delta");
    const lineNotationElement = querySelectorOrThrow(lineElement, ".line-notation");
    const lineCompleteElement = querySelectorOrThrow(lineElement, ".line-complete");
    const lineDoneElement = querySelectorOrThrow(lineElement, ".line-done");
    lineNumberElement.style.cssText = lineNumberStyle;
    lineNumberElement.textContent = `${lineNumberPrefix}${line.lineIndex + 1}.`;
    lineScoreElement.textContent = scoreText;
    lineDeltaElement.className = `line-delta ${deltaClass}`;
    lineDeltaElement.textContent = deltaText;
    lineNotationElement.textContent = line.sanGame;
    lineCompleteElement.textContent = `Complete: ${line.isFull}`;
    lineDoneElement.textContent = `Done: ${line.isDone}`;
};
/**
 * Create the initial HTML structure for a line element
 */
const createLineHTMLStructure = (line) => {
    const scoreInPawns = line.score / 100;
    const deltaInPawns = line.delta / 100;
    const scoreText = scoreInPawns > 0 ? `+${scoreInPawns.toFixed(1)}` : scoreInPawns.toFixed(1);
    const deltaText = Math.abs(deltaInPawns) < 0.05
        ? "="
        : deltaInPawns > 0
            ? `+${deltaInPawns.toFixed(1)}`
            : deltaInPawns.toFixed(1);
    const deltaClass = Math.abs(deltaInPawns) < 0.05
        ? ""
        : deltaInPawns > 0
            ? "positive"
            : deltaInPawns < 0
                ? "negative"
                : "";
    let lineNumberStyle = "";
    let lineNumberPrefix = "";
    if (!line.isDone) {
        lineNumberStyle =
            "background-color: #ffeb3b; color: #000; padding: 1px 3px; border-radius: 3px;";
    }
    else if (line.isFull) {
        lineNumberStyle =
            "border: 1px solid #666; padding: 1px 3px; border-radius: 3px;";
    }
    // <span class="random-proof-string">${Math.random().toString(36).substring(2, 8)}</span>
    // <span class="random-proof-string">${line.nodeId.split('_').pop()}</span>
    return `
    <span class="line-number" style="${lineNumberStyle}">${lineNumberPrefix}${line.lineIndex + 1}.</span>
    <span class="line-score">${scoreText}</span>
    <span class="line-delta ${deltaClass}">${deltaText}</span>
    <span class="line-notation">${line.sanGame}</span>
    <span class="line-complete">Complete: ${line.isFull}</span>
    <span class="line-done">Done: ${line.isDone}</span>
  `;
};
/**
 * Update Line Fisher explored lines display with incremental updates
 * Only add new lines and update existing ones without re-rendering everything
 */
const updateLineFisherExploredLines = (results, rootFEN) => {
    const resultsElement = getElementByIdOrThrow("line-fisher-results");
    if (results.length === 0) {
        resultsElement.innerHTML = "<p>No results to show yet...</p>";
        return;
    }
    // Create or update header
    const headerElement = querySelectorOrThrow(resultsElement, "#line-fisher-results-header");
    headerElement.innerHTML = `Explored Lines (${results.length}) <small>(number of responder nodes + 1)</small>`;
    // Show only the first 50 lines to keep it manageable
    const displayCount = Math.min(results.length, 50);
    // Process each line
    for (let i = 0; i < displayCount; i++) {
        const line = results[i];
        if (!line.sanGame) {
            line.sanGame = computeSanGameFromPCN(line.pcns, rootFEN);
        }
        if (line.nodeId) {
            const lineElement = getElementByIdOrThrow(line.nodeId);
            updateLineElement(lineElement, line);
        }
        else {
            // Create new line element
            const lineElement = createLineElement(line);
            lineElement.innerHTML = createLineHTMLStructure(line);
        }
    }
    if (resultsElement.childElementCount === displayCount + 1) {
        const moreElement = document.createElement("div");
        moreElement.className = "line-fisher-more";
        moreElement.textContent = `... hiding other lines for performance...`;
        resultsElement.appendChild(moreElement);
    }
};
/**
 * Generate computation formula for Line Fisher
 * Creates a human-readable formula showing how nodes and lines are calculated
 */
const generateLineFisherFormula = (config) => {
    const maxDepth = config.maxDepth;
    const responderCounts = config.responderMoveCounts;
    const defaultResponderCount = config.defaultResponderCount;
    // If the count is fixed for all layers, it would be sum(m^i) for each i = 0 to maxDepth-1
    // But because m can be different for every depth, we have to do this more complicated way.
    // So we'll show the extrapolated formula for overrides and them a sum for the rest.
    // For each move, increase prod by responder count at this move. Then add that result to the sum.
    // When we reach the first move that has no override, finalize the fomula with the sum.
    let prod = "";
    let nodeFormula = "";
    for (let i = 0; i < maxDepth; i++) {
        if (i < responderCounts.length) {
            prod = prod + (prod ? " * " : "") + responderCounts[i];
            nodeFormula =
                nodeFormula + (nodeFormula ? " + " : "") + " ( " + prod + " )";
        }
        else {
            nodeFormula =
                nodeFormula +
                    (nodeFormula ? " + " : "") +
                    " prod( sum( " +
                    prod +
                    " * " +
                    defaultResponderCount +
                    "<sup>n</sup> ) for n = " +
                    (responderCounts.length + 1) +
                    " .. " +
                    maxDepth +
                    " )";
            break;
        }
    }
    if (responderCounts.length) {
        nodeFormula =
            "1 + 2 * (" + nodeFormula + " ) = " + calculateTotalNodes(config);
    }
    else {
        nodeFormula = "1";
    }
    // The lines are simply the product of the number of responder moves. Initiator moves don't matter (always 1).
    let lineFormula = "";
    for (let i = 0; i < maxDepth; i++) {
        if (i < responderCounts.length) {
            lineFormula =
                lineFormula + (lineFormula ? " * " : "") + responderCounts[i];
        }
        else {
            lineFormula =
                lineFormula +
                    (lineFormula ? " * " : "") +
                    defaultResponderCount +
                    "<sup>" +
                    (maxDepth - responderCounts.length) +
                    "</sup>";
            break;
        }
    }
    lineFormula = (lineFormula || "1") + " = " + calculateTotalLines(config);
    return { nodeFormula, lineFormula };
};
/**
 * Initialize Line Fisher (placeholder for compatibility)
 */
export const initializeLineFisher = async () => {
    console.log("Line Fisher initialization (placeholder)");
    // No initialization needed for Fish analysis
};
/**
 * Reset Fish analysis
 */
export const resetFishAnalysis = () => {
    console.log("Resetting Fish analysis");
    // Stop any running analysis
    if (isFishAnalysisRunning) {
        stopFishAnalysis();
    }
    // Clear state
    currentFishState = null;
    isFishAnalysisRunning = false;
    shouldStopFishAnalysis = false;
    // Update UI
    updateFishButtonStates(false);
    updateFishStatus("Analysis reset");
    // Clear results display
    const resultsElement = getElementByIdOrThrow("line-fisher-results");
    resultsElement.innerHTML = "<p>No results to show yet...</p>";
    showToast("Fish analysis reset", "#FF9800", 3000);
};
/**
 * Update Line Fisher button states
 * Enable/disable buttons based on analysis state, update visual feedback,
 * and handle button state transitions
 */
const updateLineFisherButtonStates = () => {
    // Update button states based on analysis status
    const stopBtn = getElementByIdOrThrow("stop-line-fisher");
    const resetBtn = getElementByIdOrThrow("reset-line-fisher");
    const continueBtn = getElementByIdOrThrow("continue-line-fisher");
    const copyBtn = getElementByIdOrThrow("copy-line-fisher-state");
    const exportBtn = getElementByIdOrThrow("export-line-fisher-state");
    const importBtn = getElementByIdOrThrow("import-line-fisher-state");
    const startFish2Btn = getElementByIdOrThrow("start-fish2");
    // Get current analysis state from Fish state
    const isAnalyzing = isFishAnalysisRunning;
    const hasResults = currentFishState
        ? currentFishState.done.length > 0
        : false;
    // Fish analysis state is managed internally
    const isFishAnalyzing = false; // Fish analysis state is managed separately
    // Update button states
    stopBtn.disabled = !isAnalyzing && !isFishAnalyzing;
    resetBtn.disabled = isAnalyzing || isFishAnalyzing;
    continueBtn.disabled = isAnalyzing || isFishAnalyzing || !hasResults;
    copyBtn.disabled = false; // Copy should always work
    exportBtn.disabled = false; // Export should always work
    importBtn.disabled = isAnalyzing || isFishAnalyzing;
    startFish2Btn.disabled = isAnalyzing || isFishAnalyzing;
};
//# sourceMappingURL=fish.js.map