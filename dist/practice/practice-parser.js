import { parseMove } from "../utils/move-parsing.js";
import { applyMoveToFEN } from "../utils/fen-manipulation.js";
import { parseFEN } from "../utils/fen-utils.js";
// Convert Unicode chess piece symbols to English notation
function convertUnicodeToEnglish(move) {
  const unicodeToEnglish = {
    "♔": "K",
    "♕": "Q",
    "♖": "R",
    "♗": "B",
    "♘": "N",
    "♙": "P",
    "♚": "K",
    "♛": "Q",
    "♜": "R",
    "♝": "B",
    "♞": "N",
    "♟": "P",
  };
  let result = move;
  for (const [unicode, english] of Object.entries(unicodeToEnglish)) {
    result = result.replace(new RegExp(unicode, "g"), english);
  }
  return result;
}
// Manually construct moves when parseMove fails
export function constructMoveManually(move, fen) {
  const isWhiteTurn = fen.includes(" w ");
  const position = parseFEN(fen);
  // Handle king moves like Kg8, Kg1
  const kingMoveMatch = move.match(/^K([a-h][1-8])$/);
  if (kingMoveMatch) {
    const toSquare = kingMoveMatch[1];
    const piece = isWhiteTurn ? "K" : "k";
    const fromSquare = isWhiteTurn ? "e1" : "e8";
    return {
      from: fromSquare,
      to: toSquare,
      piece: piece,
    };
  }
  // Handle knight moves like Nc3, Nf6
  const knightMoveMatch = move.match(/^N([a-h][1-8])$/);
  if (knightMoveMatch) {
    const toSquare = knightMoveMatch[1];
    const piece = isWhiteTurn ? "N" : "n";
    // Find the knight that can move to this square
    const knights = [];
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        // Look for the correct case: uppercase for White, lowercase for Black
        const boardPiece = position.board[rank][file];
        if (boardPiece === piece) {
          const square =
            String.fromCharCode("a".charCodeAt(0) + file) + (8 - rank);
          knights.push({ rank, file, square });
        }
      }
    }
    // Choose the knight that can actually move to the destination
    if (knights.length > 0) {
      // For simplicity, use the first knight found
      const knight = knights[0];
      const fromSquare =
        String.fromCharCode("a".charCodeAt(0) + knight.file) +
        (8 - knight.rank);
      return {
        from: fromSquare,
        to: toSquare,
        piece: piece,
      };
    }
  }
  // Handle bishop moves like Bd3, Bg5
  const bishopMoveMatch = move.match(/^B([a-h][1-8])$/);
  if (bishopMoveMatch) {
    const toSquare = bishopMoveMatch[1];
    const piece = isWhiteTurn ? "B" : "b";
    // Find the bishop that can move to this square
    const bishops = [];
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        if (position.board[rank][file] === piece) {
          const square =
            String.fromCharCode("a".charCodeAt(0) + file) + (8 - rank);
          bishops.push({ rank, file, square });
        }
      }
    }
    // Choose the bishop that can actually move to the destination
    if (bishops.length > 0) {
      const toRank = parseInt(toSquare[1]) - 1;
      const toFile = toSquare.charCodeAt(0) - "a".charCodeAt(0);
      for (const bishop of bishops) {
        const rankDiff = Math.abs(bishop.rank - toRank);
        const fileDiff = Math.abs(bishop.file - toFile);
        // Bishop moves diagonally: rank and file differences must be equal
        if (rankDiff === fileDiff && rankDiff > 0) {
          const fromSquare =
            String.fromCharCode("a".charCodeAt(0) + bishop.file) +
            (8 - bishop.rank);
          return {
            from: fromSquare,
            to: toSquare,
            piece: piece,
          };
        }
      }
      // Fallback to first bishop if no valid move found
      const bishop = bishops[0];
      const fromSquare =
        String.fromCharCode("a".charCodeAt(0) + bishop.file) +
        (8 - bishop.rank);
      return {
        from: fromSquare,
        to: toSquare,
        piece: piece,
      };
    }
  }
  // Handle rook moves like Rd1, Rg8
  const rookMoveMatch = move.match(/^R([a-h][1-8])$/);
  if (rookMoveMatch) {
    const toSquare = rookMoveMatch[1];
    const piece = isWhiteTurn ? "R" : "r";
    // Find the rook that can move to this square
    const rooks = [];
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        if (position.board[rank][file] === piece) {
          const square =
            String.fromCharCode("a".charCodeAt(0) + file) + (8 - rank);
          rooks.push({ rank, file, square });
        }
      }
    }
    // Choose the rook that makes the most sense for the move
    if (rooks.length > 0) {
      // For simplicity, choose the first rook
      const rook = rooks[0];
      const fromSquare =
        String.fromCharCode("a".charCodeAt(0) + rook.file) + (8 - rook.rank);
      return {
        from: fromSquare,
        to: toSquare,
        piece: piece,
      };
    }
  }
  // Handle queen moves like Qd1, Qg8
  const queenMoveMatch = move.match(/^Q([a-h][1-8])$/);
  if (queenMoveMatch) {
    const toSquare = queenMoveMatch[1];
    const piece = isWhiteTurn ? "Q" : "q";
    // Find the queen that can move to this square
    const queens = [];
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        if (position.board[rank][file] === piece) {
          const square =
            String.fromCharCode("a".charCodeAt(0) + file) + (8 - rank);
          queens.push({ rank, file, square });
        }
      }
    }
    // Choose the queen that makes the most sense for the move
    if (queens.length > 0) {
      // For simplicity, choose the first queen
      const queen = queens[0];
      const fromSquare =
        String.fromCharCode("a".charCodeAt(0) + queen.file) + (8 - queen.rank);
      return {
        from: fromSquare,
        to: toSquare,
        piece: piece,
      };
    }
  }
  // Handle piece captures like Bxd2, Qxd2
  const pieceCaptureMatch = move.match(/^([KQRBN])x([a-h][1-8])$/);
  if (pieceCaptureMatch) {
    const pieceType = pieceCaptureMatch[1];
    const toSquare = pieceCaptureMatch[2];
    const piece = isWhiteTurn ? pieceType : pieceType.toLowerCase();
    // Find the piece that can make this capture
    const pieces = [];
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        if (position.board[rank][file] === piece) {
          const square =
            String.fromCharCode("a".charCodeAt(0) + file) + (8 - rank);
          pieces.push({ rank, file, square });
        }
      }
    }
    // Choose the piece that makes the most sense for the capture
    if (pieces.length > 0) {
      // For simplicity, choose the first piece
      const selectedPiece = pieces[0];
      const fromSquare =
        String.fromCharCode("a".charCodeAt(0) + selectedPiece.file) +
        (8 - selectedPiece.rank);
      return {
        from: fromSquare,
        to: toSquare,
        piece: piece,
      };
    }
  }
  // Handle pawn captures like dxc4, exd5, fxe6
  const pawnCaptureMatch = move.match(/^([a-h])x([a-h][1-8])$/);
  if (pawnCaptureMatch) {
    const fromFile = pawnCaptureMatch[1];
    const toSquare = pawnCaptureMatch[2];
    const piece = isWhiteTurn ? "P" : "p";
    // Find the pawn on the specified file that can make this capture
    for (let rank = 0; rank < 8; rank++) {
      const file = fromFile.charCodeAt(0) - "a".charCodeAt(0);
      if (position.board[rank][file] === piece) {
        const fromSquare = `${fromFile}${8 - rank}`;
        return {
          from: fromSquare,
          to: toSquare,
          piece: piece,
        };
      }
    }
  }
  // Handle simple pawn moves like d5, e4
  const pawnMoveMatch = move.match(/^([a-h][1-8])$/);
  if (pawnMoveMatch) {
    const toSquare = pawnMoveMatch[1];
    const toRank = parseInt(toSquare[1]) - 1;
    const toFile = toSquare.charCodeAt(0) - "a".charCodeAt(0);
    const piece = isWhiteTurn ? "P" : "p";
    // Look for pawns at their starting positions
    const startingRank = isWhiteTurn ? 6 : 1; // White pawns start on rank 2 (index 6), Black pawns start on rank 7 (index 1)
    if (position.board[startingRank][toFile] === piece) {
      const fromSquare = `${toSquare[0]}${8 - startingRank}`;
      return {
        from: fromSquare,
        to: toSquare,
        piece: piece,
      };
    }
    // Also check one rank closer to the destination (for pawns that have already moved)
    const closerRank = isWhiteTurn ? startingRank - 1 : startingRank + 1;
    if (closerRank >= 0 && closerRank < 8) {
      if (position.board[closerRank][toFile] === piece) {
        const fromSquare = `${toSquare[0]}${8 - closerRank}`;
        return {
          from: fromSquare,
          to: toSquare,
          piece: piece,
        };
      }
    }
  }
  return null;
}
// Parse opening lines from text format
export function parseOpeningLines(text) {
  const lines = text.trim().split("\n");
  const openingLines = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    // Split line into moves and comment
    const commentIndex = line.indexOf("//");
    let movesText, comment;
    if (commentIndex !== -1) {
      movesText = line.substring(0, commentIndex).trim();
      comment = line.substring(commentIndex + 2).trim();
    } else {
      movesText = line.trim();
      comment = "";
    }
    // Extract moves (split by whitespace and filter out move numbers)
    const moves = movesText
      .split(/\s+/)
      .filter((token) => token.length > 0 && !token.match(/^\d+\.$/))
      .map((move) => move.replace(/^\d+\.\s*/, "")) // Remove move numbers
      .map((move) => convertUnicodeToEnglish(move)); // Convert Unicode to English
    if (moves.length > 0) {
      openingLines.push({
        name: comment || `Opening Line ${openingLines.length + 1}`,
        moves: moves,
      });
    }
  }
  return openingLines;
}
// Build a Map of positions to expected moves
export function buildPositionMap(openingLines, startingFEN) {
  const positionMap = new Map();
  for (const line of openingLines) {
    let currentFEN = startingFEN;
    for (let i = 0; i < line.moves.length; i++) {
      const move = line.moves[i];
      if (!positionMap.has(currentFEN)) {
        positionMap.set(currentFEN, []);
      }
      const expectedMoves = positionMap.get(currentFEN);
      if (!expectedMoves.includes(move)) {
        expectedMoves.push(move);
      }
      try {
        const parsedMove = parseMove(move, currentFEN);
        if (parsedMove) {
          const isWhiteTurn = currentFEN.includes(" w ");
          const isWhitePiece =
            parsedMove.piece === parsedMove.piece.toUpperCase();
          // Only check basic validation: correct player's turn
          const allValidationsPass = isWhitePiece === isWhiteTurn;
          if (allValidationsPass) {
            const newFEN = applyMoveToFEN(currentFEN, parsedMove);
            currentFEN = newFEN;
          } else {
            // Try to fix the move by constructing it manually
            const correctedMove = constructMoveManually(move, currentFEN);
            if (correctedMove) {
              const newFEN = applyMoveToFEN(currentFEN, correctedMove);
              currentFEN = newFEN;
            } else {
              console.warn(
                `Failed to advance position for move ${move}, skipping`,
              );
            }
          }
        } else {
          // Try to fix the move by constructing it manually
          const correctedMove = constructMoveManually(move, currentFEN);
          if (correctedMove) {
            const newFEN = applyMoveToFEN(currentFEN, correctedMove);
            currentFEN = newFEN;
          } else {
            console.warn(
              `Failed to advance position for move ${move}, skipping`,
            );
          }
        }
      } catch (e) {
        console.warn(
          `Failed to parse move ${move} in position ${currentFEN}:`,
          e,
        );
      }
    }
  }
  return positionMap;
}
//# sourceMappingURL=practice-parser.js.map
