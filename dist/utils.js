export function parseFEN(fen) {
    const parts = fen.split(' ');
    const boardPart = parts[0];
    const turn = parts[1];
    const castling = parts[2];
    const enPassant = parts[3] === '-' ? null : parts[3];
    const halfMoveClock = parseInt(parts[4]);
    const fullMoveNumber = parseInt(parts[5]);
    const board = Array(8).fill(null).map(() => Array(8).fill(''));
    const ranks = boardPart.split('/');
    for (let rank = 0; rank < 8; rank++) {
        let file = 0;
        for (const char of ranks[rank]) {
            if (char >= '1' && char <= '8') {
                file += parseInt(char);
            }
            else {
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
export function toFEN(position) {
    let fen = '';
    // Board
    for (let rank = 0; rank < 8; rank++) {
        let emptyCount = 0;
        for (let file = 0; file < 8; file++) {
            const piece = position.board[rank][file];
            if (piece === '') {
                emptyCount++;
            }
            else {
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
        if (rank < 7)
            fen += '/';
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
export function squareToCoords(square) {
    const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
    const rank = 8 - parseInt(square[1]);
    return [rank, file];
}
export function coordsToSquare(rank, file) {
    const fileChar = String.fromCharCode('a'.charCodeAt(0) + file);
    const rankChar = (8 - rank).toString();
    return fileChar + rankChar;
}
export function isValidSquare(square) {
    if (square.length !== 2)
        return false;
    const file = square[0];
    const rank = square[1];
    return file >= 'a' && file <= 'h' && rank >= '1' && rank <= '8';
}
export function getPieceColor(piece) {
    if (!piece)
        return null;
    return piece === piece.toUpperCase() ? 'w' : 'b';
}
export function getPieceType(piece) {
    if (!piece)
        return null;
    const upperPiece = piece.toUpperCase();
    if (['P', 'R', 'N', 'B', 'Q', 'K'].includes(upperPiece)) {
        return upperPiece;
    }
    return null;
}
export function formatScore(score) {
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
export function formatTime(ms) {
    if (ms < 1000)
        return `${ms}ms`;
    if (ms < 60000)
        return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}
export function debounce(func, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}
// Chess notation utilities
export function moveToNotation(move, format = 'short', pieceFormat = 'unicode', fen) {
    const piece = getPieceType(move.piece);
    const color = getPieceColor(move.piece);
    if (!piece || !color)
        return `${move.from}-${move.to}`;
    const pieceSymbol = getPieceSymbol(piece, color, pieceFormat);
    if (format === 'long') {
        return `${pieceSymbol}${move.from}-${move.to}`;
    }
    else {
        // Standard algebraic notation
        if (piece === 'P') {
            // Pawn moves
            if (move.from.charAt(0) === move.to.charAt(0)) {
                // Same file (e.g., e2e4 -> e4)
                return move.to;
            }
            else {
                // Capture (e.g., e2d3 -> exd3)
                return `${move.from.charAt(0)}x${move.to}`;
            }
        }
        else {
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
            }
            else {
                return `${pieceChar}${move.to}`;
            }
        }
    }
}
export function getPieceSymbol(type, color, format = 'unicode') {
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
export function pvToNotation(pv, format = 'short', pieceFormat = 'unicode', fen) {
    if (pv.length === 0)
        return '';
    // Process moves in the context of the actual position
    const moves = pv.map((move, index) => {
        // For now, use the original position for all moves
        // In a more sophisticated implementation, we'd update the position after each move
        return moveToNotation(move, format, pieceFormat, fen);
    });
    if (format === 'long') {
        // Long format: just show the moves with piece symbols
        return moves.join(' ');
    }
    else {
        // Short format: standard game notation with move numbers
        let result = '';
        for (let i = 0; i < moves.length; i++) {
            if (i % 2 === 0) {
                // White move
                const moveNumber = Math.floor(i / 2) + 1;
                result += `${moveNumber}.${moves[i]}`;
            }
            else {
                // Black move
                result += ` ${moves[i]}`;
            }
            // Add line breaks every 6 moves (3 full moves)
            if ((i + 1) % 6 === 0 && i < moves.length - 1) {
                result += '\n';
            }
            else if (i < moves.length - 1) {
                result += ' ';
            }
        }
        return result;
    }
}
//# sourceMappingURL=utils.js.map