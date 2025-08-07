import { ChessMove, PieceNotation, PLAYER_COLORS } from "./types.js";
import { parseFEN, squareToCoords, coordsToSquare } from "./fen-utils.js";
import {
  getPieceTypeFromNotation,
  getColorFromNotation,
  createPieceNotation,
} from "../line/types.js";
import { logError } from "./logging.js";

/**
 * Move Parser and Validation Functions
 *
 * Provides functions for parsing chess moves from notation and validating
 * whether pieces can move from one square to another.
 */

/**
 * Parse a simple move string and return a ChessMove object
 */
export function parseSimpleMove(
  moveText: string,
  fen: string,
): ChessMove | null {
  const position = parseFEN(fen);
  const isWhiteTurn = position.turn === PLAYER_COLORS.WHITE;

  // Clean the move text
  const cleanMove = moveText.replace(/[+#?!]/, ""); // Remove check/checkmate symbols

  // Handle castling
  if (cleanMove === "O-O" || cleanMove === "0-0") {
    if (isWhiteTurn) {
      return {
        from: "e1",
        to: "g1",
        piece: "K",
        special: "castling",
        rookFrom: "h1",
        rookTo: "f1",
      };
    } else {
      return {
        from: "e8",
        to: "g8",
        piece: "k",
        special: "castling",
        rookFrom: "h8",
        rookTo: "f8",
      };
    }
  }

  if (cleanMove === "O-O-O" || cleanMove === "0-0-0") {
    if (isWhiteTurn) {
      return {
        from: "e1",
        to: "c1",
        piece: "K",
        special: "castling",
        rookFrom: "a1",
        rookTo: "d1",
      };
    } else {
      return {
        from: "e8",
        to: "c8",
        piece: "k",
        special: "castling",
        rookFrom: "a8",
        rookTo: "d8",
      };
    }
  }

  // Handle pawn moves (e4, e5, etc.)
  if (cleanMove.match(/^[a-h][1-8]$/)) {
    const toSquare = cleanMove;
    const piece = (isWhiteTurn ? "P" : "p") as PieceNotation;
    const fromSquare = findFromSquare(piece, toSquare, fen);
    if (fromSquare) {
      return { from: fromSquare, to: toSquare, piece };
    }
  }

  // Handle pawn captures (exd5, etc.)
  if (cleanMove.match(/^[a-h]x[a-h][1-8]$/)) {
    const fromFile = cleanMove[0];
    const toSquare = cleanMove.substring(2);
    const piece = (isWhiteTurn ? "P" : "p") as PieceNotation;

    // Find all pawns that can capture to the destination
    const position = parseFEN(fen);
    const candidates: string[] = [];

    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const square = coordsToSquare(rank, file);
        if (position.board[rank][file] === piece) {
          candidates.push(square);
        }
      }
    }

    // Filter candidates that can actually move to the destination
    const validCandidates = candidates.filter((fromSquare: string) =>
      canPawnMoveTo(fromSquare, toSquare, position.board),
    );

    // Use the file information to disambiguate
    const fileCandidates = validCandidates.filter(
      (fromSquare: string) => fromSquare[0] === fromFile,
    );

    if (fileCandidates.length === 1) {
      return { from: fileCandidates[0], to: toSquare, piece };
    }
  }

  // Handle pawn promotions (e8=Q, e8Q, etc.)
  const promotionMatch = cleanMove.match(/^([a-h][18])=?([QRBN])$/);
  if (promotionMatch) {
    const toSquare = promotionMatch[1];
    const promotionPiece = promotionMatch[2];
    const piece = (isWhiteTurn ? "P" : "p") as PieceNotation;

    const fromSquare = inferPawnFromSquare(toSquare, isWhiteTurn);
    if (fromSquare) {
      return {
        from: fromSquare,
        to: toSquare,
        piece,
        promotion: (isWhiteTurn
          ? promotionPiece
          : promotionPiece.toLowerCase()) as PieceNotation,
      };
    }
  }

  // Handle piece moves (Nf3, Rg1, etc.) - including disambiguation
  const pieceMatch = cleanMove.match(
    /^([KQRBN])([a-h]?[1-8]?)?x?([a-h][1-8])$/,
  );
  if (pieceMatch) {
    const pieceType = pieceMatch[1];
    const disambiguation = pieceMatch[2] || "";
    const toSquare = pieceMatch[3];
    const pieceNotation = (
      isWhiteTurn ? pieceType : pieceType.toLowerCase()
    ) as PieceNotation;
    const fromSquare = findFromSquareWithDisambiguation(
      pieceNotation,
      toSquare,
      disambiguation,
      fen,
    );
    if (fromSquare) {
      const piece = (
        isWhiteTurn ? pieceType : pieceType.toLowerCase()
      ) as PieceNotation;
      return { from: fromSquare, to: toSquare, piece };
    }
  }

  // Handle piece captures (Nxe4, etc.) - including disambiguation
  const captureMatch = cleanMove.match(
    /^([KQRBN])([a-h]?[1-8]?)?x([a-h][1-8])$/,
  );
  if (captureMatch) {
    const pieceType = captureMatch[1];
    const disambiguation = captureMatch[2] || "";
    const toSquare = captureMatch[3];
    const pieceNotation = (
      isWhiteTurn ? pieceType : pieceType.toLowerCase()
    ) as PieceNotation;
    const fromSquare = findFromSquareWithDisambiguation(
      pieceNotation,
      toSquare,
      disambiguation,
      fen,
    );
    if (fromSquare) {
      const piece = (
        isWhiteTurn ? pieceType : pieceType.toLowerCase()
      ) as PieceNotation;
      return { from: fromSquare, to: toSquare, piece };
    }
  }

  // Handle promotion captures (exd8=Q, exd8Q, etc.)
  const promotionCaptureMatch = cleanMove.match(
    /^([a-h])x([a-h][18])=?([QRBN])$/,
  );
  if (promotionCaptureMatch) {
    // const _fromFile = promotionCaptureMatch[1];
    const toSquare = promotionCaptureMatch[2];
    const promotionPiece = promotionCaptureMatch[3];
    const piece = (isWhiteTurn ? "P" : "p") as PieceNotation;
    const fromSquare = findFromSquare(piece, toSquare, fen);
    if (fromSquare) {
      return {
        from: fromSquare,
        to: toSquare,
        piece,
        promotion: (isWhiteTurn
          ? promotionPiece
          : promotionPiece.toLowerCase()) as PieceNotation,
      };
    }
  }

  // Handle en passant captures (exd6) - must be after regular pawn captures
  const enPassantMatch = cleanMove.match(/^([a-h])x([a-h][1-8])$/);
  if (enPassantMatch) {
    // const fromFile = enPassantMatch[1];
    const toSquare = enPassantMatch[2];
    const piece = (isWhiteTurn ? "P" : "p") as PieceNotation;
    const fromSquare = findFromSquare(piece, toSquare, fen);
    if (fromSquare) {
      return {
        from: fromSquare,
        to: toSquare,
        piece,
        special: "en-passant",
      };
    }
  }

  // Console warning for unparseable moves
  const warningDetail = {
    move: moveText,
    fen: fen,
    message: `Cannot parse move: "${moveText}" in position: ${fen.substring(0, 30)}...`,
  };
  if (typeof window !== "undefined" && window.dispatchEvent) {
    window.dispatchEvent(
      new CustomEvent("move-parse-warning", { detail: warningDetail }),
    );
  }
  console.warn(`⚠️  ${warningDetail.message}`);
  logError(`Unknown move: ${moveText}`);
  return null;
}

/**
 * Parse a move string purely from notation without position validation
 * This is useful for the Line Fisher where we want to parse user input moves
 * without checking if they're actually legal in the current position
 */
export function parseMoveFromNotation(
  moveText: string,
  isWhiteTurn: boolean = true,
): ChessMove | null {
  // Clean the move text - remove check/checkmate/evaluation symbols
  const cleanMove = moveText.replace(/[+#?!]/, "");

  // Handle castling
  if (cleanMove === "O-O" || cleanMove === "0-0") {
    if (isWhiteTurn) {
      return {
        from: "e1",
        to: "g1",
        piece: "K",
        special: "castling",
        rookFrom: "h1",
        rookTo: "f1",
      };
    } else {
      return {
        from: "e8",
        to: "g8",
        piece: "k",
        special: "castling",
        rookFrom: "h8",
        rookTo: "f8",
      };
    }
  }

  if (cleanMove === "O-O-O" || cleanMove === "0-0-0") {
    if (isWhiteTurn) {
      return {
        from: "e1",
        to: "c1",
        piece: "K",
        special: "castling",
        rookFrom: "a1",
        rookTo: "d1",
      };
    } else {
      return {
        from: "e8",
        to: "c8",
        piece: "k",
        special: "castling",
        rookFrom: "a8",
        rookTo: "d8",
      };
    }
  }

  // Handle pawn moves (e4, e5, etc.)
  if (cleanMove.match(/^[a-h][1-8]$/)) {
    const toSquare = cleanMove;
    const piece = (isWhiteTurn ? "P" : "p") as PieceNotation;
    // For pure parsing, we need to infer the from square based on the destination
    const fromSquare = inferPawnFromSquare(toSquare, isWhiteTurn);
    if (fromSquare) {
      return { from: fromSquare, to: toSquare, piece };
    }
  }

  // Handle pawn captures (exd5, etc.)
  if (cleanMove.match(/^[a-h]x[a-h][1-8]$/)) {
    const fromFile = cleanMove[0];
    const toSquare = cleanMove.substring(2);
    const piece = (isWhiteTurn ? "P" : "p") as PieceNotation;
    const fromSquare = inferPawnFromSquareForCapture(
      fromFile,
      toSquare,
      isWhiteTurn,
    );
    if (fromSquare) {
      return { from: fromSquare, to: toSquare, piece };
    }
  }

  // Handle pawn promotions (e8=Q, e8Q, etc.)
  const promotionMatch = cleanMove.match(/^([a-h][18])=?([QRBN])$/);
  if (promotionMatch) {
    const toSquare = promotionMatch[1];
    const promotionPiece = promotionMatch[2];
    const piece = (isWhiteTurn ? "P" : "p") as PieceNotation;

    // Extract to square from the move part
    const fromSquare = inferPawnFromSquare(toSquare, isWhiteTurn);
    if (fromSquare) {
      return {
        from: fromSquare,
        to: toSquare,
        piece,
        promotion: (isWhiteTurn
          ? promotionPiece
          : promotionPiece.toLowerCase()) as PieceNotation,
      };
    }
  }

  // Handle piece moves (Nf3, Rg1, etc.) - including disambiguation
  const pieceMatch = cleanMove.match(
    /^([KQRBN])([a-h]?[1-8]?)?x?([a-h][1-8])$/,
  );
  if (pieceMatch) {
    const pieceType = pieceMatch[1];
    const disambiguation = pieceMatch[2] || "";
    const toSquare = pieceMatch[3];
    const pieceNotation = (
      isWhiteTurn ? pieceType : pieceType.toLowerCase()
    ) as PieceNotation;
    const fromSquare = inferPieceFromSquareWithDisambiguation(
      pieceNotation,
      toSquare,
      disambiguation,
      isWhiteTurn,
    );
    if (fromSquare) {
      const piece = (
        isWhiteTurn ? pieceType : pieceType.toLowerCase()
      ) as PieceNotation;
      return { from: fromSquare, to: toSquare, piece };
    }
  }

  // Handle piece captures (Nxe4, etc.) - including disambiguation
  const captureMatch = cleanMove.match(
    /^([KQRBN])([a-h]?[1-8]?)?x([a-h][1-8])$/,
  );
  if (captureMatch) {
    const pieceType = captureMatch[1];
    const disambiguation = captureMatch[2] || "";
    const toSquare = captureMatch[3];
    const pieceNotation = (
      isWhiteTurn ? pieceType : pieceType.toLowerCase()
    ) as PieceNotation;
    const fromSquare = inferPieceFromSquareWithDisambiguation(
      pieceNotation,
      toSquare,
      disambiguation,
      isWhiteTurn,
    );
    if (fromSquare) {
      const piece = (
        isWhiteTurn ? pieceType : pieceType.toLowerCase()
      ) as PieceNotation;
      return { from: fromSquare, to: toSquare, piece };
    }
  }

  // Handle promotion captures (exd8=Q, exd8Q, etc.)
  const promotionCaptureMatch = cleanMove.match(
    /^([a-h])x([a-h][18])=?([QRBN])$/,
  );
  if (promotionCaptureMatch) {
    const fromFile = promotionCaptureMatch[1];
    const toSquare = promotionCaptureMatch[2];
    const promotionPiece = promotionCaptureMatch[3];
    const piece = (isWhiteTurn ? "P" : "p") as PieceNotation;
    const fromSquare = inferPawnFromSquareForCapture(
      fromFile,
      toSquare,
      isWhiteTurn,
    );
    if (fromSquare) {
      return {
        from: fromSquare,
        to: toSquare,
        piece,
        promotion: (isWhiteTurn
          ? promotionPiece
          : promotionPiece.toLowerCase()) as PieceNotation,
      };
    }
  }

  // Handle en passant captures (exd6) - must be after regular pawn captures
  const enPassantMatch = cleanMove.match(/^([a-h])x([a-h][1-8])$/);
  if (enPassantMatch) {
    const fromFile = enPassantMatch[1];
    const toSquare = enPassantMatch[2];
    const piece = (isWhiteTurn ? "P" : "p") as PieceNotation;
    const fromSquare = inferPawnFromSquareForCapture(
      fromFile,
      toSquare,
      isWhiteTurn,
    );
    if (fromSquare) {
      return {
        from: fromSquare,
        to: toSquare,
        piece,
        special: "en-passant",
      };
    }
  }

  return null;
}

/**
 * Find the from square for a piece moving to a destination
 */
export function findFromSquare(
  piece: PieceNotation,
  toSquare: string,
  currentFEN: string,
): string | null {
  const position = parseFEN(currentFEN);
  const candidates: string[] = [];

  // Find all squares with the specified piece
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const square = coordsToSquare(rank, file);
      if (position.board[rank][file] === piece) {
        candidates.push(square);
      }
    }
  }

  // Filter candidates that can actually move to the destination
  const validCandidates = candidates.filter((fromSquare: string) =>
    canPieceMoveTo(fromSquare, toSquare, piece, position.board),
  );

  if (validCandidates.length === 1) {
    return validCandidates[0];
  }

  if (validCandidates.length > 1) {
    // Multiple candidates - need disambiguation
    return null;
  }

  return null;
}

/**
 * Find the from square with disambiguation
 */
export function findFromSquareWithDisambiguation(
  piece: PieceNotation,
  toSquare: string,
  disambiguation: string,
  currentFEN: string,
): string | null {
  const position = parseFEN(currentFEN);
  const candidates: string[] = [];

  // Find all squares with the specified piece
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const square = coordsToSquare(rank, file);
      const boardPiece = position.board[rank][file];
      if (boardPiece === piece) {
        candidates.push(square);
      }
    }
  }

  // Filter candidates that can actually move to the destination
  const validCandidates = candidates.filter((fromSquare: string) =>
    canPieceMoveTo(fromSquare, toSquare, piece, position.board),
  );

  if (validCandidates.length === 1) {
    return validCandidates[0];
  }

  if (validCandidates.length > 1) {
    // Use disambiguation to select the correct move
    return selectCorrectMove(
      validCandidates,
      toSquare,
      piece,
      position.board,
      disambiguation,
    );
  }

  return null;
}

/**
 * Check if a piece can move from one square to another
 */
export function canPieceMoveTo(
  fromSquare: string,
  toSquare: string,
  piece: PieceNotation,
  board: string[][],
): boolean {
  const pieceType = getPieceTypeFromNotation(piece);
  const color = getColorFromNotation(piece);
  const [toRank, toFile] = squareToCoords(toSquare);

  // Check if destination is occupied by same color piece
  const destPiece = board[toRank][toFile];
  if (destPiece && getPieceColor(createPieceNotation(destPiece)) === color) {
    return false;
  }

  switch (pieceType) {
    case "P":
      return canPawnMoveTo(fromSquare, toSquare, board);
    case "R":
      return canRookMoveTo(fromSquare, toSquare, board);
    case "N":
      return canKnightMoveTo(fromSquare, toSquare, board);
    case "B":
      return canBishopMoveTo(fromSquare, toSquare, board);
    case "Q":
      return canQueenMoveTo(fromSquare, toSquare, board);
    case "K":
      return canKingMoveTo(fromSquare, toSquare, board);
    default:
      return false;
  }
}

/**
 * Check if a pawn can move from one square to another
 */
export function canPawnMoveTo(
  fromSquare: string,
  toSquare: string,
  board: string[][],
): boolean {
  const [fromRank, fromFile] = squareToCoords(fromSquare);
  const [toRank, toFile] = squareToCoords(toSquare);
  const piece = board[fromRank][fromFile];
  const isWhite = piece === "P";

  // Check if it's a capture
  const isCapture = fromFile !== toFile;
  const destPiece = board[toRank][toFile];

  if (isCapture) {
    // Must be diagonal move and destination must be occupied by opponent
    if (Math.abs(fromFile - toFile) !== 1 || !destPiece) {
      return false;
    }
    // Check that destination piece is opponent's piece
    const destIsWhite = destPiece === destPiece.toUpperCase();
    if (destIsWhite === isWhite) {
      return false;
    }
  } else {
    // Forward move - destination must be empty
    if (destPiece) {
      return false;
    }
  }

  // Check move distance
  const rankDiff = toRank - fromRank;

  if (isWhite) {
    if (rankDiff > 0) {
      return false; // White pawns move up (decreasing rank)
    }
    if (rankDiff < -2) {
      return false; // Can't move more than 2 squares
    }
    if (rankDiff === -2 && fromRank !== 6) {
      return false; // Double move only from starting position
    }
    if (isCapture && rankDiff !== -1) {
      return false; // Captures must be exactly 1 square
    }
  } else {
    if (rankDiff < 0) {
      return false; // Black pawns move down (increasing rank)
    }
    if (rankDiff > 2) {
      return false; // Can't move more than 2 squares
    }
    if (rankDiff === 2 && fromRank !== 1) {
      return false; // Double move only from starting position
    }
    if (isCapture && rankDiff !== 1) {
      return false; // Captures must be exactly 1 square
    }
  }

  return true;
}

/**
 * Check if a rook can move from one square to another
 */
export function canRookMoveTo(
  fromSquare: string,
  toSquare: string,
  board: string[][],
): boolean {
  const [fromRank, fromFile] = squareToCoords(fromSquare);
  const [toRank, toFile] = squareToCoords(toSquare);

  // Rooks move in straight lines
  if (fromRank !== toRank && fromFile !== toFile) {
    return false;
  }

  // Check if path is clear
  if (fromRank === toRank) {
    // Horizontal move
    const start = Math.min(fromFile, toFile);
    const end = Math.max(fromFile, toFile);
    for (let file = start + 1; file < end; file++) {
      if (board[fromRank][file] !== "") {
        return false;
      }
    }
  } else {
    // Vertical move
    const start = Math.min(fromRank, toRank);
    const end = Math.max(fromRank, toRank);
    for (let rank = start + 1; rank < end; rank++) {
      if (board[rank][fromFile] !== "") {
        return false;
      }
    }
  }

  return true;
}

/**
 * Check if a knight can move from one square to another
 */
export function canKnightMoveTo(
  fromSquare: string,
  toSquare: string,
  _board: string[][],
): boolean {
  const [fromRank, fromFile] = squareToCoords(fromSquare);
  const [toRank, toFile] = squareToCoords(toSquare);

  const rankDiff = Math.abs(fromRank - toRank);
  const fileDiff = Math.abs(fromFile - toFile);

  return (
    (rankDiff === 2 && fileDiff === 1) || (rankDiff === 1 && fileDiff === 2)
  );
}

/**
 * Check if a bishop can move from one square to another
 */
export function canBishopMoveTo(
  fromSquare: string,
  toSquare: string,
  board: string[][],
): boolean {
  const [fromRank, fromFile] = squareToCoords(fromSquare);
  const [toRank, toFile] = squareToCoords(toSquare);

  // Bishops move diagonally
  if (Math.abs(fromRank - toRank) !== Math.abs(fromFile - toFile)) {
    return false;
  }

  // Check if path is clear
  const rankStep = fromRank < toRank ? 1 : -1;
  const fileStep = fromFile < toFile ? 1 : -1;
  let rank = fromRank + rankStep;
  let file = fromFile + fileStep;

  while (rank !== toRank && file !== toFile) {
    if (board[rank][file] !== "") {
      return false;
    }
    rank += rankStep;
    file += fileStep;
  }

  return true;
}

/**
 * Check if a queen can move from one square to another
 */
export function canQueenMoveTo(
  fromSquare: string,
  toSquare: string,
  board: string[][],
): boolean {
  // Queen combines rook and bishop moves
  return (
    canRookMoveTo(fromSquare, toSquare, board) ||
    canBishopMoveTo(fromSquare, toSquare, board)
  );
}

/**
 * Check if a king can move from one square to another
 */
export function canKingMoveTo(
  fromSquare: string,
  toSquare: string,
  _board: string[][],
): boolean {
  const [fromRank, fromFile] = squareToCoords(fromSquare);
  const [toRank, toFile] = squareToCoords(toSquare);

  const rankDiff = Math.abs(fromRank - toRank);
  const fileDiff = Math.abs(fromFile - toFile);

  // King moves one square in any direction
  if (rankDiff <= 1 && fileDiff <= 1) {
    return true;
  }

  // Handle castling moves (king moves 2 squares horizontally)
  if (rankDiff === 0 && fileDiff === 2) {
    // This is a castling move - always allow it
    // The actual castling validation should be done elsewhere
    return true;
  }

  return false;
}

/**
 * Select the correct move from multiple candidates using disambiguation
 */
export function selectCorrectMove(
  candidates: string[],
  _toSquare: string,
  _piece: PieceNotation,
  _board: string[][],
  disambiguation: string,
): string {
  // If no disambiguation provided, return first candidate
  if (!disambiguation) {
    return candidates[0];
  }

  // Handle different types of disambiguation
  if (disambiguation.length === 1) {
    // Single character disambiguation (file or rank)
    const char = disambiguation.toLowerCase();

    if (char >= "a" && char <= "h") {
      // File disambiguation (e.g., "Nbd2" - 'b' means knight on b-file)
      const file = char.charCodeAt(0) - "a".charCodeAt(0);
      const fileCandidates = candidates.filter((square) => {
        const [, squareFile] = squareToCoords(square);
        return squareFile === file;
      });
      return fileCandidates.length > 0 ? fileCandidates[0] : candidates[0];
    } else if (char >= "1" && char <= "8") {
      // Rank disambiguation (e.g., "N1d2" - '1' means knight on rank 1)
      const rank = parseInt(char) - 1;
      const rankCandidates = candidates.filter((square) => {
        const [squareRank] = squareToCoords(square);
        return squareRank === rank;
      });
      return rankCandidates.length > 0 ? rankCandidates[0] : candidates[0];
    }
  } else if (disambiguation.length === 2) {
    // Full square disambiguation (e.g., "Nc3d2" - 'c3' means knight on c3)
    const disambiguationSquare = disambiguation.toLowerCase();
    const exactCandidates = candidates.filter(
      (square) => square.toLowerCase() === disambiguationSquare,
    );
    return exactCandidates.length > 0 ? exactCandidates[0] : candidates[0];
  }

  // Fallback to first candidate if disambiguation doesn't match
  return candidates[0];
}

/**
 * Helper function to get piece color
 */
function getPieceColor(piece: PieceNotation): "w" | "b" {
  return piece === piece.toUpperCase() ? "w" : "b";
}

/**
 * Infer the from square for a pawn move based on destination
 */
function inferPawnFromSquare(toSquare: string, isWhiteTurn: boolean): string {
  const file = toSquare[0];
  const rank = parseInt(toSquare[1]);

  if (isWhiteTurn) {
    // White pawns start on rank 2
    if (rank === 8) {
      // Promotion - pawn must be on rank 7
      return `${file}7`;
    } else if (rank === 7) {
      // Could be from rank 6
      return `${file}6`;
    } else if (rank === 6) {
      // Could be from rank 5
      return `${file}5`;
    } else if (rank === 5) {
      // Could be from rank 4
      return `${file}4`;
    } else if (rank === 4) {
      // Could be from rank 3
      return `${file}3`;
    } else if (rank === 3) {
      // Could be from rank 2
      return `${file}2`;
    } else if (rank === 2) {
      // Could be from rank 1
      return `${file}1`;
    } else {
      // rank 1 - must be from rank 2
      return `${file}2`;
    }
  } else {
    // Black pawns start on rank 7
    if (rank === 1) {
      // Promotion - pawn must be on rank 2
      return `${file}2`;
    } else if (rank === 2) {
      // Could be from rank 3
      return `${file}3`;
    } else if (rank === 3) {
      // Could be from rank 4
      return `${file}4`;
    } else if (rank === 4) {
      // Could be from rank 5
      return `${file}5`;
    } else if (rank === 5) {
      // Could be from rank 6
      return `${file}6`;
    } else if (rank === 6) {
      // Could be from rank 7
      return `${file}7`;
    } else if (rank === 7) {
      // Could be from rank 8
      return `${file}8`;
    } else {
      // rank 8 - must be from rank 7
      return `${file}7`;
    }
  }
}

/**
 * Infer the from square for a pawn capture based on file and destination
 */
function inferPawnFromSquareForCapture(
  fromFile: string,
  toSquare: string,
  isWhiteTurn: boolean,
): string {
  const toRank = parseInt(toSquare[1]);

  if (isWhiteTurn) {
    // White pawns capture diagonally up
    if (toRank === 8) {
      // Promotion capture - pawn must be on rank 7
      return `${fromFile}7`;
    } else if (toRank === 7) {
      // Could be from rank 6
      return `${fromFile}6`;
    } else if (toRank === 6) {
      // Could be from rank 5
      return `${fromFile}5`;
    } else if (toRank === 5) {
      // Could be from rank 4
      return `${fromFile}4`;
    } else if (toRank === 4) {
      // Could be from rank 3
      return `${fromFile}3`;
    } else if (toRank === 3) {
      // Could be from rank 2
      return `${fromFile}2`;
    } else {
      // rank 2 - must be from rank 1
      return `${fromFile}1`;
    }
  } else {
    // Black pawns capture diagonally down
    if (toRank === 1) {
      // Promotion capture - pawn must be on rank 2
      return `${fromFile}2`;
    } else if (toRank === 2) {
      // Could be from rank 3
      return `${fromFile}3`;
    } else if (toRank === 3) {
      // Could be from rank 4
      return `${fromFile}4`;
    } else if (toRank === 4) {
      // Could be from rank 5
      return `${fromFile}5`;
    } else if (toRank === 5) {
      // Could be from rank 6
      return `${fromFile}6`;
    } else if (toRank === 6) {
      // Could be from rank 7
      return `${fromFile}7`;
    } else {
      // rank 7 - must be from rank 8
      return `${fromFile}8`;
    }
  }
}

/**
 * Infer the from square for a piece move with disambiguation
 */
function inferPieceFromSquareWithDisambiguation(
  piece: PieceNotation,
  toSquare: string,
  disambiguation: string,
  isWhiteTurn: boolean,
): string {
  const pieceType = getPieceTypeFromNotation(piece);

  // Handle different types of disambiguation
  if (disambiguation.length === 1) {
    // Single character disambiguation (file or rank)
    const char = disambiguation.toLowerCase();

    if (char >= "a" && char <= "h") {
      // File disambiguation (e.g., "Nbd2" - 'b' means knight on b-file)
      const file = char.charCodeAt(0) - "a".charCodeAt(0);
      const rank = inferRankForPiece(pieceType, toSquare, isWhiteTurn);
      return coordsToSquare(rank, file);
    } else if (char >= "1" && char <= "8") {
      // Rank disambiguation (e.g., "N1d2" - '1' means knight on rank 1)
      const rank = parseInt(char) - 1;
      const file = inferFileForPiece(pieceType, toSquare, isWhiteTurn);
      return coordsToSquare(rank, file);
    }
  } else if (disambiguation.length === 2) {
    // Full square disambiguation (e.g., "Nc3d2" - 'c3' means knight on c3)
    return disambiguation.toLowerCase();
  }

  // No disambiguation or fallback - infer based on piece type and destination
  return inferPieceFromSquare(piece, toSquare, isWhiteTurn);
}

/**
 * Infer the from square for a piece move
 */
function inferPieceFromSquare(
  piece: PieceNotation,
  toSquare: string,
  isWhiteTurn: boolean,
): string {
  const pieceType = getPieceTypeFromNotation(piece);

  switch (pieceType) {
    case "N":
      return inferKnightFromSquare(toSquare, isWhiteTurn);
    case "R":
      return inferRookFromSquare(toSquare, isWhiteTurn);
    case "B":
      return inferBishopFromSquare(toSquare, isWhiteTurn);
    case "Q":
      return inferQueenFromSquare(toSquare, isWhiteTurn);
    case "K":
      return inferKingFromSquare(toSquare, isWhiteTurn);
    default:
      return "a1"; // Fallback
  }
}

/**
 * Infer rank for piece based on destination
 */
function inferRankForPiece(
  pieceType: string,
  toSquare: string,
  isWhiteTurn: boolean,
): number {
  const toRank = parseInt(toSquare[1]) - 1;

  if (isWhiteTurn) {
    // White pieces typically start on ranks 0-1
    return pieceType === "P" ? Math.min(toRank + 1, 6) : 0;
  } else {
    // Black pieces typically start on ranks 6-7
    return pieceType === "P" ? Math.max(toRank - 1, 1) : 7;
  }
}

/**
 * Infer file for piece based on destination
 */
function inferFileForPiece(
  pieceType: string,
  toSquare: string,
  isWhiteTurn: boolean,
): number {
  const toFile = toSquare.charCodeAt(0) - "a".charCodeAt(0);

  // For most pieces, infer based on typical starting positions
  switch (pieceType) {
    case "N":
      return isWhiteTurn ? 1 : 6; // b1 or g8
    case "R":
      return isWhiteTurn ? 0 : 7; // a1 or h8
    case "B":
      return isWhiteTurn ? 2 : 5; // c1 or f8
    case "Q":
      return 3; // d1 or d8
    case "K":
      return 4; // e1 or e8
    default:
      return toFile; // For pawns, use destination file
  }
}

/**
 * Infer knight from square
 */
function inferKnightFromSquare(toSquare: string, isWhiteTurn: boolean): string {
  const toFile = toSquare.charCodeAt(0) - "a".charCodeAt(0);

  // For white pieces, use typical game positions
  if (isWhiteTurn) {
    // If moving to e4, likely from f3 (common development)
    if (toSquare === "e4") return "f3";
    if (toSquare === "d4") return "c3";
    if (toSquare === "c4") return "b3";
    if (toSquare === "f4") return "g3";
    if (toSquare === "g4") return "h3";
    if (toSquare === "b4") return "a3";
    if (toSquare === "h4") return "g3";
    if (toSquare === "a4") return "b3";
    // Default fallback
    return toFile <= 3 ? "b1" : "g1";
  } else {
    // For black pieces, use typical game positions
    if (toSquare === "e5") return "f6";
    if (toSquare === "d5") return "c6";
    if (toSquare === "c5") return "b6";
    if (toSquare === "f5") return "g6";
    if (toSquare === "g5") return "h6";
    if (toSquare === "b5") return "a6";
    if (toSquare === "h5") return "g6";
    if (toSquare === "a5") return "b6";
    // Default fallback
    return toFile <= 3 ? "b8" : "g8";
  }
}

/**
 * Infer rook from square
 */
function inferRookFromSquare(_toSquare: string, isWhiteTurn: boolean): string {
  return isWhiteTurn ? "a1" : "h8";
}

/**
 * Infer bishop from square
 */
function inferBishopFromSquare(toSquare: string, isWhiteTurn: boolean): string {
  // For white pieces, use typical game positions
  if (isWhiteTurn) {
    if (toSquare === "e4") return "f1";
    if (toSquare === "d4") return "e1";
    if (toSquare === "c4") return "d1";
    if (toSquare === "f4") return "g1";
    if (toSquare === "g4") return "h1";
    if (toSquare === "b4") return "c1";
    if (toSquare === "h4") return "g1";
    if (toSquare === "a4") return "b1";
    return "c1";
  } else {
    // For black pieces, use typical game positions
    if (toSquare === "e5") return "f8";
    if (toSquare === "d5") return "e8";
    if (toSquare === "c5") return "d8";
    if (toSquare === "f5") return "g8";
    if (toSquare === "g5") return "h8";
    if (toSquare === "b5") return "c8";
    if (toSquare === "h5") return "g8";
    if (toSquare === "a5") return "b8";
    return "f8";
  }
}

/**
 * Infer queen from square
 */
function inferQueenFromSquare(_toSquare: string, isWhiteTurn: boolean): string {
  return isWhiteTurn ? "d1" : "d8";
}

/**
 * Infer king from square
 */
function inferKingFromSquare(_toSquare: string, isWhiteTurn: boolean): string {
  return isWhiteTurn ? "e1" : "e8";
}
