import { parseFEN } from "../../utils/fen-utils.js";
import { analyzePosition } from "../../utils/stockfish-client.js";
import { compareAnalysisMoves } from "../best/bestmove-utils.js";
import { updateFishPvTickerThrottled } from "./fish-ui.js";
import { apiLineGet, apiLinesPut } from "./fish-remote.js";
import { pauseUntilButton } from "../../utils/utils.js";
import { getElementByIdOrThrow } from "../../utils/dom-helpers.js";
/**
 * Generate line ID from SAN moves
 */
export function generateLineId(sans) {
    return sans.join("_") + "_" + Math.random().toString(36).substring(2, 8);
}
export function getRandomProofString() {
    return `R_${Math.random().toString(36).substring(2, 8)}`;
}
export function sortPvMoves(moves, firstMoveTurn, _maxDepth = 20) {
    const direction = (firstMoveTurn === "w") === (moves.length % 2 === 0) ? "desc" : "asc";
    moves.sort((a, b) => compareAnalysisMoves(a, b, { direction, prioritize: "score" }));
    return moves;
}
// Given a position, get the best lines from the server or compute them using stockfish
export async function getTopLines(rootFEN, // this is used to update the server for the practice app.
moves, // long moves. set to null when this is unknown. this is used to update the server for the practice app.
nowFEN, // fen to compute next moves from
searchLineCount, maxDepth, { threads = 1, onUpdate, targetMove, } = {}) {
    const useServerGet = getElementByIdOrThrow("fish-use-server-get").checked;
    const useServerPut = getElementByIdOrThrow("fish-use-server-put").checked;
    const usePauses = getElementByIdOrThrow("fish-enable-pauses").checked;
    if (targetMove)
        console.warn("Skipping server GET");
    if (useServerGet && !targetMove) {
        const known = await apiLineGet(nowFEN, searchLineCount, maxDepth);
        if (known) {
            console.log("getTopLines(): Retrieved cached results for", nowFEN, searchLineCount, "->", known);
            if (usePauses)
                await pauseUntilButton();
            return known.slice(0, searchLineCount); // Server may return _more_ than requested (or less)
        }
    }
    // - Find best five moves (from stockfish)
    // - Record it for feedback
    // - If there is a predefined move:
    //   - if the move is part of the top five, use it and the recorded score
    //   - if the move is not part of the top five, get the score for this move
    // - If there is no predefined move:
    //   - use the best move
    // - Record the move and score
    // - Throw it back in the queue to get responder moves
    // An alternative search method could be to compute the score for each valid
    // move from given position and then use the best move from the resulting set.
    // This would work but would be very expensive. And then there's still the
    // question mark around which scoring might be more reliable.
    // Who knows, maybe it doesn't really matter all that much for our purpose.
    // We could do this for the first two steps, as a separate table, then pull
    // the best responses to predefined steps. First two steps leads to only 200k
    // positions. We can easily hold that and apply a filter for predefined moves.
    console.log("getTopLines(): Server had no lines, manually computing them");
    // Get best moves from Stockfish
    const analysis = await analyzePosition(nowFEN, {
        threads,
        depth: maxDepth,
        multiPV: targetMove ? 1 : searchLineCount,
        targetMove,
    }, (res) => {
        // Update ticker each engine update
        updateFishPvTickerThrottled(res.moves, res.position);
    });
    // White position score values positive, so order desc for white to have moves[0] be best
    const toMove = parseFEN(nowFEN).turn;
    sortPvMoves(analysis.moves, toMove, maxDepth);
    const sorted = sortedAnalysisMovesToSimpleMoves(analysis.moves, searchLineCount, maxDepth);
    // Optionally send results to server
    if (useServerPut && !targetMove) {
        await apiLinesPut(rootFEN, moves, // how do I pass this in? does line have it?
        nowFEN, sorted, searchLineCount, 20);
    }
    console.log("getTopLines(): Manually computed lines:", sorted);
    if (usePauses)
        await pauseUntilButton();
    return sorted;
}
export async function getTopLinesTrapped(fen, targetLines, options = {}) {
    try {
        return await getTopLines(fen, [], fen, targetLines, options.maxDepth ?? 20, { threads: options.threads, onUpdate: options.onUpdate });
    }
    catch (e) {
        console.warn("getTopLines failed:", e);
        return null;
    }
}
export function filterPvMoves(moves, maxDepth = 20) {
    return moves.filter((m) => Math.abs(m.score) > 9000 || m.depth >= maxDepth);
}
export function sortedAnalysisMovesToSimpleMoves(moves, targetLines = Infinity, maxDepth = 20) {
    // Assumes `sortPvMoves(moves, firstMoveTurn, maxDepth);` was called on moves already
    const simples = [];
    // Build best x ordered by score relative to side to move, unique by move key; also record replies
    const uniqueTop = [];
    const seen = new Set();
    for (const m of moves) {
        if (Math.abs(m.score) < 9000 && m.depth < maxDepth)
            continue; // Skip non-fully-explored lines
        const key = m.move.from + m.move.to;
        if (seen.has(key))
            continue;
        seen.add(key);
        uniqueTop.push(m);
        if (uniqueTop.length >= targetLines)
            break;
    }
    uniqueTop.forEach((move) => {
        simples.push({
            move: move.move.from + move.move.to,
            score: move.score,
            mateIn: move.mateIn,
            draw: false, // TODO
        });
    });
    return simples;
}
//# sourceMappingURL=fish-utils.js.map