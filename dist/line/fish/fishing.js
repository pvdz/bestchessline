import { parseMove } from "../../utils/move-parsing.js";
import { applyLongMoveToFEN, applyMoveToFEN, } from "../../utils/fen-manipulation.js";
import { getPieceCapitalized } from "../../utils/notation-utils.js";
import { getPieceAtSquareFromFEN, parseFEN, toFEN, } from "../../utils/fen-utils.js";
import { log } from "../../utils/logging.js";
import { getCurrentFishState } from "./fish-state.js";
import { updateFishStatus, updateFishPvTickerThrottled } from "./fish-ui.js";
import { getInputElementOrThrow } from "../../utils/dom-helpers.js";
import { getTopLines } from "./fish-utils.js";
import { parseLongMove } from "../../utils/move-parser.js";
const MAX_STOCKFISH_DEPTH = 20;
export async function initFishing() {
    const rootFEN = getCurrentFishState().config.rootFEN;
    const threads = Number(getInputElementOrThrow("fish-threads").value);
    console.log("Fishing with", threads, "threads");
    const { config } = getCurrentFishState();
    config.threads = threads;
    // Ensure initiator color reflects the side to move at root
    try {
        const rootTurn = parseFEN(rootFEN).turn;
        getCurrentFishState().config.initiatorIsWhite = rootTurn === "w";
    }
    catch (e) {
        throw new Error("Failed to parse rootFEN for initiator color; keeping existing flag");
    }
    // Get root score and update config
    let rootAnalysis;
    try {
        rootAnalysis = await getTopLines(rootFEN, [], rootFEN, 5, MAX_STOCKFISH_DEPTH, {
            threads,
            onUpdate: (res) => {
                const minDepth = res.moves.length
                    ? Math.min(...res.moves.map((m) => m.depth))
                    : 0;
                updateFishStatus(`Analyzing root… (min d${minDepth}/${res.depth})`);
                updateFishPvTickerThrottled(res.moves, res.position);
            },
        });
    }
    catch (error) {
        console.error("Error in root analysis:", error);
        throw error;
    }
    // Sort from the perspective of the initiator at root.
    // If initiatorIsWhite: positive is good for white. If initiatorIsWhite is false: positive is good for black.
    // compareAnalysisMoves expects direction relative to WHITE perspective: desc favors white, asc favors black.
    const bestMove = rootAnalysis[0];
    // Store baseline score for delta calculations and cache top root moves
    getCurrentFishState().config.baselineScore = bestMove.score;
    getCurrentFishState().config.baselineMoves = rootAnalysis;
}
export async function initInitialMove() {
    // Create initial move
    const initialLine = await createInitialMove();
    getCurrentFishState().wip.push(initialLine);
}
/**
 * Create the initial move for analysis
 */
async function createInitialMove() {
    const { config } = getCurrentFishState();
    // console.log("SF: createInitialMove()", config.initiatorMoves[0]);
    // Check if there's a predefined move for depth 0
    const predefinedMove = config.initiatorMoves[0];
    if (predefinedMove) {
        // Use predefined move for the first initiator move
        const parsedMove = parseMove(predefinedMove, config.rootFEN);
        if (!parsedMove) {
            throw new Error("Failed to parse predefined move");
        }
        const long = parsedMove.from + parsedMove.to;
        // If predefined move is in the cached root top-5, reuse its score; otherwise compute its score at the next position
        const top = config.baselineMoves?.find((m) => m.move === long);
        const fenAfterMove = applyMoveToFEN(config.rootFEN, parsedMove);
        let score = 0;
        if (top) {
            score = top.score;
            // console.log(
            //   "SF: initial move was part of top5 of the root position (",
            //   predefinedMove,
            //   ")",
            // );
        }
        else {
            // console.log(
            //   "SF: initial move (find out for predefined move",
            //   predefinedMove,
            //   ")",
            // );
            // TODO: this was broken after migration. this needs to send the predefined move to stockfish, that's not what happens right now
            console.warn("fixme: first move is incorrectly computed now");
            const moves = await getTopLines(config.rootFEN, [parsedMove.from + parsedMove.to], fenAfterMove, 1, MAX_STOCKFISH_DEPTH, {
                threads: config.threads,
                onUpdate: (res) => {
                    updateFishStatus(`Scoring predefined move… (d${res.moves[0]?.depth || 0}/${res.depth})`);
                    updateFishPvTickerThrottled(res.moves, res.position);
                },
            });
            const s = moves[0]?.score || 0;
            // Normalize to initiator perspective using newFEN (opponent to move)
            const turn = parseFEN(fenAfterMove).turn;
            const initiatorIsWhite = getCurrentFishState().config.initiatorIsWhite;
            score = (turn === "w") === initiatorIsWhite ? s : -s;
        }
        const piece = getPieceAtSquareFromFEN(parsedMove.from, config.rootFEN);
        const pieceName = getPieceCapitalized(piece);
        const pcnMove = `${pieceName}${parsedMove.from}${parsedMove.to}`;
        return {
            lineIndex: 0,
            nodeId: "",
            sanGame: "", // Will be computed on demand
            pcns: [pcnMove],
            score,
            best5Replies: [],
            best5Alts: config.baselineMoves.slice(0, 5),
            position: fenAfterMove,
            isDone: false,
            isFull: false,
            isMate: false,
            isStalemate: false,
            isTransposition: false,
            transpositionTarget: "",
        };
    }
    else {
        // Ask Stockfish for best move
        // console.log("SF: initial move (find best for missing a predefined move)");
        const bestMove = config.baselineMoves[0];
        if (!bestMove) {
            log("No config.baselineMoves available?");
            throw new Error("No config.baselineMoves available?");
        }
        const newFEN = applyLongMoveToFEN(config.rootFEN, bestMove.move);
        // Convert Stockfish's from-to notation to PCN format
        const fromSquare = bestMove.move.slice(0, 2);
        const piece = getPieceAtSquareFromFEN(fromSquare, config.rootFEN);
        const pieceName = getPieceCapitalized(piece);
        const pcnMove = `${pieceName}${bestMove.move}`;
        return {
            lineIndex: 0,
            nodeId: "",
            sanGame: "", // Will be computed on demand
            pcns: [pcnMove],
            score: bestMove.score,
            best5Replies: [],
            best5Alts: config.baselineMoves.slice(0, 5),
            position: newFEN,
            isDone: false,
            isFull: false,
            isMate: false,
            isStalemate: false,
            isTransposition: false,
        };
    }
}
export async function keepFishing(rootFEN, onUpdate) {
    console.log("keepFishing()", getCurrentFishState());
    // Main analysis loop
    while (getCurrentFishState().wip.length > 0) {
        const fishState = getCurrentFishState();
        // Check if analysis should be stopped
        if (!fishState.isFishing) {
            onUpdate("Analysis stopped by user");
            return;
        }
        const currentLine = fishState.wip[0];
        const halfMoves = currentLine.pcns.length;
        const isEvenHalfMoves = halfMoves % 2 === 0;
        // Stop expanding when we reached configured max (initiator moves define depth)
        const maxHalfMoves = fishState.config.maxDepth * 2 + 1;
        if (halfMoves >= maxHalfMoves) {
            currentLine.isDone = true;
            currentLine.isFull = true;
            fishState.wip.shift();
            fishState.done.push(currentLine);
            onUpdate("Line reached target depth; marking done");
            console.log("we stopping now?");
            continue;
        }
        onUpdate(`Analyzing line: ${currentLine.pcns.join(" ")}`);
        // Proceed to analysis; re-queueing/done updates happen inside the step functions
        if (isEvenHalfMoves) {
            // Initiator move (human move in practice app) -- get best move from Stockfish
            onUpdate("Preparing initiator analysis…");
            await findBestInitiatorMove(rootFEN, onUpdate);
        }
        else {
            // Responder move - get N best moves from Stockfish
            onUpdate("Preparing responder analysis…");
            await findNextResponseMoves(rootFEN, onUpdate);
        }
        // Update progress and results in UI
        onUpdate("Progress updated");
    }
    // Set fishing to false when analysis completes
    getCurrentFishState().isFishing = false;
    onUpdate("Fishing complete");
}
/**
 * Process responder move - get N best moves from current position
 */
async function findNextResponseMoves(rootFEN, onUpdate) {
    // Dequeue current line for processing
    const fishState = getCurrentFishState();
    const { config } = fishState;
    const line = fishState.wip[0];
    // Transposition check at responder step
    const key = line.position.split(" ").slice(0, -2).join(" ");
    if (fishState.transposedPositions?.has(key)) {
        line.isTransposition = true;
        line.transpositionTarget = key;
        line.isDone = true;
        fishState.wip.shift();
        fishState.done.push(line);
        if (typeof fishState.transpositionCount === "number") {
            fishState.transpositionCount += 1;
        }
        else {
            fishState.transpositionCount = 1;
        }
        onUpdate?.("Detected transposition; finalizing line");
        return;
    }
    const depth = Math.floor(line.pcns.length / 2);
    // Determine number of responses to analyze
    const responderCount = config.responderMoveCounts?.[depth] || config.defaultResponderCount;
    console.log("responderCount for depth", depth, "is", responderCount);
    const searchLineCount = Math.max(5, responderCount);
    // Get N best moves from Stockfish
    onUpdate?.(`Analyzing responder options to ${line.pcns.join(" ")}`);
    updateFishStatus(`Analyzing responder options to ${line.pcns.join(" ")}`);
    // console.log(`SF: ${responderCount} for findNextResponseMoves()`);
    const moves = await getTopLines(rootFEN, line.pcns.map((pcn) => pcn.slice(1)), // I guess we have to convert PCN back to long moves now...
    line.position, searchLineCount, MAX_STOCKFISH_DEPTH, {
        threads: config.threads,
        onUpdate: (res) => {
            // just update PV ticker; depth display handled elsewhere
            updateFishPvTickerThrottled(res.moves, res.position);
        },
    });
    onUpdate?.("Responder analysis complete");
    line.best5Replies = moves.slice(0, responderCount);
    // Create new lines for each response
    for (const analysisMove of line.best5Replies) {
        const newFEN = applyLongMoveToFEN(line.position, analysisMove.move);
        // Stockfish returns from-to notation, convert to PCN format
        const fromSquare = analysisMove.move.slice(0, 2);
        const toSquare = analysisMove.move.slice(2, 4);
        const piece = getPieceAtSquareFromFEN(fromSquare, line.position);
        const pieceName = getPieceCapitalized(piece);
        const pcnMove = `${pieceName}${fromSquare}${toSquare}`;
        const newLine = {
            lineIndex: ++getCurrentFishState().lineCounter, // Note: 0 is initial move.
            nodeId: "",
            sanGame: "", // Will be computed on demand
            pcns: line.pcns.concat(pcnMove), // Store PCN format
            score: analysisMove.score,
            position: newFEN,
            isDone: false,
            isFull: false,
            isMate: false,
            isStalemate: false,
            isTransposition: false,
            best5Replies: [],
            best5Alts: [],
        };
        getCurrentFishState().wip.push(newLine);
    }
    // Parent line has been expanded: mark as done (not necessarily full)
    line.isDone = true;
    // Record normalized FEN for transposition detection
    try {
        const pos = parseFEN(line.position);
        const norm = { ...pos, halfMoveClock: 0, fullMoveNumber: 1 };
        const key = toFEN(norm);
        fishState.transposedPositions?.set(key, true);
    }
    catch { }
    fishState.wip.shift(); // _now_ remove it.
    fishState.done.push(line);
    onUpdate?.("Expanded responder line");
}
/**
 * Process initiator move - get best move from current position
 */
async function findBestInitiatorMove(rootFEN, onUpdate) {
    const fishState = getCurrentFishState();
    const { config } = fishState;
    const line = fishState.wip[0];
    // Transposition check at initiator step
    const key = line.position.split(" ").slice(0, -2).join(" ");
    if (fishState.transposedPositions?.has(key)) {
        line.isTransposition = true;
        line.transpositionTarget = key;
        line.isDone = true;
        fishState.wip.shift();
        fishState.done.push(line);
        if (typeof fishState.transpositionCount === "number") {
            fishState.transpositionCount += 1;
        }
        else {
            fishState.transpositionCount = 1;
        }
        onUpdate?.("Detected transposition; finalizing line");
        return;
    }
    const bestMoves = await getTopLines(rootFEN, line.pcns.map((pcn) => pcn.slice(1)), // I guess we have to convert PCN back to long moves now...
    line.position, 5, MAX_STOCKFISH_DEPTH);
    line.best5Alts = bestMoves;
    // Check if there's a predefined move for this depth
    const depth = Math.floor(line.pcns.length / 2);
    const hasPredefined = depth < config.initiatorMoves.length;
    const predefinedMove = hasPredefined
        ? config.initiatorMoves[depth]
        : undefined;
    // Note: we must have the predefined move in long notation (because that's what stockfish gives us and we must compare it)
    const predefinedLongMove = predefinedMove
        ? parseMove(predefinedMove, line.position)
        : null;
    if (predefinedMove && !predefinedLongMove) {
        console.warn(`Predefined move ${predefinedMove} is not possible in position ${line.position}`);
        // Skip this predefined move and continue with best move
    }
    // Note: we append initiator moves to the line so just push it to the pcn array and update score
    if (predefinedMove && predefinedLongMove) {
        // If one of the returned moves is same as predefined move, use it. Otherwise compute score for it.
        const found = line.best5Alts.find((move) => move.move.slice(0, 2) === predefinedLongMove.from &&
            move.move.slice(2, 4) === predefinedLongMove.to);
        if (found) {
            // Stockfish already gave us the score so just use it
            line.pcns.push(predefinedLongMove.piece +
                predefinedLongMove.from +
                predefinedLongMove.to);
            line.score = found.score;
            // Advance position after initiator move
            line.position = applyMoveToFEN(line.position, predefinedLongMove);
            // Re-queue or finalize
            const halfMovesNow = line.pcns.length;
            if (halfMovesNow >= config.maxDepth * 2 + 1) {
                line.isDone = true;
                line.isFull = true;
                getCurrentFishState().wip.shift();
                getCurrentFishState().done.push(line);
                return;
            }
            return;
        }
        else {
            // Predefined move was not one of the top five moves found by Stockfish so ask it for this one.
            let bestMove = null;
            console.log("SF: 1 for to discover score for predefined move (", predefinedLongMove, ")");
            const moves = await getTopLines(config.rootFEN, [], line.position, 1, MAX_STOCKFISH_DEPTH, {
                threads: config.threads,
                onUpdate: (res) => {
                    const entry = res.moves.find((m) => m.move.from === predefinedLongMove.from &&
                        m.move.to === predefinedLongMove.to);
                    const d = entry?.depth || 0;
                    updateFishStatus(`Forcing predefined move depth… (d${d}/${res.depth})`);
                    updateFishPvTickerThrottled(res.moves, res.position);
                    onUpdate?.("Progress updated");
                },
                targetMove: predefinedLongMove.from + predefinedLongMove.to,
            });
            const bestCandidate = moves[0];
            if (!bestCandidate ||
                bestCandidate.move !== predefinedLongMove.from + predefinedLongMove.to) {
                console.warn(`THIS IS BAD! Stockfish or server did not return the predefined move ${predefinedMove}`);
                // Use the best move instead of the predefined move
                const bestMove = bestCandidate
                    ? parseMove(bestCandidate.move, line.position)
                    : null;
                if (!bestMove) {
                    console.warn(`Failed to parse returned best move in position ${line.position}`);
                    return;
                }
                line.pcns.push(bestMove.piece + bestMove.from + bestMove.to);
                line.score = bestCandidate.score;
                return;
            }
            bestMove = parseMove(bestCandidate.move, line.position);
            if (!bestCandidate) {
                console.warn(`No best move candidate returned`);
                return;
            }
            if (!bestMove) {
                console.warn(`Failed to parse candidate move in position ${line.position}`);
                return;
            }
            // Push the predefined move (which we validated is the best result) and advance position
            line.pcns.push(predefinedLongMove.piece +
                predefinedLongMove.from +
                predefinedLongMove.to);
            line.score = bestCandidate.score;
            line.position = applyMoveToFEN(line.position, predefinedLongMove);
            const halfMovesNow = line.pcns.length;
            if (halfMovesNow >= config.maxDepth * 2 + 1) {
                line.isDone = true;
                line.isFull = true;
                getCurrentFishState().wip.shift();
                getCurrentFishState().done.push(line);
                return;
            }
            return;
        }
    }
    else {
        // No predefined move. Take best move.
        const best = bestMoves[0];
        if (!best) {
            console.warn("Unexpected invariant: Stockfish gave no move");
            return;
        }
        const bestMove = parseLongMove(best.move, line.position);
        if (!bestMove) {
            console.warn("Unexpected invariant: Stockfish gave no best move?");
            console.log(bestMoves);
            console.log(best);
            console.log(bestMove);
            return;
        }
        line.pcns.push(bestMove.piece + bestMove.from + bestMove.to);
        line.score = best.score;
        // Advance position after initiator move
        line.position = applyMoveToFEN(line.position, bestMove);
        const halfMovesNow = line.pcns.length;
        if (halfMovesNow >= config.maxDepth * 2 + 1) {
            line.isDone = true;
            line.isFull = true;
            getCurrentFishState().wip.shift();
            getCurrentFishState().done.push(line);
            return;
        }
        return;
    }
}
//# sourceMappingURL=fishing.js.map