import {
  ChessMove,
  PieceNotation,
  PLAYER_COLORS,
} from "../types.js";
import { parseFEN, squareToCoords, coordsToSquare } from "./fen-utils.js";
import { getPieceTypeFromNotation, getColorFromNotation, createPieceNotation } from "../types.js";
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
  const promotionMatch = cleanMove.match(/^([a-h]x?[a-h][18])=?([QRBN])$/);
  if (promotionMatch) {
    const movePart = promotionMatch[1];
    const promotionPiece = promotionMatch[2];
    const piece = (isWhiteTurn ? "P" : "p") as PieceNotation;

    // Extract to square from the move part
    const toSquare = movePart.match(/[a-h][18]/)?.[0];
    if (toSquare) {
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
    const fromFile = promotionCaptureMatch[1];
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
    const fromFile = enPassantMatch[1];
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
 * Find the from square for a piece moving to a destination
 */
export function findFromSquare(
  piece: PieceNotation,
  toSquare: string,
  currentFEN: string,
): string | null {
  const position = parseFEN(currentFEN);
  const candidates: string[] = [];
  const pieceType = getPieceTypeFromNotation(piece);
  const color = getColorFromNotation(piece);

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
  const pieceType = getPieceTypeFromNotation(piece);
  const color = getColorFromNotation(piece);

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
    // Use disambiguation to select the correct move
    return selectCorrectMove(validCandidates, toSquare, piece, position.board);
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
  const [fromRank, fromFile] = squareToCoords(fromSquare);
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
  const direction = isWhite ? -1 : 1;

  // Check if it's a capture
  const isCapture = fromFile !== toFile;
  const destPiece = board[toRank][toFile];

  if (isCapture) {
    // Must be diagonal move and destination must be occupied
    if (Math.abs(fromFile - toFile) !== 1 || !destPiece) {
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
    if (rankDiff > 0) return false; // White pawns move up (decreasing rank)
    if (rankDiff < -2) return false; // Can't move more than 2 squares
    if (rankDiff === -2 && fromRank !== 6) return false; // Double move only from starting position
    if (isCapture && rankDiff !== -1) return false; // Captures must be exactly 1 square
  } else {
    if (rankDiff < 0) return false; // Black pawns move down (increasing rank)
    if (rankDiff > 2) return false; // Can't move more than 2 squares
    if (rankDiff === 2 && fromRank !== 1) return false; // Double move only from starting position
    if (isCapture && rankDiff !== 1) return false; // Captures must be exactly 1 square
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
  board: string[][],
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
  board: string[][],
): boolean {
  const [fromRank, fromFile] = squareToCoords(fromSquare);
  const [toRank, toFile] = squareToCoords(toSquare);

  const rankDiff = Math.abs(fromRank - toRank);
  const fileDiff = Math.abs(fromFile - toFile);

  // King moves one square in any direction
  return rankDiff <= 1 && fileDiff <= 1;
}

/**
 * Select the correct move from multiple candidates
 */
export function selectCorrectMove(
  candidates: string[],
  toSquare: string,
  piece: PieceNotation,
  board: string[][],
): string {
  const pieceType = getPieceTypeFromNotation(piece);
  const color = getColorFromNotation(piece);

  // For now, just return the first candidate
  // In a more sophisticated implementation, this would use additional context
  return candidates[0];
}

/**
 * Helper function to get piece color
 */
function getPieceColor(piece: PieceNotation): "w" | "b" {
  return piece === piece.toUpperCase() ? "w" : "b";
} 