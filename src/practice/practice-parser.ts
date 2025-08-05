import { parseMove } from "../utils/move-parsing.js";
import { applyMoveToFEN } from "../utils/fen-manipulation.js";
import { OpeningLine } from "./practice-types.js";
import {
  convertSANLineToPCN,
  formatPCNLineWithMoveNumbers,
} from "../utils/pcn-utils.js";
import { getPieceAtSquareFromFEN } from "../utils/fen-utils.js";

// Parse opening lines from text
export function parseOpeningLines(text: string): OpeningLine[] {
  const lines = text.trim().split("\n");
  const openingLines: OpeningLine[] = [];

  for (const line of lines) {
    if (line.trim() === "") continue;

    // Remove comments and clean the line
    const cleanLine = line.replace(/\s*\/\/.*$/, "").trim();
    if (cleanLine === "") continue;

    // Extract moves (remove move numbers and clean up)
    const moves = cleanLine
      .replace(/\d+\./g, " ") // Replace move numbers with spaces
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim()
      .split(" ")
      .filter((move) => move.length > 0);

    if (moves.length > 0) {
      openingLines.push({
        name:
          line.match(/\/\/\s*(.+)$/)?.[1] ||
          `Opening Line ${openingLines.length + 1}`,
        moves,
      });
    }
  }

  return openingLines;
}

// Convert opening lines to PCN notation
export function convertOpeningLinesToPCN(
  openingLines: OpeningLine[],
  startingFEN: string,
): OpeningLine[] {
  return openingLines.map((line) => {
    // Check if moves are already in PCN format (contain piece letters)
    const isPCNFormat = line.moves.some((move) =>
      move.match(/^[NBRQKP][a-h][1-8][a-h][1-8]$/),
    );

    let pcnMoves: string;
    if (isPCNFormat) {
      // Already in PCN format, just join with move numbers
      pcnMoves = formatPCNLineWithMoveNumbers(line.moves);
    } else {
      // Convert from SAN to PCN
      pcnMoves = convertSANLineToPCN(line.moves, startingFEN);
    }

    const result = {
      name: line.name,
      moves: pcnMoves
        .split(" ")
        .filter((move: string) => move.length > 0 && !move.match(/^\d+\.$/)),
    };
    return result;
  });
}

// Build a Map of positions to expected moves
export function buildPositionMap(
  openingLines: OpeningLine[],
  startingFEN: string,
): Map<string, string[]> {
  const positionMap = new Map<string, string[]>();

  for (const line of openingLines) {
    let currentFEN = startingFEN;
    for (let i = 0; i < line.moves.length; i++) {
      const move = line.moves[i];

      // Add the move to the position map for the current FEN
      if (!positionMap.has(currentFEN)) {
        positionMap.set(currentFEN, []);
      }
      const expectedMoves = positionMap.get(currentFEN)!;
      if (!expectedMoves.includes(move)) {
        expectedMoves.push(move);
      }

      // Extract the from-to squares from the PCN move
      let fromToSquares: string;
      if (move === "O-O" || move === "O-O-O") {
        fromToSquares = move;
      } else if (move.match(/^[NBRQKP][a-h][1-8][a-h][1-8]$/)) {
        fromToSquares = move.substring(1, 3) + move.substring(3, 5);
      } else if (move.match(/^[a-h][1-8][a-h][1-8]$/)) {
        fromToSquares = move;
      } else {
        const parsedMove = parseMove(move, currentFEN);
        if (parsedMove) {
          fromToSquares = parsedMove.from + parsedMove.to;
        } else {
          console.warn(`Failed to parse move: ${move}`);
          break;
        }
      }

      // Apply the move using the from-to squares or castling notation
      if (fromToSquares === "O-O" || fromToSquares === "O-O-O") {
        const parsedMove = parseMove(fromToSquares, currentFEN);
        if (parsedMove) {
          const newFEN = applyMoveToFEN(currentFEN, parsedMove);
          currentFEN = newFEN;
        } else {
          console.warn(`Failed to parse castling move: ${fromToSquares}`);
          break;
        }
      } else if (
        fromToSquares.length === 4 &&
        /^[a-h][1-8][a-h][1-8]$/.test(fromToSquares)
      ) {
        const fromSquare = fromToSquares.substring(0, 2);
        const toSquare = fromToSquares.substring(2, 4);
        const piece = getPieceAtSquareFromFEN(fromSquare, currentFEN);
        const chessMove = {
          from: fromSquare,
          to: toSquare,
          piece: piece,
        };
        const newFEN = applyMoveToFEN(currentFEN, chessMove);
        currentFEN = newFEN;
      } else {
        console.warn(`Invalid from-to squares: ${fromToSquares}`);
        break;
      }
    }
  }

  // Debug output
  // console.log("Position map built with grouped moves:");
  // for (const [fen, moves] of positionMap.entries()) {
  //   console.log(`${fen} → ${moves.join(", ")}`);
  // }

  return positionMap;
}
