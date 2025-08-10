import { parseMove } from "./move-parsing.js";
import { applyMoveToFEN } from "./fen-manipulation.js";
/**
 * Convert a line of SAN moves to PCN (Piece Coordinate Notation)
 * @param sanMoves - Array of SAN moves (e.g., ["Nf3", "Nf6", "d4"])
 * @param startingFEN - Starting FEN position
 * @returns String with PCN moves (e.g., "1. Ng1f3 g8f6 2. d2d4 d7d5")
 */
export function convertSANLineToPCN(sanMoves, startingFEN) {
  let currentFEN = startingFEN;
  const pcnMoves = [];
  let moveNumber = 1;
  let whiteMove = "";
  for (let i = 0; i < sanMoves.length; i++) {
    const move = sanMoves[i];
    try {
      // Handle castling moves specially
      if (move === "O-O" || move === "O-O-O") {
        const pcnMove = move; // Keep castling notation as-is
        // Determine if this is white's move (even index) or black's move (odd index)
        if (i % 2 === 0) {
          // White's move
          whiteMove = pcnMove;
          if (i === sanMoves.length - 1) {
            // Last move and it's white's turn - add the move number and white move
            pcnMoves.push(`${moveNumber}. ${whiteMove}`);
          }
        } else {
          // Black's move - add the move number and both moves
          pcnMoves.push(`${moveNumber}. ${whiteMove} ${pcnMove}`);
          moveNumber++;
          whiteMove = "";
        }
        // Apply castling move to FEN
        const parsedMove = parseMove(move, currentFEN);
        if (parsedMove) {
          currentFEN = applyMoveToFEN(currentFEN, parsedMove);
        }
        continue;
      }
      const parsedMove = parseMove(move, currentFEN);
      if (parsedMove) {
        // Get piece name (always capital)
        const pieceName = getPieceCapitalized(parsedMove.piece);
        const pcnMove = `${pieceName}${parsedMove.from}${parsedMove.to}`;
        // Determine if this is white's move (even index) or black's move (odd index)
        if (i % 2 === 0) {
          // White's move
          whiteMove = pcnMove;
          if (i === sanMoves.length - 1) {
            // Last move and it's white's turn - add the move number and white move
            pcnMoves.push(`${moveNumber}. ${whiteMove}`);
          }
        } else {
          // Black's move - add the move number and both moves
          pcnMoves.push(`${moveNumber}. ${whiteMove} ${pcnMove}`);
          moveNumber++;
          whiteMove = "";
        }
        currentFEN = applyMoveToFEN(currentFEN, parsedMove);
      } else {
        console.warn(
          `convertSANLineToPCN: Failed to parse move: ${move}`,
          "starting at",
          [startingFEN],
          "step",
          i,
          " while applying this line:",
          sanMoves,
        );
        // Skip this move if we can't parse it
      }
    } catch (error) {
      console.warn(`Error parsing move ${move}:`, error);
      // Skip this move if there's an error
    }
  }
  return pcnMoves.join(" ");
}
/**
 * Convert a single PCN move to SAN
 * @param pcnMove - PCN move (e.g., "Ng1f3", "O-O")
 * @param fen - Current FEN position
 * @returns SAN move or null if conversion fails
 */
export function convertPCNToSAN(pcnMove, _fen) {
  try {
    if (pcnMove === "O-O" || pcnMove === "O-O-O") {
      return pcnMove; // Castling stays the same
    }
    // Extract from-to squares from PCN
    if (pcnMove.match(/^[NBRQKP][a-h][1-8][a-h][1-8]$/)) {
      const pieceName = pcnMove[0]; // First character is piece name
      const fromSquare = pcnMove.substring(1, 3);
      const toSquare = pcnMove.substring(3, 5);
      // Create SAN based on piece type
      if (pieceName === "P") {
        // Pawn move - check if it's a capture
        const fromFile = fromSquare[0];
        const toFile = toSquare[0];
        if (fromFile !== toFile) {
          // Capture - include file
          return `${fromFile}x${toSquare}`;
        } else {
          // Simple pawn move
          return toSquare;
        }
      } else {
        // Piece move - piece name + destination
        return pieceName + toSquare;
      }
    }
    return null;
  } catch (error) {
    console.warn(`Failed to convert PCN to SAN: ${pcnMove}`, error);
    return null;
  }
}
/**
 * Convert a PCN line to SAN line
 * Note: this is not a safe conversion! It does not disambiguate!
 *
 * @param pcnLine - PCN line (e.g., "1. Ng1f3 g8f6 2. d2d4 d7d5")
 * @param startingFEN - Starting FEN position
 * @returns SAN line
 */
export function convertPCNLineToSAN(pcnLine, startingFEN) {
  const moveGroups = pcnLine.split(/\d+\.\s+/).filter((group) => group.trim());
  const sanMoves = [];
  let currentFEN = startingFEN;
  for (const group of moveGroups) {
    const moves = group
      .trim()
      .split(/\s+/)
      .filter((move) => move.length > 0);
    for (const move of moves) {
      const sanMove = convertPCNToSAN(move, currentFEN);
      if (sanMove) {
        sanMoves.push(sanMove);
        // Update FEN for next move by parsing the SAN move
        const parsedMove = parseMove(sanMove, currentFEN);
        if (parsedMove) {
          currentFEN = applyMoveToFEN(currentFEN, parsedMove);
        }
      }
    }
  }
  return sanMoves.join(" ");
}
/**
 * Extract individual PCN moves from a PCN line
 * @param pcnLine - PCN line (e.g., "1. Ng1f3 g8f6 2. d2d4 d7d5")
 * @returns Array of individual PCN moves
 */
export function extractPCNMoves(pcnLine) {
  const moves = [];
  const moveGroups = pcnLine.split(/\d+\.\s+/).filter((group) => group.trim());
  for (const group of moveGroups) {
    const groupMoves = group
      .trim()
      .split(/\s+/)
      .filter((move) => move.length > 0);
    moves.push(...groupMoves);
  }
  return moves;
}
/**
 * Get piece name from piece character (always capital)
 * @param piece - Piece character from FEN (P, N, B, R, Q, K, p, n, b, r, q, k)
 * @returns Piece name (P, N, B, R, Q, K)
 */
function getPieceCapitalized(piece) {
  const pieceMap = {
    P: "P",
    p: "P", // Pawn
    N: "N",
    n: "N", // Knight
    B: "B",
    b: "B", // Bishop
    R: "R",
    r: "R", // Rook
    Q: "Q",
    q: "Q", // Queen
    K: "K",
    k: "K", // King
  };
  return pieceMap[piece] || "P"; // Default to pawn if unknown
}
/**
 * Format PCN moves with move numbers
 * @param pcns - Array of PCN moves
 * @returns Formatted string with move numbers
 */
export function formatPCNLineWithMoveNumbers(pcns) {
  let result = "";
  for (let i = 0; i < pcns.length; i++) {
    if (i % 2 === 0) {
      // White's move - add move number
      const moveNumber = Math.floor(i / 2) + 1;
      result += `${moveNumber}. ${pcns[i]}`;
    } else {
      // Black's move - just add the move
      result += ` ${pcns[i]}`;
    }
    if (i < pcns.length - 1) {
      result += " ";
    }
  }
  return result;
}
/**
 * Compute SAN game string from PCN moves
 * @param pcns - Array of PCN moves
 * @param rootFEN - Starting FEN position
 * @returns SAN game string
 */
export function computeSanGameFromPCN(pcns, rootFEN) {
  let currentFEN = rootFEN;
  const sanMoves = [];
  for (const pcn of pcns) {
    const sanMove = convertPCNToSAN(pcn, currentFEN);
    if (sanMove) {
      sanMoves.push(sanMove);
      // Update FEN for next move
      const parsedMove = parseMove(sanMove, currentFEN);
      if (parsedMove) {
        currentFEN = applyMoveToFEN(currentFEN, parsedMove);
      }
    }
  }
  return sanMoves.join(" ");
}
//# sourceMappingURL=pcn-utils.js.map
