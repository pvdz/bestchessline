import { ChessPosition, ChessMove, PieceType, Color } from './types.js';

export function parseFEN(fen: string): ChessPosition {
  const parts = fen.split(' ');
  const boardPart = parts[0];
  const turn = parts[1] as 'w' | 'b';
  const castling = parts[2];
  const enPassant = parts[3] === '-' ? null : parts[3];
  const halfMoveClock = parseInt(parts[4]);
  const fullMoveNumber = parseInt(parts[5]);

  const board: string[][] = Array(8).fill(null).map(() => Array(8).fill(''));
  const ranks = boardPart.split('/');
  
  for (let rank = 0; rank < 8; rank++) {
    let file = 0;
    for (const char of ranks[rank]) {
      if (char >= '1' && char <= '8') {
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
    fullMoveNumber
  };
}

export function toFEN(position: ChessPosition): string {
  let fen = '';
  
  // Board
  for (let rank = 0; rank < 8; rank++) {
    let emptyCount = 0;
    for (let file = 0; file < 8; file++) {
      const piece = position.board[rank][file];
      if (piece === '') {
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
    if (rank < 7) fen += '/';
  }
  
  // Turn
  fen += ` ${position.turn}`;
  
  // Castling
  fen += ` ${position.castling}`;
  
  // En passant
  fen += ` ${position.enPassant || '-'}`;
  
  // Half move clock
  fen += ` ${position.halfMoveClock}`;
  
  // Full move number
  fen += ` ${position.fullMoveNumber}`;
  
  return fen;
}

export function squareToCoords(square: string): [number, number] {
  const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = 8 - parseInt(square[1]);
  return [rank, file];
}

export function coordsToSquare(rank: number, file: number): string {
  const fileChar = String.fromCharCode('a'.charCodeAt(0) + file);
  const rankChar = (8 - rank).toString();
  return fileChar + rankChar;
}

export function isValidSquare(square: string): boolean {
  if (square.length !== 2) return false;
  const file = square[0];
  const rank = square[1];
  return file >= 'a' && file <= 'h' && rank >= '1' && rank <= '8';
}

export function getPieceColor(piece: string): Color | null {
  if (!piece) return null;
  return piece === piece.toUpperCase() ? 'w' : 'b';
}

export function getPieceType(piece: string): PieceType | null {
  if (!piece) return null;
  const upperPiece = piece.toUpperCase();
  if (['P', 'R', 'N', 'B', 'Q', 'K'].includes(upperPiece)) {
    return upperPiece as PieceType;
  }
  return null;
}

export function formatScore(score: number): string {
  if (Math.abs(score) < 100) {
    return `${score >= 0 ? '+' : ''}${score}`;
  }
  const mate = Math.abs(score) > 9000;
  if (mate) {
    const mateMoves = Math.ceil((10000 - Math.abs(score)) / 2);
    return score > 0 ? `M${mateMoves}` : `-M${mateMoves}`;
  }
  return `${score >= 0 ? '+' : ''}${(score / 100).toFixed(1)}`;
}

export function formatTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
} 

// Chess notation utilities
export function moveToNotation(move: ChessMove, format: 'short' | 'long' = 'short', pieceFormat: 'unicode' | 'english' = 'unicode', fen?: string): string {
  const piece = getPieceType(move.piece);
  const color = getPieceColor(move.piece);
  
  if (!piece || !color) return `${move.from}-${move.to}`;
  
  const pieceSymbol = getPieceSymbol(piece, color, pieceFormat);
  
  if (format === 'long') {
    return `${pieceSymbol}${move.from}-${move.to}`;
  } else {
    // Standard algebraic notation
    if (piece === 'P') {
      // Pawn moves
      if (move.from.charAt(0) === move.to.charAt(0)) {
        // Same file (e.g., e2e4 -> e4)
        return move.to;
      } else {
        // Capture (e.g., e2d3 -> exd3)
        return `${move.from.charAt(0)}x${move.to}`;
      }
    } else {
      // Piece moves
      const pieceChar = pieceFormat === 'unicode' ? pieceSymbol : piece;
      // Check if it's a capture by looking at the target square
      const position = fen ? parseFEN(fen) : parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      const toRank = 8 - parseInt(move.to[1]);
      const toFile = move.to.charCodeAt(0) - 'a'.charCodeAt(0);
      const targetPiece = position.board[toRank][toFile];
      const isCapture = targetPiece && targetPiece !== '';
      
      if (isCapture) {
        return `${pieceChar}x${move.to}`;
      } else {
        return `${pieceChar}${move.to}`;
      }
    }
  }
}

export function getPieceSymbol(type: PieceType, color: Color, format: 'unicode' | 'english' = 'unicode'): string {
  if (format === 'english') {
    return type;
  }
  
  // Unicode symbols
  const symbols = {
    w: {
      'K': '♔',
      'Q': '♕', 
      'R': '♖',
      'B': '♗',
      'N': '♘',
      'P': '♙'
    },
    b: {
      'K': '♚',
      'Q': '♛',
      'R': '♜', 
      'B': '♝',
      'N': '♞',
      'P': '♟'
    }
  };
  
  return symbols[color][type] || type;
}

export function pvToNotation(pv: ChessMove[], format: 'short' | 'long' = 'short', pieceFormat: 'unicode' | 'english' = 'unicode', fen?: string): string {
  if (pv.length === 0) return '';
  
  // Process moves in the context of the actual position
  const moves = pv.map((move, index) => {
    // For now, use the original position for all moves
    // In a more sophisticated implementation, we'd update the position after each move
    return moveToNotation(move, format, pieceFormat, fen);
  });
  
  if (format === 'long') {
    // Long format: just show the moves with piece symbols
    return moves.join(' ');
  } else {
    // Short format: standard game notation with move numbers
    let result = '';
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
        result += '\n';
      } else if (i < moves.length - 1) {
        result += ' ';
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
export function log(...args: any[]): void {
  if (loggingEnabled) {
    console.log(...args);
  }
}

/**
 * Error logging utility function
 * @param args - Arguments to pass to console.error
 */
export function logError(...args: any[]): void {
  if (loggingEnabled) {
    console.error(...args);
  }
} 