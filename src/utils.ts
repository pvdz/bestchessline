import {
  ChessPosition,
  ChessMove,
  PieceType,
  Color,
  Square,
  File,
  Rank,
  NotationFormat,
  PieceFormat,
} from "./types.js";

export function parseFEN(fen: string): ChessPosition {
  const parts = fen.split(" ");
  const boardPart = parts[0];
  const turn = parts[1] as "w" | "b";
  const castling = parts[2];
  const enPassant = parts[3] === "-" ? null : parts[3];
  const halfMoveClock = parseInt(parts[4]);
  const fullMoveNumber = parseInt(parts[5]);

  const board: string[][] = Array(8)
    .fill(null)
    .map(() => Array(8).fill(""));
  const ranks = boardPart.split("/");

  for (let rank = 0; rank < 8; rank++) {
    let file = 0;
    for (const char of ranks[rank]) {
      if (char >= "1" && char <= "8") {
        file += parseInt(char);
      } else {
        board[rank][file] = char;
        file++;
      }
    }
  }

  return {
    board,
    turn,
    castling,
    enPassant,
    halfMoveClock,
    fullMoveNumber,
  };
}

export function toFEN(position: ChessPosition): string {
  let fen = "";

  // Board
  for (let rank = 0; rank < 8; rank++) {
    let emptyCount = 0;
    for (let file = 0; file < 8; file++) {
      const piece = position.board[rank][file];
      if (piece === "") {
        emptyCount++;
      } else {
        if (emptyCount > 0) {
          fen += emptyCount;
          emptyCount = 0;
        }
        fen += piece;
      }
    }
    if (emptyCount > 0) {
      fen += emptyCount;
    }
    if (rank < 7) fen += "/";
  }

  // Turn
  fen += ` ${position.turn}`;

  // Castling
  fen += ` ${position.castling}`;

  // En passant
  fen += ` ${position.enPassant || "-"}`;

  // Half move clock
  fen += ` ${position.halfMoveClock}`;

  // Full move number
  fen += ` ${position.fullMoveNumber}`;

  return fen;
}

export function squareToCoords(square: Square): [number, number] {
  const file = square.charCodeAt(0) - "a".charCodeAt(0);
  const rank = 8 - parseInt(square[1]);
  return [rank, file];
}

export function coordsToSquare(rank: number, file: number): Square {
  const fileChar = String.fromCharCode("a".charCodeAt(0) + file);
  const rankChar = (8 - rank).toString();
  return `${fileChar}${rankChar}` as Square;
}

export function isValidSquare(square: string): square is Square {
  if (square.length !== 2) return false;
  const file = square[0];
  const rank = square[1];
  return file >= "a" && file <= "h" && rank >= "1" && rank <= "8";
}

export function getPieceColor(piece: string): Color | null {
  if (!piece) return null;
  return piece === piece.toUpperCase() ? "w" : "b";
}

// Constants for piece types (uppercase, used for type matching)
export const PIECE_TYPES = {
  KING: "K",
  QUEEN: "Q",
  ROOK: "R",
  BISHOP: "B",
  KNIGHT: "N",
  PAWN: "P",
} as const;

export function getPieceType(piece: string): PieceType | null {
  if (!piece) return null;
  const upperPiece = piece.toUpperCase();
  const validPieceTypes = [
    PIECE_TYPES.PAWN,
    PIECE_TYPES.ROOK,
    PIECE_TYPES.KNIGHT,
    PIECE_TYPES.BISHOP,
    PIECE_TYPES.QUEEN,
    PIECE_TYPES.KING,
  ];
  if (validPieceTypes.includes(upperPiece as PieceType)) {
    return upperPiece as PieceType;
  }
  return null;
}

export function formatScore(score: number): string {
  if (Math.abs(score) < 100) {
    return `${score >= 0 ? "+" : ""}${score}`;
  }
  const mate = Math.abs(score) > 9000;
  if (mate) {
    const mateMoves = Math.ceil((10000 - Math.abs(score)) / 2);
    return score > 0 ? `M${mateMoves}` : `-M${mateMoves}`;
  }
  return `${score >= 0 ? "+" : ""}${(score / 100).toFixed(1)}`;
}

export function formatTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

// Global variable to store current move index
let globalCurrentMoveIndex = -1;

/**
 * Set the global current move index
 */
export function setGlobalCurrentMoveIndex(moveIndex: number): void {
  globalCurrentMoveIndex = moveIndex;
}

/**
 * Get the global current move index
 */
export function getGlobalCurrentMoveIndex(): number {
  return globalCurrentMoveIndex;
}

/**
 * Get FEN with correct move counter based on current move index
 */
export function getFENWithCorrectMoveCounter(
  boardFEN: string,
  currentMoveIndex: number,
  castling?: string,
  enPassant?: string | null,
): string {
  const position = parseFEN(boardFEN);

  // Calculate the correct move number based on current move index
  const correctMoveNumber = Math.floor(currentMoveIndex / 2) + 1;

  // Create new position with correct move number and optional castling/en-passant
  const correctedPosition: ChessPosition = {
    ...position,
    fullMoveNumber: correctMoveNumber,
    castling: castling !== undefined ? castling : position.castling,
    enPassant: enPassant !== undefined ? enPassant : position.enPassant,
  };

  return toFEN(correctedPosition);
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Chess notation utilities
export function moveToNotation(
  move: ChessMove,
  format: NotationFormat = "short",
  pieceFormat: PieceFormat = "unicode",
  fen?: string,
): string {
  const piece = getPieceType(move.piece);
  const color = getPieceColor(move.piece);

  if (!piece || !color) return `${move.from}-${move.to}`;

  const pieceSymbol = getPieceSymbol(piece, color, pieceFormat);

  if (format === "long") {
    return `${pieceSymbol}${move.from}-${move.to}`;
  } else {
    // Standard algebraic notation
    let notation = "";

    if (piece === PIECE_TYPES.PAWN) {
      // Pawn moves
      if (move.from.charAt(0) === move.to.charAt(0)) {
        // Same file (e.g., e2e4 -> e4)
        notation = move.to;
      } else {
        // Capture (e.g., e2d3 -> exd3)
        notation = `${move.from.charAt(0)}x${move.to}`;
      }
    } else {
      // Piece moves
      const pieceChar = pieceFormat === "unicode" ? pieceSymbol : piece;
      // Check if it's a capture by looking at the target square or move effect
      let isCapture = false;

      if (move.effect?.isCapture) {
        isCapture = true;
      } else if (fen) {
        const position = parseFEN(fen);
        const toRank = 8 - parseInt(move.to[1]);
        const toFile = move.to.charCodeAt(0) - "a".charCodeAt(0);
        const targetPiece = position.board[toRank][toFile];
        isCapture = Boolean(targetPiece && targetPiece !== "");
      }

      if (isCapture) {
        notation = `${pieceChar}x${move.to}`;
      } else {
        notation = `${pieceChar}${move.to}`;
      }
    }

    // Add effect indicators
    if (move.effect) {
      if (move.effect.isMate) {
        notation += "#";
      } else if (move.effect.isCheck) {
        notation += "+";
      }
    }

    return notation;
  }
}

export function getPieceSymbol(
  type: PieceType,
  color: Color,
  format: PieceFormat = "unicode",
): string {
  if (format === "english") {
    return type;
  }

  // Unicode symbols
  const symbols = {
    w: {
      K: "♔",
      Q: "♕",
      R: "♖",
      B: "♗",
      N: "♘",
      P: "♙",
    },
    b: {
      K: "♚",
      Q: "♛",
      R: "♜",
      B: "♝",
      N: "♞",
      P: "♟",
    },
  };

  return symbols[color][type] || type;
}

export function pvToNotation(
  pv: ChessMove[],
  format: NotationFormat = "short",
  pieceFormat: PieceFormat = "unicode",
  fen?: string,
): string {
  if (pv.length === 0) return "";

  // Process moves in the context of the actual position
  const moves = pv.map((move, index) => {
    // For now, use the original position for all moves
    // In a more sophisticated implementation, we'd update the position after each move
    return moveToNotation(move, format, pieceFormat, fen);
  });

  if (format === "long") {
    // Long format: just show the moves with piece symbols
    return moves.join(" ");
  } else {
    // Short format: standard game notation with move numbers
    let result = "";
    for (let i = 0; i < moves.length; i++) {
      if (i % 2 === 0) {
        // White move
        const moveNumber = Math.floor(i / 2) + 1;
        result += `${moveNumber}.${moves[i]}`;
      } else {
        // Black move
        result += ` ${moves[i]}`;
      }

      // Add line breaks every 6 moves (3 full moves)
      if ((i + 1) % 6 === 0 && i < moves.length - 1) {
        result += "\n";
      } else if (i < moves.length - 1) {
        result += " ";
      }
    }
    return result;
  }
}

// ============================================================================
// LOGGING CONFIGURATION
// ============================================================================

let loggingEnabled = false;

/**
 * Enable or disable logging
 */
export function setLoggingEnabled(enabled: boolean): void {
  loggingEnabled = enabled;
}

/**
 * Get current logging state
 */
export function isLoggingEnabled(): boolean {
  return loggingEnabled;
}

/**
 * Logging utility function
 * @param args - Arguments to pass to console.log
 */
export function log(...args: unknown[]): void {
  if (loggingEnabled) {
    console.log(...args);
  }
}

/**
 * Error logging utility function
 * @param args - Arguments to pass to console.error
 */
export function logError(...args: unknown[]): void {
  if (loggingEnabled) {
    console.error(...args);
  }
}

// ============================================================================
// DOM ELEMENT HELPERS (to replace type casts)
// ============================================================================

/**
 * Safely get an HTML input element by ID
 */
export function getInputElement(id: string): HTMLInputElement | null {
  const element = document.getElementById(id);
  return element instanceof HTMLInputElement ? element : null;
}

/**
 * Safely get an HTML textarea element by ID
 */
export function getTextAreaElement(id: string): HTMLTextAreaElement | null {
  const element = document.getElementById(id);
  return element instanceof HTMLTextAreaElement ? element : null;
}

/**
 * Safely get an HTML button element by ID
 */
export function getButtonElement(id: string): HTMLButtonElement | null {
  const element = document.getElementById(id);
  return element instanceof HTMLButtonElement ? element : null;
}

/**
 * Safely get an HTML select element by ID
 */
export function getSelectElement(id: string): HTMLSelectElement | null {
  const element = document.getElementById(id);
  return element instanceof HTMLSelectElement ? element : null;
}

/**
 * Safely get a checked radio button by name and value
 */
export function getCheckedRadio(
  name: string,
  value: string,
): HTMLInputElement | null {
  const element = document.querySelector(
    `input[name="${name}"][value="${value}"]`,
  );
  return element instanceof HTMLInputElement ? element : null;
}

/**
 * Safely get all radio buttons by name
 */
export function getAllRadios(
  name: string,
): NodeListOf<HTMLInputElement> | null {
  const elements = document.querySelectorAll(`input[name="${name}"]`);
  return elements.length > 0
    ? (elements as NodeListOf<HTMLInputElement>)
    : null;
}

/**
 * Safely get a checked radio button by name
 */
export function getCheckedRadioByName(name: string): HTMLInputElement | null {
  const element = document.querySelector(`input[name="${name}"]:checked`);
  return element instanceof HTMLInputElement ? element : null;
}

/**
 * Safely get an element that matches a selector
 */
export function querySelector<T extends Element>(selector: string): T | null {
  const element = document.querySelector(selector);
  return element as T | null;
}

/**
 * Safely get all elements that match a selector
 */
export function querySelectorAll<T extends Element>(
  selector: string,
): NodeListOf<T> | null {
  const elements = document.querySelectorAll(selector);
  return elements.length > 0 ? (elements as NodeListOf<T>) : null;
}

/**
 * Safely get an element by ID with type checking
 */
export function getElementById<T extends Element>(id: string): T | null {
  const element = document.getElementById(id);
  return element as T | null;
}

/**
 * Check if an element is an HTMLElement
 */
export function isHTMLElement(
  element: EventTarget | null,
): element is HTMLElement {
  return element instanceof HTMLElement;
}

/**
 * Check if an element is an HTMLInputElement
 */
export function isHTMLInputElement(
  element: Element | null,
): element is HTMLInputElement {
  return element instanceof HTMLInputElement;
}

/**
 * Check if an element is an HTMLButtonElement
 */
export function isHTMLButtonElement(
  element: Element | null,
): element is HTMLButtonElement {
  return element instanceof HTMLButtonElement;
}

/**
 * Check if an element is an HTMLTextAreaElement
 */
export function isHTMLTextAreaElement(
  element: Element | null,
): element is HTMLTextAreaElement {
  return element instanceof HTMLTextAreaElement;
}

/**
 * Safely get an element by querySelector with type checking
 */
export function querySelectorElement<T extends Element>(
  parent: Element,
  selector: string,
): T | null {
  const element = parent.querySelector(selector);
  return element instanceof Element ? (element as T) : null;
}

/**
 * Safely get an HTMLElement by querySelector
 */
export function querySelectorHTMLElement(
  parent: Element,
  selector: string,
): HTMLElement | null {
  return querySelectorElement<HTMLElement>(parent, selector);
}

/**
 * Safely get an HTMLButtonElement by querySelector
 */
export function querySelectorButton(
  parent: Element,
  selector: string,
): HTMLButtonElement | null {
  return querySelectorElement<HTMLButtonElement>(parent, selector);
}

/**
 * Safely get an HTMLElement by querySelector
 */
export function querySelectorHTMLElementBySelector(
  selector: string,
): HTMLElement | null {
  const element = document.querySelector(selector);
  return element instanceof HTMLElement ? element : null;
}

/**
 * Apply a chess move to a FEN string and return the new FEN
 */
export function applyMoveToFEN(fen: string, move: ChessMove): string {
  const position = parseFEN(fen);
  const [fromRank, fromFile] = squareToCoords(move.from);
  const [toRank, toFile] = squareToCoords(move.to);

  // Create new board
  const newBoard = position.board.map((row) => [...row]);
  newBoard[toRank][toFile] = newBoard[fromRank][fromFile];
  newBoard[fromRank][fromFile] = "";

  // Handle special moves
  if (move.special === "castling") {
    if (move.rookFrom && move.rookTo) {
      const [rookFromRank, rookFromFile] = squareToCoords(move.rookFrom);
      const [rookToRank, rookToFile] = squareToCoords(move.rookTo);
      newBoard[rookToRank][rookToFile] = newBoard[rookFromRank][rookFromFile];
      newBoard[rookFromRank][rookFromFile] = "";
    }
  }

  // Update castling rights
  let newCastling = position.castling;

  // Remove castling rights when king moves
  if (move.piece.toUpperCase() === PIECE_TYPES.KING) {
    if (move.piece === "K") {
      // White king moved
      newCastling = newCastling.replace(/[KQ]/g, "");
    } else {
      // Black king moved
      newCastling = newCastling.replace(/[kq]/g, "");
    }
  }

  // Remove castling rights when rooks move
  if (move.piece.toUpperCase() === PIECE_TYPES.ROOK) {
    if (move.from === "a1") newCastling = newCastling.replace("Q", "");
    if (move.from === "h1") newCastling = newCastling.replace("K", "");
    if (move.from === "a8") newCastling = newCastling.replace("q", "");
    if (move.from === "h8") newCastling = newCastling.replace("k", "");
  }

  // Update en passant
  let newEnPassant = null;
  if (move.piece.toUpperCase() === PIECE_TYPES.PAWN) {
    const [fromRank, fromFile] = squareToCoords(move.from);
    const [toRank, toFile] = squareToCoords(move.to);

    // Check if it's a double pawn move
    if (Math.abs(fromRank - toRank) === 2) {
      const enPassantRank = fromRank + (toRank > fromRank ? 1 : -1);
      newEnPassant = coordsToSquare(enPassantRank, fromFile);
    }
  } else {
    // Clear en passant for non-pawn moves
    newEnPassant = null;
  }

  // Update position
  const newPosition: ChessPosition = {
    ...position,
    board: newBoard,
    turn: position.turn === "w" ? "b" : "w",
    castling: newCastling || "-",
    enPassant: newEnPassant,
  };

  return toFEN(newPosition);
}

/**
 * Parse a simple move string and return a ChessMove object
 */
export function parseSimpleMove(
  moveText: string,
  fen: string,
): ChessMove | null {
  const position = parseFEN(fen);
  const isWhiteTurn = position.turn === "w";

  // Handle the specific moves we need
  switch (moveText) {
    case "Nf3":
      return {
        from: "g1",
        to: "f3",
        piece: isWhiteTurn ? "N" : "n",
      };
    case "g3":
      return {
        from: "g2",
        to: "g3",
        piece: isWhiteTurn ? "P" : "p",
      };
    default:
      logError(`Unknown move: ${moveText}`);
      return null;
  }
}

/**
 * Find the from square for a piece moving to a destination
 */
export function findFromSquare(
  piece: string,
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
  const validCandidates = candidates.filter((fromSquare) =>
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
  piece: string,
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
      if (position.board[rank][file] === piece) {
        candidates.push(square);
      }
    }
  }

  // Filter candidates that can actually move to the destination
  const validCandidates = candidates.filter((fromSquare) =>
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
  piece: string,
  board: string[][],
): boolean {
  const pieceType = piece.toUpperCase();
  const [fromRank, fromFile] = squareToCoords(fromSquare);
  const [toRank, toFile] = squareToCoords(toSquare);

  // Check if destination is occupied by same color piece
  const destPiece = board[toRank][toFile];
  if (destPiece && getPieceColor(destPiece) === getPieceColor(piece)) {
    return false;
  }

  switch (pieceType) {
    case PIECE_TYPES.PAWN:
      return canPawnMoveTo(fromSquare, toSquare, board);
    case PIECE_TYPES.ROOK:
      return canRookMoveTo(fromSquare, toSquare, board);
    case PIECE_TYPES.KNIGHT:
      return canKnightMoveTo(fromSquare, toSquare, board);
    case PIECE_TYPES.BISHOP:
      return canBishopMoveTo(fromSquare, toSquare, board);
    case PIECE_TYPES.QUEEN:
      return canQueenMoveTo(fromSquare, toSquare, board);
    case PIECE_TYPES.KING:
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
  } else {
    if (rankDiff < 0) return false; // Black pawns move down (increasing rank)
    if (rankDiff > 2) return false; // Can't move more than 2 squares
    if (rankDiff === 2 && fromRank !== 1) return false; // Double move only from starting position
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
  piece: string,
  board: string[][],
): string {
  // For now, just return the first candidate
  // In a more sophisticated implementation, this would use additional context
  return candidates[0];
}

/**
 * Get depth scaler from UI (1-15)
 */
export function getDepthScaler(): number {
  const depthScalerInput = document.getElementById(
    "tree-digger-depth-scaler",
  ) as HTMLInputElement;
  const depthScalerValue = document.getElementById(
    "tree-digger-depth-scaler-value",
  );

  // Try to get the value from the display span first, then fall back to input value
  if (depthScalerValue && depthScalerValue.textContent) {
    const spanValue = parseInt(depthScalerValue.textContent);
    if (!isNaN(spanValue)) {
      return spanValue;
    }
  }

  // Fall back to input value
  return depthScalerInput ? parseInt(depthScalerInput.value) : 3;
}

/**
 * Get black moves count from UI
 */
export function getBlackMovesCount(): number {
  const blackMovesInput = document.getElementById(
    "tree-digger-black-moves",
  ) as HTMLInputElement;
  const blackMovesValue = document.getElementById(
    "tree-digger-black-moves-value",
  );

  // Try to get the value from the display span first, then fall back to input value
  if (blackMovesValue && blackMovesValue.textContent) {
    const spanValue = parseInt(blackMovesValue.textContent);
    if (!isNaN(spanValue)) {
      return spanValue;
    }
  }

  // Fall back to input value
  return blackMovesInput ? parseInt(blackMovesInput.value) : 6;
}

/**
 * Get thread count from UI
 */
export function getThreadCount(): number {
  const threadsInput = document.getElementById(
    "tree-digger-threads",
  ) as HTMLInputElement;
  const threadsValue = document.getElementById("tree-digger-threads-value");

  // Try to get the value from the display span first, then fall back to input value
  if (threadsValue && threadsValue.textContent) {
    const spanValue = parseInt(threadsValue.textContent);
    if (!isNaN(spanValue)) {
      return spanValue;
    }
  }

  // Fall back to input value
  return threadsInput ? parseInt(threadsInput.value) : 10;
}

/**
 * Get white moves from UI inputs
 */
export function getWhiteMoves(): string[] {
  const whiteMove1Input = document.getElementById(
    "tree-digger-white-move-1",
  ) as HTMLInputElement;
  const whiteMove2Input = document.getElementById(
    "tree-digger-white-move-2",
  ) as HTMLInputElement;

  const move1 = whiteMove1Input?.value.trim() || "";
  const move2 = whiteMove2Input?.value.trim() || "";

  const moves: string[] = [];
  if (move1) moves.push(move1);
  if (move2) moves.push(move2);

  return moves;
}
