import { parseFEN, toFEN, squareToCoords, coordsToSquare, isValidSquare, getPieceColor, getPieceType } from './utils.js';
export class ChessBoard {
    constructor(element, initialFEN) {
        this.dragElement = null;
        this.dragOffset = { x: 0, y: 0 };
        this.isDragging = false;
        this.currentDropTarget = null;
        this.element = element;
        const fen = initialFEN || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        this.state = {
            position: parseFEN(fen),
            selectedSquare: null,
            draggedPiece: null,
            legalMoves: []
        };
        this.render();
        this.setupEventListeners();
    }
    render() {
        this.element.innerHTML = '';
        this.element.className = 'chess-board';
        // Create board container
        const boardContainer = document.createElement('div');
        boardContainer.className = 'board-container';
        // Create board grid
        const board = document.createElement('div');
        board.className = 'board';
        // Create squares
        for (let rank = 0; rank < 8; rank++) {
            for (let file = 0; file < 8; file++) {
                const square = document.createElement('div');
                const squareName = coordsToSquare(rank, file);
                const isLight = (rank + file) % 2 === 0;
                square.className = `square ${isLight ? 'light' : 'dark'}`;
                square.dataset.square = squareName;
                // Add rank/file labels
                if (file === 0) {
                    const rankLabel = document.createElement('div');
                    rankLabel.className = 'rank-label';
                    rankLabel.textContent = (8 - rank).toString();
                    square.appendChild(rankLabel);
                }
                if (rank === 7) {
                    const fileLabel = document.createElement('div');
                    fileLabel.className = 'file-label';
                    fileLabel.textContent = String.fromCharCode('a'.charCodeAt(0) + file);
                    square.appendChild(fileLabel);
                }
                // Add piece if present
                const piece = this.state.position.board[rank][file];
                if (piece) {
                    const pieceElement = this.createPieceElement(piece, squareName);
                    square.appendChild(pieceElement);
                }
                // Highlight selected square
                if (this.state.selectedSquare === squareName) {
                    square.classList.add('selected');
                }
                // Highlight legal moves
                if (this.state.legalMoves.includes(squareName)) {
                    square.classList.add('legal-move');
                }
                board.appendChild(square);
            }
        }
        boardContainer.appendChild(board);
        this.element.appendChild(boardContainer);
    }
    createPieceElement(piece, square) {
        const pieceElement = document.createElement('div');
        pieceElement.className = 'piece';
        pieceElement.dataset.piece = piece;
        pieceElement.dataset.square = square;
        const color = getPieceColor(piece);
        const type = getPieceType(piece);
        if (color && type) {
            pieceElement.classList.add(color, type.toLowerCase());
            pieceElement.innerHTML = this.getPieceSymbol(type, color);
        }
        return pieceElement;
    }
    getPieceSymbol(type, color) {
        const symbols = {
            'K': '♔',
            'Q': '♕',
            'R': '♖',
            'B': '♗',
            'N': '♘',
            'P': '♙'
        };
        const symbol = symbols[type];
        return color === 'w' ? symbol : symbol.replace(/♔|♕|♖|♗|♘|♙/g, (match) => {
            const blackSymbols = {
                '♔': '♚', '♕': '♛', '♖': '♜', '♗': '♝', '♘': '♞', '♙': '♟'
            };
            return blackSymbols[match];
        });
    }
    setupEventListeners() {
        this.element.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        document.addEventListener('touchend', this.handleTouchEnd.bind(this));
    }
    handleMouseDown(event) {
        this.startDrag(event.target, event.clientX, event.clientY);
    }
    handleTouchStart(event) {
        event.preventDefault();
        const touch = event.touches[0];
        this.startDrag(event.target, touch.clientX, touch.clientY);
    }
    startDrag(target, clientX, clientY) {
        const pieceElement = target.closest('.piece');
        if (!pieceElement)
            return;
        const square = pieceElement.dataset.square;
        if (!square)
            return;
        this.isDragging = true;
        // Create a simple drag element with just the piece symbol
        this.dragElement = document.createElement('div');
        this.dragElement.className = 'drag-ghost';
        this.dragElement.innerHTML = pieceElement.innerHTML;
        this.dragElement.style.position = 'fixed';
        this.dragElement.style.pointerEvents = 'none';
        this.dragElement.style.zIndex = '1000';
        this.dragElement.style.transform = 'scale(1.1)';
        this.dragElement.style.opacity = '0.9';
        const rect = pieceElement.getBoundingClientRect();
        this.dragOffset.x = clientX - rect.left;
        this.dragOffset.y = clientY - rect.top;
        this.dragElement.style.left = `${clientX - this.dragOffset.x}px`;
        this.dragElement.style.top = `${clientY - this.dragOffset.y}px`;
        document.body.appendChild(this.dragElement);
        // Hide original piece
        pieceElement.style.opacity = '0.3';
        this.state.selectedSquare = square;
        this.state.draggedPiece = pieceElement.dataset.piece || null;
        this.render();
    }
    handleMouseMove(event) {
        if (!this.isDragging || !this.dragElement)
            return;
        this.dragElement.style.left = `${event.clientX - this.dragOffset.x}px`;
        this.dragElement.style.top = `${event.clientY - this.dragOffset.y}px`;
        // Update drop target highlighting
        this.updateDropTarget(event.clientX, event.clientY);
    }
    handleTouchMove(event) {
        if (!this.isDragging || !this.dragElement)
            return;
        event.preventDefault();
        const touch = event.touches[0];
        this.dragElement.style.left = `${touch.clientX - this.dragOffset.x}px`;
        this.dragElement.style.top = `${touch.clientY - this.dragOffset.y}px`;
        // Update drop target highlighting
        this.updateDropTarget(touch.clientX, touch.clientY);
    }
    handleMouseUp(event) {
        this.endDrag(event.clientX, event.clientY);
    }
    handleTouchEnd(event) {
        event.preventDefault();
        const touch = event.changedTouches[0];
        this.endDrag(touch.clientX, touch.clientY);
    }
    endDrag(clientX, clientY) {
        if (!this.isDragging || !this.dragElement)
            return;
        // Find target square
        const targetSquare = this.findSquareAtPosition(clientX, clientY);
        if (targetSquare && this.state.selectedSquare) {
            this.makeMove(this.state.selectedSquare, targetSquare);
        }
        // Clean up
        if (this.dragElement) {
            document.body.removeChild(this.dragElement);
            this.dragElement = null;
        }
        this.isDragging = false;
        this.state.selectedSquare = null;
        this.state.draggedPiece = null;
        this.state.legalMoves = [];
        this.currentDropTarget = null;
        this.render();
    }
    updateDropTarget(clientX, clientY) {
        const newDropTarget = this.findSquareAtPosition(clientX, clientY);
        // Remove highlighting from previous drop target
        if (this.currentDropTarget && this.currentDropTarget !== newDropTarget) {
            const prevSquare = this.element.querySelector(`[data-square="${this.currentDropTarget}"]`);
            if (prevSquare) {
                prevSquare.classList.remove('dragover');
            }
        }
        // Add highlighting to new drop target
        if (newDropTarget && newDropTarget !== this.currentDropTarget) {
            const newSquare = this.element.querySelector(`[data-square="${newDropTarget}"]`);
            if (newSquare) {
                newSquare.classList.add('dragover');
            }
        }
        this.currentDropTarget = newDropTarget;
    }
    findSquareAtPosition(clientX, clientY) {
        const boardRect = this.element.querySelector('.board')?.getBoundingClientRect();
        if (!boardRect)
            return null;
        const x = clientX - boardRect.left;
        const y = clientY - boardRect.top;
        const squareSize = boardRect.width / 8;
        const file = Math.floor(x / squareSize);
        const rank = Math.floor(y / squareSize);
        if (file >= 0 && file < 8 && rank >= 0 && rank < 8) {
            return coordsToSquare(rank, file);
        }
        return null;
    }
    makeMove(from, to) {
        if (!isValidSquare(from) || !isValidSquare(to))
            return;
        const [fromRank, fromFile] = squareToCoords(from);
        const [toRank, toFile] = squareToCoords(to);
        const piece = this.state.position.board[fromRank][fromFile];
        if (!piece)
            return;
        // Simple move validation (basic rules)
        if (this.isValidMove(from, to, piece)) {
            // Make the move
            this.state.position.board[toRank][toFile] = piece;
            this.state.position.board[fromRank][fromFile] = '';
            // Switch turn
            this.state.position.turn = this.state.position.turn === 'w' ? 'b' : 'w';
            // Update move counters
            if (piece.toLowerCase() === 'p' || this.state.position.board[toRank][toFile] !== '') {
                this.state.position.halfMoveClock = 0;
            }
            else {
                this.state.position.halfMoveClock++;
            }
            if (this.state.position.turn === 'w') {
                this.state.position.fullMoveNumber++;
            }
            // Notify position change
            if (this.onPositionChange) {
                this.onPositionChange(this.state.position);
            }
        }
    }
    isValidMove(from, to, piece) {
        // Basic validation - in a real implementation, you'd want more sophisticated move validation
        const [fromRank, fromFile] = squareToCoords(from);
        const [toRank, toFile] = squareToCoords(to);
        const targetPiece = this.state.position.board[toRank][toFile];
        const pieceColor = getPieceColor(piece);
        const targetColor = getPieceColor(targetPiece);
        // Can't capture own piece
        if (targetColor && pieceColor === targetColor)
            return false;
        // Basic piece movement rules (simplified)
        const pieceType = getPieceType(piece);
        if (!pieceType)
            return false;
        const rankDiff = Math.abs(toRank - fromRank);
        const fileDiff = Math.abs(toFile - fromFile);
        switch (pieceType) {
            case 'P': // Pawn
                const direction = pieceColor === 'w' ? -1 : 1;
                const startRank = pieceColor === 'w' ? 6 : 1;
                // Forward move
                if (fileDiff === 0 && toRank === fromRank + direction) {
                    return targetPiece === '';
                }
                // Initial two-square move
                if (fileDiff === 0 && fromRank === startRank && toRank === fromRank + 2 * direction) {
                    return targetPiece === '' && this.state.position.board[fromRank + direction][fromFile] === '';
                }
                // Capture
                if (fileDiff === 1 && rankDiff === 1) {
                    return targetPiece !== '';
                }
                break;
            case 'R': // Rook
                return rankDiff === 0 || fileDiff === 0;
            case 'N': // Knight
                return (rankDiff === 2 && fileDiff === 1) || (rankDiff === 1 && fileDiff === 2);
            case 'B': // Bishop
                return rankDiff === fileDiff;
            case 'Q': // Queen
                return rankDiff === 0 || fileDiff === 0 || rankDiff === fileDiff;
            case 'K': // King
                return rankDiff <= 1 && fileDiff <= 1;
        }
        return false;
    }
    setPosition(fen) {
        this.state.position = parseFEN(fen);
        this.render();
    }
    getPosition() {
        return { ...this.state.position };
    }
    getFEN() {
        return toFEN(this.state.position);
    }
    setOnPositionChange(callback) {
        this.onPositionChange = callback;
    }
    showMoveArrow(from, to, piece) {
        // Remove any existing arrows
        this.hideMoveArrow();
        // Create arrow element
        const arrow = document.createElement('div');
        arrow.className = 'move-arrow';
        arrow.dataset.from = from;
        arrow.dataset.to = to;
        // Position the arrow
        this.positionArrow(arrow, from, to);
        // Add to board
        const board = this.element.querySelector('.board');
        if (board) {
            board.appendChild(arrow);
        }
    }
    hideMoveArrow() {
        const existingArrow = this.element.querySelector('.move-arrow');
        if (existingArrow) {
            existingArrow.remove();
        }
    }
    positionArrow(arrow, from, to) {
        const fromSquare = this.element.querySelector(`[data-square="${from}"]`);
        const toSquare = this.element.querySelector(`[data-square="${to}"]`);
        if (!fromSquare || !toSquare)
            return;
        const boardRect = this.element.querySelector('.board')?.getBoundingClientRect();
        if (!boardRect)
            return;
        const fromRect = fromSquare.getBoundingClientRect();
        const toRect = toSquare.getBoundingClientRect();
        // Calculate arrow position and rotation
        const fromCenter = {
            x: fromRect.left + fromRect.width / 2 - boardRect.left,
            y: fromRect.top + fromRect.height / 2 - boardRect.top
        };
        const toCenter = {
            x: toRect.left + toRect.width / 2 - boardRect.left,
            y: toRect.top + toRect.height / 2 - boardRect.top
        };
        // Position arrow at the center of the board
        arrow.style.position = 'absolute';
        arrow.style.left = `${boardRect.width / 2}px`;
        arrow.style.top = `${boardRect.height / 2}px`;
        arrow.style.transform = 'translate(-50%, -50%)';
        // Calculate angle
        const angle = Math.atan2(toCenter.y - fromCenter.y, toCenter.x - fromCenter.x) * 180 / Math.PI;
        arrow.style.transform += ` rotate(${angle}deg)`;
    }
    destroy() {
        // Clean up event listeners
        document.removeEventListener('mousemove', this.handleMouseMove.bind(this));
        document.removeEventListener('touchmove', this.handleTouchMove.bind(this));
        document.removeEventListener('mouseup', this.handleMouseUp.bind(this));
        document.removeEventListener('touchend', this.handleTouchEnd.bind(this));
    }
}
//# sourceMappingURL=chess-board.js.map