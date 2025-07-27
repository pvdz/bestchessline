import { ChessBoard } from './chess-board.js';
import { StockfishClient } from './stockfish-client.js';
import { moveToNotation, pvToNotation } from './utils.js';
class ChessAnalysisApp {
    constructor() {
        this.isAnalyzing = false;
        this.currentResults = null;
        this.moves = [];
        this.initialFEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        const boardElement = document.getElementById('chess-board');
        if (!boardElement) {
            throw new Error('Chess board element not found');
        }
        this.board = new ChessBoard(boardElement);
        this.stockfish = new StockfishClient();
        this.initializeEventListeners();
        this.initializeMoveHoverEvents();
        // Set up board position change callback
        this.board.setOnPositionChange((position) => {
            this.updateFENInput();
            this.updateControlsFromPosition();
        });
        // Set up board move callback
        this.board.setOnMoveMade((move) => {
            this.addMove(move);
        });
        // Initialize controls from current board state
        this.updateControlsFromPosition();
    }
    initializeEventListeners() {
        // Board controls
        const resetBtn = document.getElementById('reset-board');
        const clearBtn = document.getElementById('clear-board');
        const fenInput = document.getElementById('fen-input');
        const loadFenBtn = document.getElementById('load-fen');
        const gameNotation = document.getElementById('game-notation');
        const importGameBtn = document.getElementById('import-game');
        if (resetBtn)
            resetBtn.addEventListener('click', () => {
                this.initialFEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
                this.moves = [];
                this.board.setPosition('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
                this.updateMoveList();
            });
        if (clearBtn)
            clearBtn.addEventListener('click', () => {
                this.initialFEN = '8/8/8/8/8/8/8/8 w - - 0 1';
                this.moves = [];
                this.board.setPosition('8/8/8/8/8/8/8/8 w - - 0 1');
                this.updateMoveList();
            });
        if (loadFenBtn && fenInput) {
            loadFenBtn.addEventListener('click', () => {
                const fen = fenInput.value.trim();
                if (fen) {
                    this.initialFEN = fen;
                    this.moves = [];
                    this.board.setPosition(fen);
                    this.updateMoveList();
                }
            });
        }
        if (importGameBtn && gameNotation) {
            importGameBtn.addEventListener('click', () => {
                const notation = gameNotation.value.trim();
                if (notation) {
                    this.importGame(notation);
                }
            });
        }
        // Position controls
        this.initializePositionControls();
        // Analysis controls
        const startBtn = document.getElementById('start-analysis');
        const pauseBtn = document.getElementById('pause-analysis');
        const stopBtn = document.getElementById('stop-analysis');
        if (startBtn)
            startBtn.addEventListener('click', () => this.startAnalysis());
        if (pauseBtn)
            pauseBtn.addEventListener('click', () => this.pauseAnalysis());
        if (stopBtn)
            stopBtn.addEventListener('click', () => this.stopAnalysis());
        // Notation and piece format toggles
        const notationRadios = document.querySelectorAll('input[name="notation-format"]');
        const pieceRadios = document.querySelectorAll('input[name="piece-format"]');
        notationRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                if (this.currentResults) {
                    this.updateResults(this.currentResults);
                }
            });
        });
        pieceRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                if (this.currentResults) {
                    this.updateResults(this.currentResults);
                }
            });
        });
    }
    async startAnalysis() {
        if (this.isAnalyzing) {
            console.log('Analysis already in progress');
            return;
        }
        const fen = this.board.getFEN();
        const options = this.getAnalysisOptions();
        try {
            this.isAnalyzing = true;
            this.updateButtonStates();
            this.updateStatus('Starting analysis...');
            const result = await this.stockfish.analyzePosition(fen, options, (result) => {
                this.currentResults = result;
                this.updateResults(result);
                // Update status with current depth
                if (result.depth > 0) {
                    this.updateStatus(`Analyzing... Depth: ${result.depth}, Moves found: ${result.moves.length}`);
                }
            });
            this.currentResults = result;
            this.updateResults(result);
            this.updateStatus('Analysis complete');
        }
        catch (error) {
            console.error('Analysis failed:', error);
            this.updateStatus('Analysis failed: ' + error);
        }
        finally {
            this.isAnalyzing = false;
            this.updateButtonStates();
        }
    }
    pauseAnalysis() {
        // TODO: Implement pause functionality
        console.log('Pause analysis');
    }
    stopAnalysis() {
        this.stockfish.stopAnalysis();
        this.isAnalyzing = false;
        this.updateButtonStates();
        this.updateStatus('Analysis stopped');
    }
    getAnalysisOptions() {
        const whiteMoves = parseInt(document.getElementById('white-moves').value);
        return {
            depth: parseInt(document.getElementById('max-depth').value),
            whiteMoves: whiteMoves,
            blackMoves: parseInt(document.getElementById('black-moves').value),
            threads: parseInt(document.getElementById('threads').value),
            hash: parseInt(document.getElementById('hash-size').value),
            multiPV: whiteMoves // Set MultiPV to the number of moves we want
        };
    }
    updateButtonStates() {
        const startBtn = document.getElementById('start-analysis');
        const pauseBtn = document.getElementById('pause-analysis');
        const stopBtn = document.getElementById('stop-analysis');
        if (startBtn)
            startBtn.disabled = this.isAnalyzing;
        if (pauseBtn)
            pauseBtn.disabled = !this.isAnalyzing;
        if (stopBtn)
            stopBtn.disabled = !this.isAnalyzing;
    }
    updateStatus(message) {
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.textContent = message;
        }
    }
    updateResults(result) {
        if (!result || !result.moves) {
            return;
        }
        const notationFormat = document.querySelector('input[name="notation-format"]:checked')?.value || 'short';
        const pieceFormat = document.querySelector('input[name="piece-format"]:checked')?.value || 'unicode';
        // Convert all moves to the proper format
        const moves = result.moves.map((move) => {
            console.log('Processing move:', move);
            console.log('PV before formatting:', move.pv);
            return {
                move: move.move, // Keep the original move object for filtering
                notation: moveToNotation(move.move, notationFormat, pieceFormat, result.position),
                score: move.score,
                depth: move.depth,
                pv: pvToNotation(move.pv, notationFormat, pieceFormat, result.position),
                nodes: move.nodes,
                time: move.time
            };
        });
        // Filter to show each individual piece only once (keep the best move for each piece)
        const uniqueMoves = moves.reduce((acc, move) => {
            // Create a unique key for each piece based on the move's starting square
            const pieceKey = `${move.move.from}-${move.move.piece}`;
            const existingIndex = acc.findIndex((m) => {
                const existingKey = `${m.move.from}-${m.move.piece}`;
                return existingKey === pieceKey;
            });
            if (existingIndex === -1) {
                // First time seeing this specific piece, add it
                acc.push(move);
            }
            else {
                // Already have a move for this specific piece, keep the better one
                if (move.score > acc[existingIndex].score) {
                    acc[existingIndex] = move;
                }
            }
            return acc;
        }, []);
        // Sort by score to maintain best moves first
        uniqueMoves.sort((a, b) => b.score - a.score);
        // Update the single results panel with all moves
        this.updateResultsPanel(uniqueMoves);
    }
    updateResultsPanel(moves) {
        const panel = document.getElementById('analysis-results');
        if (!panel)
            return;
        if (moves.length === 0) {
            panel.innerHTML = '<p>No analysis results yet.</p>';
            return;
        }
        const notationFormat = document.querySelector('input[name="notation-format"]:checked')?.value || 'short';
        const movesHtml = moves.map((move, index) => `
      <div class="move-item" data-move-from="${move.move.from}" data-move-to="${move.move.to}" data-move-piece="${move.move.piece}">
        <div class="move-header">
          <span class="move-rank" title="Move ranking (best moves first)">${index + 1}.</span>
          <span class="move-notation" title="Chess move in ${notationFormat} notation">${move.notation}</span>
          <span class="move-info">
            <span class="depth-info" title="Analysis depth - how many moves ahead Stockfish calculated">d${move.depth}</span>
            <span class="nodes-info" title="Number of positions Stockfish evaluated">${move.nodes}</span>
            <span class="time-info" title="Time taken for this analysis in milliseconds">${move.time}ms</span>
          </span>
          <span class="move-score" title="Position evaluation score (positive = advantage for current player)">${move.score}</span>
        </div>
        <div class="move-details">
          <span class="move-pv" title="Principal variation - the best line of play following this move">${move.pv}</span>
        </div>
      </div>
    `).join('');
        panel.innerHTML = movesHtml;
        // Add hover event listeners to move items
        this.addMoveHoverListeners();
    }
    initializeMoveHoverEvents() {
        // This will be called when results are updated
    }
    addMoveHoverListeners() {
        const moveItems = document.querySelectorAll('.move-item');
        moveItems.forEach(item => {
            item.addEventListener('mouseenter', (e) => {
                const target = e.currentTarget;
                const from = target.dataset.moveFrom;
                const to = target.dataset.moveTo;
                const piece = target.dataset.movePiece;
                if (from && to && piece) {
                    this.board.showMoveArrow(from, to, piece);
                }
            });
            item.addEventListener('mouseleave', () => {
                this.board.hideMoveArrow();
            });
        });
    }
    updateFENInput() {
        const fenInput = document.getElementById('fen-input');
        if (fenInput) {
            fenInput.value = this.board.getFEN();
        }
    }
    addMove(move) {
        this.moves.push(move);
        this.updateBoardFromMoves();
        this.updateMoveList();
    }
    updateBoardFromMoves() {
        // Start with the initial FEN
        let currentFEN = this.initialFEN;
        // Apply each move to get the current board state
        for (const move of this.moves) {
            // For now, we'll use a simple approach - in a real implementation,
            // you'd want to use a chess library to properly apply moves
            // This is a simplified version that updates the board position
            currentFEN = this.applyMoveToFEN(currentFEN, move);
        }
        // Update the board with the calculated position
        this.board.setPosition(currentFEN);
    }
    applyMoveToFEN(fen, move) {
        // This is a simplified move application
        // In a real implementation, you'd want to use a proper chess library
        const parts = fen.split(' ');
        const boardPart = parts[0];
        const turn = parts[1];
        const castling = parts[2];
        const enPassant = parts[3];
        const halfMoveClock = parseInt(parts[4]);
        const fullMoveNumber = parseInt(parts[5]);
        // Parse the board
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
        // Apply the move (simplified)
        const [fromRank, fromFile] = this.squareToCoords(move.from);
        const [toRank, toFile] = this.squareToCoords(move.to);
        // Validate coordinates
        if (fromRank < 0 || fromRank >= 8 || fromFile < 0 || fromFile >= 8 ||
            toRank < 0 || toRank >= 8 || toFile < 0 || toFile >= 8) {
            console.error('Invalid coordinates:', move, { fromRank, fromFile, toRank, toFile });
            return fen; // Return original FEN if coordinates are invalid
        }
        const piece = board[fromRank][fromFile];
        board[fromRank][fromFile] = '';
        board[toRank][toFile] = piece;
        // Convert board back to FEN
        let newBoardPart = '';
        for (let rank = 0; rank < 8; rank++) {
            let emptyCount = 0;
            for (let file = 0; file < 8; file++) {
                const piece = board[rank][file];
                if (piece === '') {
                    emptyCount++;
                }
                else {
                    if (emptyCount > 0) {
                        newBoardPart += emptyCount;
                        emptyCount = 0;
                    }
                    newBoardPart += piece;
                }
            }
            if (emptyCount > 0) {
                newBoardPart += emptyCount;
            }
            if (rank < 7)
                newBoardPart += '/';
        }
        // Update turn
        const newTurn = turn === 'w' ? 'b' : 'w';
        // Update move counters
        let newHalfMoveClock = halfMoveClock + 1;
        let newFullMoveNumber = fullMoveNumber;
        if (piece.toLowerCase() === 'p' || board[toRank][toFile] !== '') {
            newHalfMoveClock = 0;
        }
        if (newTurn === 'w') {
            newFullMoveNumber++;
        }
        return `${newBoardPart} ${newTurn} ${castling} ${enPassant} ${newHalfMoveClock} ${newFullMoveNumber}`;
    }
    squareToCoords(square) {
        if (square.length !== 2) {
            console.error('Invalid square format:', square);
            return [0, 0];
        }
        const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
        const rank = 8 - parseInt(square[1]);
        // Validate coordinates
        if (file < 0 || file >= 8 || rank < 0 || rank >= 8) {
            console.error('Invalid square coordinates:', square, { file, rank });
            return [0, 0];
        }
        return [rank, file];
    }
    updateMoveList() {
        const movesPanel = document.getElementById('game-moves');
        if (!movesPanel)
            return;
        if (this.moves.length === 0) {
            movesPanel.innerHTML = '<p>No moves yet.</p>';
            return;
        }
        let html = '';
        for (let i = 0; i < this.moves.length; i += 2) {
            const moveNumber = Math.floor(i / 2) + 1;
            const whiteMove = this.moves[i];
            const blackMove = this.moves[i + 1];
            html += `<div class="move-entry">`;
            html += `<span class="move-number">${moveNumber}.</span>`;
            html += `<span class="move-text">`;
            html += this.formatMove(whiteMove);
            html += `</span>`;
            html += `<span class="move-text">`;
            if (blackMove) {
                html += this.formatMove(blackMove);
            }
            else {
                html += `...`;
            }
            html += `</span>`;
            html += `</div>`;
        }
        movesPanel.innerHTML = html;
    }
    formatMove(move) {
        // Use the current notation and piece format settings
        const notationFormat = document.querySelector('input[name="notation-format"]:checked')?.value || 'short';
        const pieceFormat = document.querySelector('input[name="piece-format"]:checked')?.value || 'unicode';
        return moveToNotation(move, notationFormat, pieceFormat);
    }
    importGame(notation) {
        // Reset to standard initial position
        this.initialFEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        this.moves = [];
        // Parse the notation and apply moves
        const moves = this.parseGameNotation(notation);
        for (const move of moves) {
            this.moves.push(move);
        }
        // Update board state
        this.updateBoardFromMoves();
        this.updateMoveList();
    }
    parseGameNotation(notation) {
        const moves = [];
        // Remove comments and annotations
        let cleanNotation = notation
            .replace(/\{[^}]*\}/g, '') // Remove comments in braces
            .replace(/\([^)]*\)/g, '') // Remove annotations in parentheses
            .replace(/[!?]+/g, '') // Remove evaluation symbols
            .replace(/[+#]/g, '') // Remove check/checkmate symbols
            .replace(/=([QRBN])/g, '') // Remove promotion symbols
            .replace(/\$\d+/g, '') // Remove NAG symbols
            .replace(/[0-9]+\.\.\./g, '') // Remove move numbers with dots
            .replace(/[0-9]+\./g, '') // Remove move numbers
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
        const tokens = cleanNotation.split(/\s+/);
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i].trim();
            if (!token)
                continue;
            // Skip game result annotations
            if (/^(1-0|0-1|1\/2-1\/2|\*)$/.test(token))
                continue;
            // Skip empty tokens
            if (token === '')
                continue;
            // Parse move
            const move = this.parseMove(token);
            if (move) {
                moves.push(move);
            }
            else {
                console.log('Could not parse move:', token);
            }
        }
        return moves;
    }
    parseMove(moveText) {
        // Remove any remaining check/checkmate symbols
        moveText = moveText.replace(/[+#]/, '');
        // Basic move patterns
        const patterns = [
            // Castling
            /^(O-O|O-O-O)$/,
            // Pawn moves: e4, e5, exd5, e8=Q
            /^([a-h])([1-8])(?:=([QRBN]))?$/,
            // Pawn captures: exd5, e8=Q
            /^([a-h])x([a-h][1-8])(?:=([QRBN]))?$/,
            // Piece moves: Nf3, Nxe4, Nbd7, Nf3e4
            /^([KQRBN])([a-h]?[1-8]?)(?:x([a-h][1-8]))?$/,
            // Piece moves with disambiguation: Nbd7, R1a3
            /^([KQRBN])([a-h1-8])([a-h][1-8])$/,
            // Piece captures with disambiguation: Ndxe4, R1xa3
            /^([KQRBN])([a-h1-8])x([a-h][1-8])$/
        ];
        for (const pattern of patterns) {
            const match = moveText.match(pattern);
            if (match) {
                return this.convertNotationToMove(moveText);
            }
        }
        return null;
    }
    convertNotationToMove(notation) {
        // This is a simplified conversion - in a real implementation,
        // you'd need a proper chess library to convert notation to moves
        if (notation === 'O-O' || notation === 'O-O-O') {
            // Castling
            const isKingside = notation === 'O-O';
            return {
                from: isKingside ? 'e1' : 'e1',
                to: isKingside ? 'g1' : 'c1',
                piece: 'K'
            };
        }
        // Handle piece moves with disambiguation
        if (/^[KQRBN][a-h1-8][a-h][1-8]/.test(notation)) {
            const piece = notation[0];
            const disambiguation = notation[1];
            const toSquare = notation.slice(2);
            const fromSquare = this.findFromSquareWithDisambiguation(piece, toSquare, disambiguation);
            if (fromSquare) {
                return { from: fromSquare, to: toSquare, piece };
            }
        }
        // Handle piece captures with disambiguation
        if (/^[KQRBN][a-h1-8]x[a-h][1-8]/.test(notation)) {
            const piece = notation[0];
            const disambiguation = notation[1];
            const toSquare = notation.slice(3);
            const fromSquare = this.findFromSquareWithDisambiguation(piece, toSquare, disambiguation);
            if (fromSquare) {
                return { from: fromSquare, to: toSquare, piece };
            }
        }
        // Handle regular piece moves
        if (/^[KQRBN]/.test(notation)) {
            const piece = notation[0];
            let toSquare = '';
            // Extract destination square
            if (notation.includes('x')) {
                // Capture move
                toSquare = notation.split('x')[1];
            }
            else {
                // Regular move
                toSquare = notation.slice(1);
            }
            const fromSquare = this.findFromSquare(piece, toSquare);
            if (fromSquare && toSquare) {
                return { from: fromSquare, to: toSquare, piece };
            }
        }
        else {
            // Pawn move
            let toSquare = '';
            let fromSquare = '';
            if (notation.includes('x')) {
                // Pawn capture
                const parts = notation.split('x');
                const fromFile = parts[0];
                toSquare = parts[1];
                const toRank = parseInt(toSquare[1]);
                const fromRank = toRank > 4 ? toRank - 1 : toRank + 1;
                fromSquare = `${fromFile}${fromRank}`;
            }
            else {
                // Regular pawn move
                toSquare = notation;
                const file = toSquare[0];
                const rank = parseInt(toSquare[1]);
                const fromRank = rank === 6 ? 6 : (rank === 3 ? 3 : (rank > 4 ? rank - 1 : rank + 1));
                fromSquare = `${file}${fromRank}`;
            }
            if (fromSquare && toSquare) {
                return { from: fromSquare, to: toSquare, piece: 'P' };
            }
        }
        return null;
    }
    findFromSquareWithDisambiguation(piece, toSquare, disambiguation) {
        // This is a simplified implementation for disambiguation
        // In a real chess application, you'd need to analyze the current board
        if (/^[a-h]$/.test(disambiguation)) {
            // File disambiguation (e.g., Nbd7)
            const file = disambiguation;
            const rank = toSquare[1] === '1' ? '1' : '8';
            return `${file}${rank}`;
        }
        else if (/^[1-8]$/.test(disambiguation)) {
            // Rank disambiguation (e.g., R1a3)
            const rank = disambiguation;
            const file = toSquare[0] === 'a' ? 'a' : 'h';
            return `${file}${rank}`;
        }
        return this.findFromSquare(piece, toSquare);
    }
    findFromSquare(piece, toSquare) {
        // This is a simplified implementation
        // In a real chess application, you'd need to analyze the current board
        // to determine the legal from square for the given piece and destination
        // For now, we'll create reasonable defaults based on piece type
        if (piece === 'K') {
            // King moves - assume from e1 or e8
            return toSquare[1] === '1' ? 'e1' : 'e8';
        }
        else if (piece === 'Q') {
            // Queen moves - assume from d1 or d8
            return toSquare[1] === '1' ? 'd1' : 'd8';
        }
        else if (piece === 'R') {
            // Rook moves - assume from a1/h1 or a8/h8
            return toSquare[0] === 'a' ? (toSquare[1] === '1' ? 'a1' : 'a8') : (toSquare[1] === '1' ? 'h1' : 'h8');
        }
        else if (piece === 'B') {
            // Bishop moves - assume from c1/f1 or c8/f8
            return toSquare[0] === 'c' ? (toSquare[1] === '1' ? 'c1' : 'c8') : (toSquare[1] === '1' ? 'f1' : 'f8');
        }
        else if (piece === 'N') {
            // Knight moves - assume from b1/g1 or b8/g8
            return toSquare[0] === 'b' ? (toSquare[1] === '1' ? 'b1' : 'b8') : (toSquare[1] === '1' ? 'g1' : 'g8');
        }
        else if (piece === 'P') {
            // Pawn moves - assume from the square directly below/above
            const file = toSquare[0];
            const rank = parseInt(toSquare[1]);
            const fromRank = rank === 6 ? 6 : (rank === 3 ? 3 : (rank > 4 ? rank - 1 : rank + 1));
            return `${file}${fromRank}`;
        }
        return null;
    }
    initializePositionControls() {
        // Current player radio buttons
        const playerRadios = document.querySelectorAll('input[name="current-player"]');
        playerRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                this.updatePositionFromControls();
            });
        });
        // Castling rights checkboxes
        const castlingCheckboxes = [
            'white-kingside', 'white-queenside', 'black-kingside', 'black-queenside'
        ];
        castlingCheckboxes.forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox) {
                checkbox.addEventListener('change', () => {
                    this.updatePositionFromControls();
                });
            }
        });
        // En passant input
        const enPassantInput = document.getElementById('en-passant');
        if (enPassantInput) {
            enPassantInput.addEventListener('input', () => {
                this.updatePositionFromControls();
            });
        }
    }
    updatePositionFromControls() {
        const currentPlayer = document.querySelector('input[name="current-player"]:checked')?.value || 'w';
        const whiteKingside = document.getElementById('white-kingside')?.checked || false;
        const whiteQueenside = document.getElementById('white-queenside')?.checked || false;
        const blackKingside = document.getElementById('black-kingside')?.checked || false;
        const blackQueenside = document.getElementById('black-queenside')?.checked || false;
        const enPassant = document.getElementById('en-passant')?.value || '-';
        // Build castling rights string
        let castling = '';
        if (whiteKingside)
            castling += 'K';
        if (whiteQueenside)
            castling += 'Q';
        if (blackKingside)
            castling += 'k';
        if (blackQueenside)
            castling += 'q';
        if (castling === '')
            castling = '-';
        // Get current board position
        const currentFEN = this.board.getFEN();
        const fenParts = currentFEN.split(' ');
        // Update FEN parts
        fenParts[1] = currentPlayer; // Turn
        fenParts[2] = castling; // Castling rights
        fenParts[3] = enPassant; // En passant square
        // Reconstruct FEN
        const newFEN = fenParts.join(' ');
        // Update initial FEN and clear moves
        this.initialFEN = newFEN;
        this.moves = [];
        // Update board
        this.board.setPosition(newFEN);
        this.updateMoveList();
    }
    updateControlsFromPosition() {
        const fen = this.board.getFEN();
        const fenParts = fen.split(' ');
        if (fenParts.length >= 4) {
            // Update current player
            const currentPlayer = fenParts[1];
            const playerRadio = document.querySelector(`input[name="current-player"][value="${currentPlayer}"]`);
            if (playerRadio) {
                playerRadio.checked = true;
            }
            // Update castling rights
            const castling = fenParts[2];
            const whiteKingside = document.getElementById('white-kingside');
            const whiteQueenside = document.getElementById('white-queenside');
            const blackKingside = document.getElementById('black-kingside');
            const blackQueenside = document.getElementById('black-queenside');
            if (whiteKingside)
                whiteKingside.checked = castling.includes('K');
            if (whiteQueenside)
                whiteQueenside.checked = castling.includes('Q');
            if (blackKingside)
                blackKingside.checked = castling.includes('k');
            if (blackQueenside)
                blackQueenside.checked = castling.includes('q');
            // Update en passant
            const enPassant = fenParts[3];
            const enPassantInput = document.getElementById('en-passant');
            if (enPassantInput) {
                enPassantInput.value = enPassant;
            }
        }
    }
}
// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ChessAnalysisApp();
});
//# sourceMappingURL=app.js.map