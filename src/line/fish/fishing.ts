import type { FishLine } from "./types.js";
import { analyzePosition } from "../../utils/stockfish-client.js";

import { parseMove } from "../../utils/move-parsing.js";
import { applyMoveToFEN } from "../../utils/fen-manipulation.js";
import { getPieceCapitalized } from "../../utils/notation-utils.js";
import { getPieceAtSquareFromFEN, parseFEN } from "../../utils/fen-utils.js";
import { log } from "../../utils/logging.js";
import { compareAnalysisMoves } from "../best/bestmove-utils.js";
import { getCurrentFishState } from "./fish-state.js";
import { updateFishStatus, updateFishPvTickerThrottled } from "./fish-ui.js";
import { getInputElementOrThrow } from "../../utils/dom-helpers.js";
import { AnalysisMove } from "../types.js";
import { filterPvMoves, sortPvMoves, top5 } from "./fish-utils.js";

export async function initFishing() {
  const rootFEN = getCurrentFishState().config.rootFEN;
  const threads = Number(getInputElementOrThrow("fish-threads").value);
  console.log("Fishing with", threads, "threads");
  getCurrentFishState().config.threads = threads;

  // Ensure initiator color reflects the side to move at root
  try {
    const rootTurn = parseFEN(rootFEN).turn;
    getCurrentFishState().config.initiatorIsWhite = rootTurn === "w";
  } catch (e) {
    throw new Error(
      "Failed to parse rootFEN for initiator color; keeping existing flag",
    );
  }

  // Get root score and update config
  let rootAnalysis;
  try {
    // console.log(
    //   "SF: 5 for root analysis:",
    //   getCurrentFishState().config.threads,
    // );
    rootAnalysis = await analyzePosition(
      rootFEN,
      {
        threads: getCurrentFishState().config.threads,
        // Use MultiPV=5 so we can reuse top list for predefined move scoring
        multiPV: 5,
        depth: 20,
      },
      (res) => {
        const minDepth = res.moves.length
          ? Math.min(...res.moves.map((m) => m.depth))
          : 0;
        updateFishStatus(`Analyzing root… (min d${minDepth}/${res.depth})`);
        updateFishPvTickerThrottled(res.moves, res.position);
      },
    );
  } catch (error) {
    console.error("Error in root analysis:", error);
    throw error;
  }

  // Sort from the perspective of the initiator at root.
  // If initiatorIsWhite: positive is good for white. If initiatorIsWhite is false: positive is good for black.
  // compareAnalysisMoves expects direction relative to WHITE perspective: desc favors white, asc favors black.
  const direction = getCurrentFishState().config.initiatorIsWhite
    ? "desc"
    : "asc";
  const bestMove = rootAnalysis.moves.sort((a, b) =>
    compareAnalysisMoves(a, b, direction),
  )[0];
  // Store baseline score for delta calculations and cache top root moves
  getCurrentFishState().config.baselineScore = bestMove.score;
  getCurrentFishState().config.baselineMoves = rootAnalysis.moves
    .sort((a, b) => compareAnalysisMoves(a, b, direction))
    .slice(0, 5)
    .map((m) => ({
      move: m.move.from + m.move.to,
      // Keep engine score as-is; interpretation will be normalized at usage time
      score: m.score,
    }));
}

export async function initInitialMove() {
  // Create initial move
  const initialLine = await createInitialMove();
  getCurrentFishState().wip.push(initialLine);
}

/**
 * Create the initial move for analysis
 */
async function createInitialMove(): Promise<FishLine> {
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

    const newFEN = applyMoveToFEN(config.rootFEN, parsedMove);
    let score = 0;
    if (top) {
      score = top.score;
      // console.log(
      //   "SF: initial move was part of top5 of the root position (",
      //   predefinedMove,
      //   ")",
      // );
    } else {
      // console.log(
      //   "SF: initial move (find out for predefined move",
      //   predefinedMove,
      //   ")",
      // );
      const analysis = await analyzePosition(
        newFEN,
        {
          threads: config.threads,
          multiPV: 1,
          depth: 20,
        },
        (res) => {
          updateFishStatus(
            `Scoring predefined move… (d${res.moves[0]?.depth || 0}/${res.depth})`,
          );
          updateFishPvTickerThrottled(res.moves, res.position);
        },
      );
      const s = analysis.moves[0]?.score || 0;
      // Normalize to initiator perspective using newFEN (opponent to move)
      const turn = parseFEN(newFEN).turn;
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
      position: newFEN,
      isDone: false,
      isFull: false,
      isMate: false,
      isStalemate: false,
      isTransposition: false,
      transpositionTarget: "",
    };
  } else {
    // Ask Stockfish for best move
    // console.log("SF: initial move (find best for missing a predefined move)");
    const analysis = await analyzePosition(
      config.rootFEN,
      {
        threads: config.threads,
        depth: 20,
        multiPV: 1,
      },
      (res) => {
        const d = res.moves[0]?.depth || 0;
        updateFishStatus(`Picking best root move… (d${d}/${res.depth})`);
        updateFishPvTickerThrottled(res.moves, res.position);
      },
    );
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

export async function keepFishing(onUpdate: (msg: string) => void) {
  // Main analysis loop
  while (
    getCurrentFishState().wip.length > 0 &&
    getCurrentFishState().isFishing
  ) {
    // Check if analysis should be stopped
    if (!getCurrentFishState().isFishing) {
      onUpdate("Analysis stopped by user");
      return;
    }

    const pcns = getCurrentFishState().wip[0].pcns;
    const halfMoves = pcns.length;
    const isEvenHalfMoves = halfMoves % 2 === 0;

    onUpdate(`Analyzing line: ${pcns.join(" ")}`);
    // Proceed to analysis; re-queueing/done updates happen inside the step functions

    if (isEvenHalfMoves) {
      // Initiator move (human move in practice app) -- get best move from Stockfish
      onUpdate("Preparing initiator analysis…");
      await findBestInitiatorMove(onUpdate);
    } else {
      // Responder move - get N best moves from Stockfish
      onUpdate("Preparing responder analysis…");
      await findNextResponseMoves(onUpdate);
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
async function findNextResponseMoves(
  onUpdate?: (msg: string) => void,
): Promise<void> {
  // Dequeue current line for processing
  const line = getCurrentFishState().wip[0];

  const { config } = getCurrentFishState();
  const depth = Math.floor(line.pcns.length / 2);

  // Determine number of responses to analyze
  const responderCount =
    config.responderMoveCounts?.[depth] || config.defaultResponderCount;

  // Get N best moves from Stockfish
  onUpdate?.(`Analyzing responder options to ${line.pcns.join(" ")}`);
  updateFishStatus(`Analyzing responder options to ${line.pcns.join(" ")}`);
  // console.log(`SF: ${responderCount} for findNextResponseMoves()`);
  const analysis = await analyzePosition(
    line.position,
    {
      threads: config.threads,
      multiPV: Math.max(5, responderCount), // We use this for the top5 as well
      depth: 20,
    },
    (res) => {
      // just update PV ticker; depth display handled elsewhere
      updateFishPvTickerThrottled(res.moves, res.position);
    },
  );
  onUpdate?.("Responder analysis complete");

  // Sort by quality using the central comparator, from the actual side to move
  const toMove = parseFEN(line.position).turn;
  const finalDepth = analysis.depth || 20;
  sortPvMoves(analysis.moves, toMove, finalDepth);

  top5(analysis.moves, line.best5Replies, toMove, finalDepth);

  const responses: AnalysisMove[] = filterPvMoves(
    analysis.moves,
    finalDepth,
  ).slice(0, responderCount);
  // Create new lines for each response
  for (const analysisMove of responses) {
    const newFEN = applyMoveToFEN(line.position, analysisMove.move);
    // Stockfish returns from-to notation, convert to PCN format
    const fromSquare = analysisMove.move.from;
    const toSquare = analysisMove.move.to;
    const piece = getPieceAtSquareFromFEN(fromSquare, line.position);
    const pieceName = getPieceCapitalized(piece);
    const pcnMove = `${pieceName}${fromSquare}${toSquare}`;

    const newLine: FishLine = {
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
  getCurrentFishState().wip.shift(); // _now_ remove it.
  getCurrentFishState().done.push(line);
  onUpdate?.("Expanded responder line");
}

/**
 * Process initiator move - get best move from current position
 */
async function findBestInitiatorMove(
  onUpdate?: (msg: string) => void,
): Promise<void> {
  const line = getCurrentFishState().wip[0];

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

  // Get best moves from Stockfish
  onUpdate?.(`Analyzing initiator best moves to ${line.pcns.join(" ")}`);
  updateFishStatus(`Analyzing initiator best moves to ${line.pcns.join(" ")}`);
  // console.log("SF: 5 for findBestInitiatorMove()");
  const analysis = await analyzePosition(
    line.position,
    {
      threads: getCurrentFishState().config.threads,
      depth: 20,
      multiPV: 5,
    },
    (res) => {
      updateFishPvTickerThrottled(res.moves, res.position);
    },
  );
  onUpdate?.("Initiator analysis complete");

  // White position score values positive, so order desc for white to have moves[0] be best
  const toMove = parseFEN(line.position).turn;
  top5(analysis.moves, line.best5Alts, toMove, 20);

  // Check if there's a predefined move for this depth
  const { config } = getCurrentFishState();
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
    console.warn(
      `Predefined move ${predefinedMove} is not possible in position ${line.position}`,
    );
    // Skip this predefined move and continue with best move
  }

  // Note: we append initiator moves to the line so just push it to the pcn array and update score
  if (predefinedMove && predefinedLongMove) {
    // If one of the returned moves is same as predefined move, use it. Otherwise compute score for it.
    const found = analysis.moves.find(
      (move) =>
        move.move.from === predefinedLongMove.from &&
        move.move.to === predefinedLongMove.to,
    );
    if (found) {
      // Stockfish already gave us the score so just use it
      line.pcns.push(
        predefinedLongMove.piece +
          predefinedLongMove.from +
          predefinedLongMove.to,
      );
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
    } else {
      // Predefined move was not one of the top five moves found by Stockfish so ask it for this one.

      console.log(
        "SF: 1 for to discover score for predefined move (",
        predefinedLongMove,
        ")",
      );
      const analysis = await analyzePosition(
        line.position,
        {
          threads: getCurrentFishState().config.threads,
          depth: 20,
          multiPV: 1,
          searchMoves: [predefinedLongMove.from + predefinedLongMove.to],
        },
        (res) => {
          const entry = res.moves.find(
            (m) =>
              m.move.from === predefinedLongMove.from &&
              m.move.to === predefinedLongMove.to,
          );
          const d = entry?.depth || 0;
          updateFishStatus(
            `Forcing predefined move depth… (d${d}/${res.depth})`,
          );
          updateFishPvTickerThrottled(res.moves, res.position);
        },
      );
      sortPvMoves(analysis.moves, toMove, 20);

      const best = analysis.moves[0];
      if (
        !best ||
        best.move.from !== predefinedLongMove.from ||
        best.move.to !== predefinedLongMove.to
      ) {
        console.warn(
          `Stockfish did not return the predefined move ${predefinedMove} (got ${best.move.from}${best.move.to} instead)`,
        );
        // Use the best move instead of the predefined move
        const bestMove = parseMove(
          best.move.from + best.move.to,
          line.position,
        );
        if (!bestMove) {
          console.warn(
            `Failed to parse move ${best.move.from + best.move.to} in position ${line.position}`,
          );
          return;
        }
        line.pcns.push(bestMove.piece + bestMove.from + bestMove.to);
        line.score = best.score;
        return;
      }

      const bestMove = parseMove(best.move.from + best.move.to, line.position);
      if (!bestMove) {
        console.warn(
          `Failed to parse move ${best.move.from + best.move.to} in position ${line.position}`,
        );
        return;
      }

      // Push the predefined move (which we validated is the best result) and advance position
      line.pcns.push(
        predefinedLongMove.piece +
          predefinedLongMove.from +
          predefinedLongMove.to,
      );
      line.score = best.score;
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
  } else {
    // No predefined move. Take best move.

    const best = analysis.moves[0];
    if (!best) {
      console.warn("Unexpected invariant: Stockfish gave no move");
      return;
    }

    const bestMove = parseMove(best.move.from + best.move.to, line.position);
    if (!bestMove) {
      console.warn("Unexpected invariant: Stockfish gave no best move?");
      console.log(analysis.moves);
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
