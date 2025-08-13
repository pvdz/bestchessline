import type { FishLine } from "./types.js";

import { parseMove } from "../../utils/move-parsing.js";
import {
  applyLongMoveToFEN,
  applyMoveToFEN,
} from "../../utils/fen-manipulation.js";
import { getPieceCapitalized } from "../../utils/notation-utils.js";
import { getPieceAtSquareFromFEN, parseFEN } from "../../utils/fen-utils.js";
import { log } from "../../utils/logging.js";
import { compareAnalysisMoves } from "../best/bestmove-utils.js";
import { getCurrentFishState } from "./fish-state.js";
import { updateFishStatus, updateFishPvTickerThrottled } from "./fish-ui.js";
import { getInputElementOrThrow } from "../../utils/dom-helpers.js";
import { ChessMove } from "../types.js";
import { getTopLines } from "./fish-utils.js";
import { apiLineGet, apiLinesPut } from "./fish-remote.js";
import { SimpleMove } from "../../utils/types.js";
import { parseLongMove } from "../../utils/move-parser.js";

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

    rootAnalysis = await getTopLines(rootFEN, 5, {
      maxDepth: 20,
      threads: getCurrentFishState().config.threads,
      onUpdate: (res) => {
        const minDepth = res.moves.length
          ? Math.min(...res.moves.map((m) => m.depth))
          : 0;
        updateFishStatus(`Analyzing root… (min d${minDepth}/${res.depth})`);
        updateFishPvTickerThrottled(res.moves, res.position);
      },
    });
  } catch (error) {
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

    const fenAfterMove = applyMoveToFEN(config.rootFEN, parsedMove);
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

      const moves = await getTopLines(fenAfterMove, 1, {
        maxDepth: 20,
        threads: config.threads,
        onUpdate: (res) => {
          updateFishStatus(
            `Scoring predefined move… (d${res.moves[0]?.depth || 0}/${res.depth})`,
          );
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
  } else {
    // Ask Stockfish for best move
    // console.log("SF: initial move (find best for missing a predefined move)");

    const moves = await getTopLines(config.rootFEN, 1, {
      maxDepth: 20,
      threads: config.threads,
      onUpdate: (res) => {
        const d = res.moves[0]?.depth || 0;
        updateFishStatus(`Picking best root move… (d${d}/${res.depth})`);
        updateFishPvTickerThrottled(res.moves, res.position);
      },
    });

    const bestMove = moves[0];

    if (!bestMove) {
      log("No moves available from Stockfish");
      throw new Error("No moves available from Stockfish. Mate? Stalemate?");
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
  const searchLineCount = Math.max(5, responderCount);

  const known: SimpleMove[] | null = await apiLineGet(
    line.position,
    searchLineCount,
    20,
  );
  if (known) {
    onUpdate?.(
      `Fetched cached line details from server for ${line.pcns.join(" ")}`,
    );
    line.best5Replies = known;
    console.log(
      "Retrieved cached results for",
      line.position,
      searchLineCount,
      "->",
      known,
    );
  } else {
    // Get N best moves from Stockfish
    onUpdate?.(`Analyzing responder options to ${line.pcns.join(" ")}`);
    updateFishStatus(`Analyzing responder options to ${line.pcns.join(" ")}`);
    // console.log(`SF: ${responderCount} for findNextResponseMoves()`);
    const moves = await getTopLines(line.position, searchLineCount, {
      maxDepth: 20,
      threads: config.threads,
      onUpdate: (res) => {
        // just update PV ticker; depth display handled elsewhere
        updateFishPvTickerThrottled(res.moves, res.position);
      },
    });
    onUpdate?.("Responder analysis complete");

    line.best5Replies = moves.slice(0, 5);
  }

  // Create new lines for each response
  for (const analysisMove of line.best5Replies) {
    const newFEN = applyLongMoveToFEN(line.position, analysisMove.move);
    // Stockfish returns from-to notation, convert to PCN format
    const fromSquare = analysisMove.move.slice(0, 2);
    const toSquare = analysisMove.move.slice(2, 4);
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

  const bestMoves = await getTopLines(line.position, 5);
  line.best5Alts = bestMoves;

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
    const found = line.best5Alts.find(
      (move) =>
        move.move.slice(0, 2) === predefinedLongMove.from &&
        move.move.slice(2, 4) === predefinedLongMove.to,
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

      let best: SimpleMove | undefined = undefined;
      let bestMove: ChessMove | null = null;
      const knownOne: SimpleMove[] | null = await apiLineGet(
        line.position,
        1,
        20,
      );
      console.log("asked server, got:", knownOne);
      best = knownOne?.[0];
      if (best) {
        onUpdate?.(
          `Fetched cached line details from server for predefined initiator move ${predefinedLongMove}`,
        );
        console.log(
          "Retrieved cached results for",
          line.position,
          1,
          "->",
          knownOne,
        );
        bestMove = parseMove(best.move, line.position);
      } else {
        console.log(
          "SF: 1 for to discover score for predefined move (",
          predefinedLongMove,
          ")",
        );

        const fenAfterMove = applyMoveToFEN(line.position, predefinedLongMove);
        const moves = await getTopLines(fenAfterMove, 1, {
          maxDepth: 20,
          threads: getCurrentFishState().config.threads,
          onUpdate: (res) => {
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
        });

        const best = moves[0];
        if (
          !best ||
          best.move !== predefinedLongMove.from + predefinedLongMove.to
        ) {
          console.warn(
            `Stockfish/server did not return the predefined move ${predefinedMove} (got ${best.move} instead)`,
          );
          // Use the best move instead of the predefined move
          const bestMove = parseMove(best.move, line.position);
          if (!bestMove) {
            console.warn(
              `Failed to parse move ${best.move} in position ${line.position}`,
            );
            return;
          }
          line.pcns.push(bestMove.piece + bestMove.from + bestMove.to);
          line.score = best.score;
          return;
        }

        bestMove = parseMove(best.move, line.position);
      }

      if (!best) {
        console.warn(`I think best should always exist at this point`, best);
        return;
      }
      if (!bestMove) {
        console.warn(
          `Failed to parse move ${best.move} in position ${line.position}`,
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
