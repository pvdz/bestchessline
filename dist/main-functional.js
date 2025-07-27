import { moveToNotation, pvToNotation, parseFEN, toFEN, squareToCoords, coordsToSquare, log, logError, getInputElement, getTextAreaElement, getButtonElement, getCheckedRadioByName } from './utils.js';
import * as Board from './chess-board-functional.js';
import * as Stockfish from './stockfish-client-functional.js';
/**
 * Application state instance
 */
let appState = {
    moves: [],
    initialFEN: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    currentMoveIndex: -1,
    isAnalyzing: false,
    currentResults: null
};
/**
 * Update application state
 */
const updateAppState = (updates) => {
    appState = { ...appState, ...updates };
};
/**
 * Get current application state
 */
const getAppState = () => ({ ...appState });
// ============================================================================
// INITIALIZATION
// ============================================================================
/**
 * Initialize the application
 */
const initializeApp = () => {
    log('Initializing Chess Analysis App...');
    // Initialize board
    const boardElement = document.getElementById('chess-board');
    if (!boardElement) {
        throw new Error('Chess board element not found');
    }
    Board.initializeBoard(boardElement, appState.initialFEN);
    // Initialize Stockfish
    Stockfish.initializeStockfish();
    // Set up board callbacks
    Board.setOnPositionChange((position) => {
        updateFENInput();
        updateControlsFromPosition();
    });
    Board.setOnMoveMade((move) => {
        addMove(move);
    });
    // Initialize event listeners
    initializeEventListeners();
    initializeMoveHoverEvents();
    // Initialize controls from current board state
    updateControlsFromPosition();
    log('Application initialized successfully');
};
// ============================================================================
// EVENT LISTENERS
// ============================================================================
/**
 * Initialize event listeners
 */
const initializeEventListeners = () => {
    // Board controls
    const resetBtn = document.getElementById('reset-board');
    const clearBtn = document.getElementById('clear-board');
    const fenInput = getInputElement('fen-input');
    const loadFenBtn = document.getElementById('load-fen');
    const gameNotation = getTextAreaElement('game-notation');
    const importGameBtn = document.getElementById('import-game');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            const initialFEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
            updateAppState({
                initialFEN,
                moves: [],
                currentMoveIndex: -1
            });
            Board.setPosition(initialFEN);
            updateMoveList();
            updateNavigationButtons();
        });
    }
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            const emptyFEN = '8/8/8/8/8/8/8/8 w - - 0 1';
            updateAppState({
                initialFEN: emptyFEN,
                moves: [],
                currentMoveIndex: -1
            });
            Board.setPosition(emptyFEN);
            updateMoveList();
            updateNavigationButtons();
        });
    }
    if (loadFenBtn && fenInput) {
        loadFenBtn.addEventListener('click', () => {
            const fen = fenInput.value.trim();
            if (fen) {
                updateAppState({
                    initialFEN: fen,
                    moves: [],
                    currentMoveIndex: -1
                });
                Board.setPosition(fen);
                updateMoveList();
                updateNavigationButtons();
            }
        });
    }
    if (importGameBtn && gameNotation) {
        importGameBtn.addEventListener('click', () => {
            const notation = gameNotation.value.trim();
            if (notation) {
                importGame(notation);
            }
        });
    }
    // Game moves navigation
    const prevMoveBtn = document.getElementById('prev-move');
    const nextMoveBtn = document.getElementById('next-move');
    if (prevMoveBtn) {
        prevMoveBtn.addEventListener('click', () => previousMove());
    }
    if (nextMoveBtn) {
        nextMoveBtn.addEventListener('click', () => nextMove());
    }
    // Analysis controls
    const startBtn = document.getElementById('start-analysis');
    const pauseBtn = document.getElementById('pause-analysis');
    const stopBtn = document.getElementById('stop-analysis');
    if (startBtn) {
        startBtn.addEventListener('click', () => startAnalysis());
    }
    if (pauseBtn) {
        pauseBtn.addEventListener('click', () => pauseAnalysis());
    }
    if (stopBtn) {
        stopBtn.addEventListener('click', () => stopAnalysis());
    }
    // Position controls
    initializePositionControls();
    // Analysis format controls
    const notationRadios = document.querySelectorAll('input[name="notation-format"]');
    const pieceRadios = document.querySelectorAll('input[name="piece-format"]');
    notationRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            updateMoveList();
            updateResultsPanel(appState.currentResults?.moves || []);
        });
    });
    pieceRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            updateMoveList();
            updateResultsPanel(appState.currentResults?.moves || []);
        });
    });
};
/**
 * Initialize position controls
 */
const initializePositionControls = () => {
    // Current player controls
    const playerRadios = document.querySelectorAll('input[name="current-player"]');
    playerRadios.forEach(radio => {
        radio.addEventListener('change', updatePositionFromControls);
    });
    // Castling controls
    const castlingCheckboxes = document.querySelectorAll('input[type="checkbox"]');
    castlingCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updatePositionFromControls);
    });
    // En passant control
    const enPassantInput = getInputElement('en-passant');
    if (enPassantInput) {
        enPassantInput.addEventListener('input', updatePositionFromControls);
    }
};
// ============================================================================
// ANALYSIS FUNCTIONS
// ============================================================================
/**
 * Start analysis
 */
const startAnalysis = async () => {
    if (appState.isAnalyzing)
        return;
    updateAppState({ isAnalyzing: true });
    updateButtonStates();
    try {
        const options = getAnalysisOptions();
        const fen = Board.getFEN();
        const result = await Stockfish.analyzePosition(fen, options, (analysisResult) => {
            updateAppState({ currentResults: analysisResult });
            updateResults(analysisResult);
        });
        updateAppState({
            currentResults: result,
            isAnalyzing: false
        });
        updateButtonStates();
    }
    catch (error) {
        logError('Analysis failed:', error);
        updateAppState({ isAnalyzing: false });
        updateButtonStates();
    }
};
/**
 * Pause analysis
 */
const pauseAnalysis = () => {
    Stockfish.stopAnalysis();
    updateAppState({ isAnalyzing: false });
    updateButtonStates();
};
/**
 * Stop analysis
 */
const stopAnalysis = () => {
    Stockfish.stopAnalysis();
    updateAppState({
        isAnalyzing: false,
        currentResults: null
    });
    updateButtonStates();
    updateResultsPanel([]);
};
/**
 * Get analysis options from UI
 */
const getAnalysisOptions = () => {
    const maxDepth = getInputElement('max-depth')?.value || '20';
    const whiteMoves = getInputElement('white-moves')?.value || '5';
    const blackMoves = getInputElement('black-moves')?.value || '5';
    const threads = getInputElement('threads')?.value || '1';
    return {
        depth: parseInt(maxDepth),
        threads: parseInt(threads),
        multiPV: Math.max(parseInt(whiteMoves), parseInt(blackMoves))
    };
};
/**
 * Update button states
 */
const updateButtonStates = () => {
    const startBtn = getButtonElement('start-analysis');
    const pauseBtn = getButtonElement('pause-analysis');
    const stopBtn = getButtonElement('stop-analysis');
    if (startBtn)
        startBtn.disabled = appState.isAnalyzing;
    if (pauseBtn)
        pauseBtn.disabled = !appState.isAnalyzing;
    if (stopBtn)
        stopBtn.disabled = !appState.isAnalyzing;
};
// ============================================================================
// RESULTS MANAGEMENT
// ============================================================================
/**
 * Update results display
 */
const updateResults = (result) => {
    if (!result || !result.moves)
        return;
    updateResultsPanel(result.moves);
    updateStatus(`Analysis complete: ${result.moves.length} moves found`);
};
/**
 * Update results panel
 */
const updateResultsPanel = (moves) => {
    const resultsPanel = document.getElementById('analysis-results');
    if (!resultsPanel)
        return;
    // Get current format settings
    const notationFormat = getCheckedRadioByName('notation-format')?.value || 'algebraic';
    const pieceFormat = getCheckedRadioByName('piece-format')?.value || 'symbols';
    // Convert format values to match moveToNotation parameters
    const notationType = notationFormat === 'algebraic' ? 'short' : 'long';
    const pieceType = pieceFormat === 'symbols' ? 'unicode' : 'english';
    resultsPanel.innerHTML = '';
    moves.forEach((move, index) => {
        const moveItem = document.createElement('div');
        moveItem.className = 'move-item';
        moveItem.dataset.moveFrom = move.move.from;
        moveItem.dataset.moveTo = move.move.to;
        moveItem.dataset.movePiece = move.move.piece;
        const rank = index + 1;
        const notation = moveToNotation(move.move, notationType, pieceType, Board.getFEN());
        const score = move.score > 0 ? `+${move.score / 100}` : `${move.score / 100}`;
        const pv = pvToNotation(move.pv);
        moveItem.innerHTML = `
      <div class="move-header">
        <span class="move-rank" title="Move rank">${rank}</span>
        <span class="move-notation" title="Move notation">${notation}</span>
        <div class="move-info" title="Analysis information">
          <span class="depth-info" title="Analysis depth">d${move.depth}</span>
          <span class="nodes-info" title="Nodes searched">${move.nodes.toLocaleString()}</span>
          <span class="time-info" title="Analysis time">${move.time}ms</span>
        </div>
        <span class="move-score" title="Move evaluation">${score}</span>
      </div>
      <div class="move-details">
        <div class="move-pv" title="Principal variation">${pv}</div>
      </div>
    `;
        // Add click handler to make the move
        moveItem.addEventListener('click', () => {
            makeAnalysisMove(move.move);
        });
        resultsPanel.appendChild(moveItem);
    });
    addMoveHoverListeners();
};
/**
 * Make a move from analysis results
 */
const makeAnalysisMove = (move) => {
    // Add the move to the game history
    addMove(move);
    // Update the board position
    const newFEN = applyMoveToFEN(Board.getFEN(), move);
    Board.setPosition(newFEN);
    // Update UI controls
    updateFENInput();
    updateControlsFromPosition();
    // Update move list and navigation
    updateMoveList();
    updateNavigationButtons();
    // Clear any existing move highlights
    clearLastMoveHighlight();
    // Highlight the new move
    highlightLastMove(move);
    updateStatus(`Made move: ${move.from}${move.to}`);
};
/**
 * Update status message
 */
const updateStatus = (message) => {
    const statusElement = document.getElementById('status');
    if (statusElement) {
        statusElement.textContent = message;
    }
};
// ============================================================================
// MOVE HOVER EVENTS
// ============================================================================
/**
 * Initialize move hover events
 */
const initializeMoveHoverEvents = () => {
    addMoveHoverListeners();
};
/**
 * Add move hover listeners
 */
const addMoveHoverListeners = () => {
    const moveItems = document.querySelectorAll('.move-item');
    moveItems.forEach(item => {
        item.addEventListener('mouseenter', () => {
            const from = item.getAttribute('data-move-from');
            const to = item.getAttribute('data-move-to');
            const piece = item.getAttribute('data-move-piece');
            if (from && to && piece) {
                Board.showMoveArrow(from, to, piece);
            }
        });
        item.addEventListener('mouseleave', () => {
            Board.hideMoveArrow();
        });
    });
};
// ============================================================================
// FEN MANAGEMENT
// ============================================================================
/**
 * Update FEN input field
 */
const updateFENInput = () => {
    const fenInput = getInputElement('fen-input');
    if (fenInput) {
        fenInput.value = Board.getFEN();
    }
};
/**
 * Update controls from current position
 */
const updateControlsFromPosition = () => {
    const fen = Board.getFEN();
    const fenParts = fen.split(' ');
    if (fenParts.length < 4)
        return;
    const turn = fenParts[1];
    const castling = fenParts[2];
    const enPassant = fenParts[3];
    // Update current player
    const whiteRadio = document.querySelector('input[name="current-player"][value="w"]');
    const blackRadio = document.querySelector('input[name="current-player"][value="b"]');
    if (whiteRadio && blackRadio) {
        if (turn === 'w') {
            whiteRadio.checked = true;
        }
        else {
            blackRadio.checked = true;
        }
    }
    // Update castling rights
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
    const enPassantInput = document.getElementById('en-passant');
    if (enPassantInput) {
        enPassantInput.value = enPassant === '-' ? '' : enPassant;
    }
};
/**
 * Update position from controls
 */
const updatePositionFromControls = () => {
    // Get current player
    const whiteRadio = document.querySelector('input[name="current-player"][value="w"]');
    const turn = whiteRadio?.checked ? 'w' : 'b';
    // Get castling rights
    const whiteKingside = document.getElementById('white-kingside');
    const whiteQueenside = document.getElementById('white-queenside');
    const blackKingside = document.getElementById('black-kingside');
    const blackQueenside = document.getElementById('black-queenside');
    let castling = '';
    if (whiteKingside?.checked)
        castling += 'K';
    if (whiteQueenside?.checked)
        castling += 'Q';
    if (blackKingside?.checked)
        castling += 'k';
    if (blackQueenside?.checked)
        castling += 'q';
    if (!castling)
        castling = '-';
    // Get en passant
    const enPassantInput = document.getElementById('en-passant');
    const enPassant = enPassantInput?.value || '-';
    // Construct new FEN
    const currentFEN = Board.getFEN();
    const fenParts = currentFEN.split(' ');
    const newFEN = `${fenParts[0]} ${turn} ${castling} ${enPassant} ${fenParts[4]} ${fenParts[5]}`;
    // Update state and board
    updateAppState({
        initialFEN: newFEN,
        moves: [],
        currentMoveIndex: -1
    });
    Board.setPosition(newFEN);
    updateMoveList();
    updateNavigationButtons();
};
// ============================================================================
// GAME MANAGEMENT
// ============================================================================
/**
 * Add move to game history
 */
const addMove = (move) => {
    updateAppState({
        moves: [...appState.moves, move],
        currentMoveIndex: appState.moves.length
    });
    updateMoveList();
    updateNavigationButtons();
    highlightLastMove(move);
};
/**
 * Import game from notation
 */
const importGame = (notation) => {
    console.log('Importing game:', notation);
    // Reset game state
    updateAppState({
        moves: [],
        currentMoveIndex: -1
    });
    // Parse moves
    const moves = parseGameNotation(notation);
    updateAppState({ moves });
    updateMoveList();
    updateNavigationButtons();
    // Set board to initial position
    Board.setPosition(appState.initialFEN);
    console.log('Game import complete, parsed moves:', moves);
};
/**
 * Parse game notation into moves
 */
const parseGameNotation = (notation) => {
    // Clean the notation
    let cleanNotation = notation
        .replace(/\{[^}]*\}/g, '') // Remove comments
        .replace(/\([^)]*\)/g, '') // Remove annotations
        .replace(/\$\d+/g, '') // Remove evaluation symbols
        .replace(/[!?]+/g, '') // Remove move annotations
        .replace(/\d+\./g, '') // Remove move numbers
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
    console.log('Cleaned notation:', cleanNotation);
    const moves = [];
    const tokens = cleanNotation.split(/\s+/);
    // Apply moves sequentially to maintain board context
    let currentFEN = appState.initialFEN;
    for (const token of tokens) {
        if (!token || token === '1-0' || token === '0-1' || token === '1/2-1/2' || token === '*') {
            continue;
        }
        const move = parseMove(token, currentFEN);
        if (move) {
            moves.push(move);
            // Apply move to current FEN for next iteration
            currentFEN = applyMoveToFEN(currentFEN, move);
        }
    }
    return moves;
};
/**
 * Parse individual move
 */
const parseMove = (moveText, currentFEN) => {
    console.log('Parsing move:', moveText, 'from FEN:', currentFEN);
    const position = parseFEN(currentFEN);
    const isWhiteTurn = position.turn === 'w';
    // Handle castling
    if (moveText === 'O-O' || moveText === '0-0') {
        if (isWhiteTurn) {
            return { from: 'e1', to: 'g1', piece: 'K', special: 'castling', rookFrom: 'h1', rookTo: 'f1' };
        }
        else {
            return { from: 'e8', to: 'g8', piece: 'k', special: 'castling', rookFrom: 'h8', rookTo: 'f8' };
        }
    }
    if (moveText === 'O-O-O' || moveText === '0-0-0') {
        if (isWhiteTurn) {
            return { from: 'e1', to: 'c1', piece: 'K', special: 'castling', rookFrom: 'a1', rookTo: 'd1' };
        }
        else {
            return { from: 'e8', to: 'c8', piece: 'k', special: 'castling', rookFrom: 'a8', rookTo: 'd8' };
        }
    }
    // Handle pawn moves (both white and black)
    if (moveText.match(/^[a-h][2-7]$/)) {
        // Simple pawn move
        const toSquare = moveText;
        const fromSquare = findFromSquare('P', toSquare, currentFEN);
        if (fromSquare) {
            const piece = isWhiteTurn ? 'P' : 'p';
            return { from: fromSquare, to: toSquare, piece };
        }
    }
    // Handle pawn captures (both white and black)
    if (moveText.match(/^[a-h]x[a-h][2-7]$/)) {
        const fromFile = moveText[0];
        const toSquare = moveText.substring(2);
        const fromSquare = findFromSquare('P', toSquare, currentFEN);
        if (fromSquare) {
            const piece = isWhiteTurn ? 'P' : 'p';
            return { from: fromSquare, to: toSquare, piece };
        }
    }
    // Handle piece moves
    const pieceMatch = moveText.match(/^([KQRBN])([a-h]?[1-8]?)?x?([a-h][1-8])([+#])?$/);
    if (pieceMatch) {
        const pieceType = pieceMatch[1];
        const disambiguation = pieceMatch[2] || '';
        const toSquare = pieceMatch[3];
        const fromSquare = findFromSquareWithDisambiguation(pieceType, toSquare, disambiguation, currentFEN);
        if (fromSquare) {
            const piece = isWhiteTurn ? pieceType : pieceType.toLowerCase();
            return { from: fromSquare, to: toSquare, piece };
        }
    }
    console.log('Failed to parse move:', moveText);
    return null;
};
/**
 * Find from square for a piece
 */
const findFromSquare = (piece, toSquare, currentFEN) => {
    const position = parseFEN(currentFEN);
    const [toRank, toFile] = squareToCoords(toSquare);
    // Find all pieces of the given type
    const candidates = [];
    for (let rank = 0; rank < 8; rank++) {
        for (let file = 0; file < 8; file++) {
            const squarePiece = position.board[rank][file];
            if (squarePiece && squarePiece.toUpperCase() === piece) {
                // Check if piece color matches current turn
                const isWhitePiece = squarePiece === squarePiece.toUpperCase();
                const isWhiteTurn = position.turn === 'w';
                if (isWhitePiece === isWhiteTurn) {
                    const fromSquare = coordsToSquare(rank, file);
                    if (canPieceMoveTo(fromSquare, toSquare, piece, position.board)) {
                        candidates.push(fromSquare);
                    }
                }
            }
        }
    }
    if (candidates.length === 1) {
        return candidates[0];
    }
    else if (candidates.length > 1) {
        return selectCorrectMove(candidates, toSquare, piece, position.board);
    }
    return null;
};
/**
 * Find from square with disambiguation
 */
const findFromSquareWithDisambiguation = (piece, toSquare, disambiguation, currentFEN) => {
    const position = parseFEN(currentFEN);
    const [toRank, toFile] = squareToCoords(toSquare);
    // Find all pieces of the given type
    const candidates = [];
    for (let rank = 0; rank < 8; rank++) {
        for (let file = 0; file < 8; file++) {
            const squarePiece = position.board[rank][file];
            if (squarePiece && squarePiece.toUpperCase() === piece) {
                // Check if piece color matches current turn
                const isWhitePiece = squarePiece === squarePiece.toUpperCase();
                const isWhiteTurn = position.turn === 'w';
                if (isWhitePiece === isWhiteTurn) {
                    const fromSquare = coordsToSquare(rank, file);
                    if (canPieceMoveTo(fromSquare, toSquare, piece, position.board)) {
                        candidates.push(fromSquare);
                    }
                }
            }
        }
    }
    // Apply disambiguation
    if (disambiguation) {
        const filtered = candidates.filter(square => square.includes(disambiguation[0]) || square.includes(disambiguation[1]));
        if (filtered.length > 0) {
            candidates.splice(0, candidates.length, ...filtered);
        }
    }
    if (candidates.length === 1) {
        return candidates[0];
    }
    else if (candidates.length > 1) {
        return selectCorrectMove(candidates, toSquare, piece, position.board);
    }
    return null;
};
/**
 * Check if piece can move to destination
 */
const canPieceMoveTo = (fromSquare, toSquare, piece, board) => {
    const [fromRank, fromFile] = squareToCoords(fromSquare);
    const [toRank, toFile] = squareToCoords(toSquare);
    // Check if destination is occupied by same color
    const fromPiece = board[fromRank][fromFile];
    const toPiece = board[toRank][toFile];
    if (toPiece && (fromPiece.toUpperCase() === fromPiece) === (toPiece.toUpperCase() === toPiece)) {
        return false;
    }
    const pieceType = piece.toUpperCase();
    switch (pieceType) {
        case 'P':
            return canPawnMoveTo(fromSquare, toSquare, board);
        case 'R':
            return canRookMoveTo(fromSquare, toSquare, board);
        case 'N':
            return canKnightMoveTo(fromSquare, toSquare, board);
        case 'B':
            return canBishopMoveTo(fromSquare, toSquare, board);
        case 'Q':
            return canQueenMoveTo(fromSquare, toSquare, board);
        case 'K':
            return canKingMoveTo(fromSquare, toSquare, board);
        default:
            return false;
    }
};
/**
 * Check if pawn can move to destination
 */
const canPawnMoveTo = (fromSquare, toSquare, board) => {
    const [fromRank, fromFile] = squareToCoords(fromSquare);
    const [toRank, toFile] = squareToCoords(toSquare);
    const fromPiece = board[fromRank][fromFile];
    const isWhite = fromPiece === fromPiece.toUpperCase();
    const direction = isWhite ? -1 : 1;
    // Forward move
    if (fromFile === toFile && toRank === fromRank + direction) {
        return board[toRank][toFile] === '';
    }
    // Double move from starting position
    if (fromFile === toFile && toRank === fromRank + 2 * direction) {
        const startRank = isWhite ? 6 : 1;
        if (fromRank === startRank) {
            return board[fromRank + direction][fromFile] === '' && board[toRank][toFile] === '';
        }
    }
    // Capture
    if (Math.abs(fromFile - toFile) === 1 && toRank === fromRank + direction) {
        return board[toRank][toFile] !== '';
    }
    return false;
};
/**
 * Check if rook can move to destination
 */
const canRookMoveTo = (fromSquare, toSquare, board) => {
    const [fromRank, fromFile] = squareToCoords(fromSquare);
    const [toRank, toFile] = squareToCoords(toSquare);
    // Rook moves horizontally or vertically
    if (fromRank !== toRank && fromFile !== toFile) {
        return false;
    }
    // Check path
    const rankStep = fromRank === toRank ? 0 : (toRank > fromRank ? 1 : -1);
    const fileStep = fromFile === toFile ? 0 : (toFile > fromFile ? 1 : -1);
    let currentRank = fromRank + rankStep;
    let currentFile = fromFile + fileStep;
    while (currentRank !== toRank || currentFile !== toFile) {
        if (board[currentRank][currentFile] !== '') {
            return false;
        }
        currentRank += rankStep;
        currentFile += fileStep;
    }
    return true;
};
/**
 * Check if knight can move to destination
 */
const canKnightMoveTo = (fromSquare, toSquare, board) => {
    const [fromRank, fromFile] = squareToCoords(fromSquare);
    const [toRank, toFile] = squareToCoords(toSquare);
    const rankDiff = Math.abs(fromRank - toRank);
    const fileDiff = Math.abs(fromFile - toFile);
    return (rankDiff === 2 && fileDiff === 1) || (rankDiff === 1 && fileDiff === 2);
};
/**
 * Check if bishop can move to destination
 */
const canBishopMoveTo = (fromSquare, toSquare, board) => {
    const [fromRank, fromFile] = squareToCoords(fromSquare);
    const [toRank, toFile] = squareToCoords(toSquare);
    // Bishop moves diagonally
    if (Math.abs(fromRank - toRank) !== Math.abs(fromFile - toFile)) {
        return false;
    }
    // Check path
    const rankStep = toRank > fromRank ? 1 : -1;
    const fileStep = toFile > fromFile ? 1 : -1;
    let currentRank = fromRank + rankStep;
    let currentFile = fromFile + fileStep;
    while (currentRank !== toRank && currentFile !== toFile) {
        if (board[currentRank][currentFile] !== '') {
            return false;
        }
        currentRank += rankStep;
        currentFile += fileStep;
    }
    return true;
};
/**
 * Check if queen can move to destination
 */
const canQueenMoveTo = (fromSquare, toSquare, board) => {
    return canRookMoveTo(fromSquare, toSquare, board) || canBishopMoveTo(fromSquare, toSquare, board);
};
/**
 * Check if king can move to destination
 */
const canKingMoveTo = (fromSquare, toSquare, board) => {
    const [fromRank, fromFile] = squareToCoords(fromSquare);
    const [toRank, toFile] = squareToCoords(toSquare);
    const rankDiff = Math.abs(fromRank - toRank);
    const fileDiff = Math.abs(fromFile - toFile);
    return rankDiff <= 1 && fileDiff <= 1;
};
/**
 * Select correct move when multiple options exist
 */
const selectCorrectMove = (candidates, toSquare, piece, board) => {
    // For now, just return the first candidate
    // In a full implementation, this would use more sophisticated logic
    return candidates[0];
};
/**
 * Apply move to FEN
 */
const applyMoveToFEN = (fen, move) => {
    const position = parseFEN(fen);
    const [fromRank, fromFile] = squareToCoords(move.from);
    const [toRank, toFile] = squareToCoords(move.to);
    // Create new board
    const newBoard = position.board.map(row => [...row]);
    newBoard[toRank][toFile] = newBoard[fromRank][fromFile];
    newBoard[fromRank][fromFile] = '';
    // Handle special moves
    if (move.special === 'castling') {
        if (move.rookFrom && move.rookTo) {
            const [rookFromRank, rookFromFile] = squareToCoords(move.rookFrom);
            const [rookToRank, rookToFile] = squareToCoords(move.rookTo);
            newBoard[rookToRank][rookToFile] = newBoard[rookFromRank][rookFromFile];
            newBoard[rookFromRank][rookFromFile] = '';
        }
    }
    // Update castling rights
    let newCastling = position.castling;
    // Remove castling rights when king moves
    if (move.piece.toUpperCase() === 'K') {
        if (move.piece === 'K') {
            // White king moved
            newCastling = newCastling.replace(/[KQ]/g, '');
        }
        else {
            // Black king moved
            newCastling = newCastling.replace(/[kq]/g, '');
        }
    }
    // Remove castling rights when rooks move
    if (move.piece.toUpperCase() === 'R') {
        if (move.from === 'a1')
            newCastling = newCastling.replace('Q', '');
        if (move.from === 'h1')
            newCastling = newCastling.replace('K', '');
        if (move.from === 'a8')
            newCastling = newCastling.replace('q', '');
        if (move.from === 'h8')
            newCastling = newCastling.replace('k', '');
    }
    // Update en passant
    let newEnPassant = null;
    if (move.piece.toUpperCase() === 'P') {
        const [fromRank, fromFile] = squareToCoords(move.from);
        const [toRank, toFile] = squareToCoords(move.to);
        // Check if it's a double pawn move
        if (Math.abs(fromRank - toRank) === 2) {
            const enPassantRank = fromRank + (toRank > fromRank ? 1 : -1);
            newEnPassant = coordsToSquare(enPassantRank, fromFile);
        }
    }
    // Update position
    const newPosition = {
        ...position,
        board: newBoard,
        turn: position.turn === 'w' ? 'b' : 'w',
        castling: newCastling || '-',
        enPassant: newEnPassant
    };
    return toFEN(newPosition);
};
/**
 * Navigate to previous move
 */
const previousMove = () => {
    if (appState.currentMoveIndex > -1) {
        const newIndex = appState.currentMoveIndex - 1;
        updateAppState({ currentMoveIndex: newIndex });
        applyMovesUpToIndex(newIndex);
        updateNavigationButtons();
        updateFENInput();
        updateControlsFromPosition();
    }
};
/**
 * Navigate to next move
 */
const nextMove = () => {
    if (appState.currentMoveIndex < appState.moves.length - 1) {
        const newIndex = appState.currentMoveIndex + 1;
        updateAppState({ currentMoveIndex: newIndex });
        applyMovesUpToIndex(newIndex);
        updateNavigationButtons();
        updateFENInput();
        updateControlsFromPosition();
    }
};
/**
 * Apply moves up to specified index
 */
const applyMovesUpToIndex = (index) => {
    // Reset to initial position
    Board.setPosition(appState.initialFEN);
    // Apply moves up to index
    let currentFEN = appState.initialFEN;
    for (let i = 0; i <= index && i < appState.moves.length; i++) {
        const move = appState.moves[i];
        currentFEN = applyMoveToFEN(currentFEN, move);
    }
    Board.setPosition(currentFEN);
    updateMoveList();
    updateFENInput();
    updateControlsFromPosition();
    // Highlight last move if there is one
    if (index >= 0 && index < appState.moves.length) {
        highlightLastMove(appState.moves[index]);
    }
    else {
        clearLastMoveHighlight();
    }
};
/**
 * Highlight the last move on the board
 */
const highlightLastMove = (move) => {
    // Clear previous highlights
    clearLastMoveHighlight();
    // Add highlights for the last move
    const fromSquare = document.querySelector(`[data-square="${move.from}"]`);
    const toSquare = document.querySelector(`[data-square="${move.to}"]`);
    if (fromSquare) {
        fromSquare.classList.add('last-move-from');
    }
    if (toSquare) {
        toSquare.classList.add('last-move-to');
    }
};
/**
 * Clear last move highlight
 */
const clearLastMoveHighlight = () => {
    Board.clearLastMoveHighlight();
};
/**
 * Update move list display
 */
const updateMoveList = () => {
    const movesPanel = document.getElementById('game-moves');
    if (!movesPanel)
        return;
    // Get current format settings
    const notationFormat = document.querySelector('input[name="notation-format"]:checked')?.value || 'algebraic';
    const pieceFormat = document.querySelector('input[name="piece-format"]:checked')?.value || 'symbols';
    // Convert format values to match moveToNotation parameters
    const notationType = notationFormat === 'algebraic' ? 'short' : 'long';
    const pieceType = pieceFormat === 'symbols' ? 'unicode' : 'english';
    movesPanel.innerHTML = '';
    for (let i = 0; i < appState.moves.length; i += 2) {
        const moveEntry = document.createElement('div');
        moveEntry.className = 'move-entry';
        const moveNumber = Math.floor(i / 2) + 1;
        const whiteMove = appState.moves[i];
        const blackMove = appState.moves[i + 1];
        moveEntry.innerHTML = `
      <span class="move-number">${moveNumber}.</span>
      <span class="move-text ${i === appState.currentMoveIndex ? 'current-move' : ''}">${whiteMove ? moveToNotation(whiteMove, notationType, pieceType, '') : '...'}</span>
      <span class="move-text ${i + 1 === appState.currentMoveIndex ? 'current-move' : ''}">${blackMove ? moveToNotation(blackMove, notationType, pieceType, '') : ''}</span>
    `;
        movesPanel.appendChild(moveEntry);
    }
};
/**
 * Update navigation buttons
 */
const updateNavigationButtons = () => {
    const prevBtn = document.getElementById('prev-move');
    const nextBtn = document.getElementById('next-move');
    if (prevBtn) {
        prevBtn.disabled = appState.currentMoveIndex <= -1;
    }
    if (nextBtn) {
        nextBtn.disabled = appState.currentMoveIndex >= appState.moves.length - 1;
    }
};
// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================
export { 
// Initialization
initializeApp, 
// State management
getAppState, updateAppState, 
// Analysis
startAnalysis, pauseAnalysis, stopAnalysis, 
// Game management
addMove, importGame, previousMove, nextMove, 
// UI updates
updateResults, updateStatus, updateMoveList, updateNavigationButtons, 
// Move highlighting
highlightLastMove, clearLastMoveHighlight };
//# sourceMappingURL=main-functional.js.map