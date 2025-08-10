import { applyMoveToFEN } from "../utils/fen-manipulation.js";
import { parseMove } from "../utils/move-parsing.js";
import { moveToNotation } from "../utils/notation-utils.js";
import { renderBoard, clearBoardSelection, clearBoardSelectionWithoutLastMove, highlightLastMove, } from "./practice-board.js";
import { getPieceAtSquareFromFEN } from "../utils/fen-utils.js";
import { updateStatus, updateStatistics, addMoveToHistory, showSuccessToast, showErrorToast, showInfoToast, showWarningToast, } from "./practice-ui.js";
import { triggerRainbowBurst } from "../utils/confetti-utils.js";
import { clearAllArrows } from "./practice-arrow-utils.js";
import { getElementByIdOrThrow } from "../utils/dom-helpers.js";
// Handle square click for move selection
export function handleSquareClick(square, gameState, dom) {
    if (!gameState.isPracticeActive || !gameState.isHumanTurn)
        return;
    if (gameState.selectedSquare === null) {
        // First click - select piece
        const piece = getPieceAtSquareFromFEN(square, gameState.currentFEN);
        if (piece && isPieceOfCurrentPlayer(piece, gameState.currentFEN)) {
            gameState.selectedSquare = square;
            gameState.validMoves = findValidMovesForPiece(square, piece, gameState.currentFEN);
            highlightSquare(square);
            highlightValidMoves(gameState.validMoves);
        }
    }
    else if (gameState.selectedSquare === square) {
        // Click same square - deselect
        clearSelection();
    }
    else {
        // Check for castling first - if king moves exactly 2 squares horizontally, it must be castling
        const selectedPiece = getPieceAtSquareFromFEN(gameState.selectedSquare, gameState.currentFEN);
        if (selectedPiece && selectedPiece.toUpperCase() === "K") {
            console.log("🎯 King selected:", selectedPiece);
            console.log("🎯 Attempting to move king from", gameState.selectedSquare, "to", square);
            // Calculate the distance the king is moving
            const fromFile = gameState.selectedSquare.charCodeAt(0) - "a".charCodeAt(0);
            const toFile = square.charCodeAt(0) - "a".charCodeAt(0);
            const distance = Math.abs(toFile - fromFile);
            console.log("🎯 King move calculation:", { fromFile, toFile, distance });
            // If king moves exactly 2 squares horizontally, it must be castling
            if (distance === 2) {
                // Determine if it's kingside or queenside castling
                const isKingside = toFile > fromFile; // Moving right = kingside
                // Create the castling move directly
                const isWhite = gameState.currentFEN.includes(" w ");
                const kingFrom = isWhite ? "e1" : "e8";
                const kingTo = isWhite
                    ? isKingside
                        ? "g1"
                        : "c1"
                    : isKingside
                        ? "g8"
                        : "c8";
                const rookFrom = isWhite
                    ? isKingside
                        ? "h1"
                        : "a1"
                    : isKingside
                        ? "h8"
                        : "a8";
                const rookTo = isWhite
                    ? isKingside
                        ? "f1"
                        : "d1"
                    : isKingside
                        ? "f8"
                        : "d8";
                const castlingMove = {
                    from: kingFrom,
                    to: kingTo,
                    piece: isWhite ? "K" : "k",
                    special: "castling",
                    rookFrom: rookFrom,
                    rookTo: rookTo,
                };
                console.log("🎯 Castling move created:", castlingMove);
                makeCastlingMoveDirect(castlingMove, gameState, dom);
                return;
            }
        }
        // Check if this is a valid move
        if (gameState.validMoves.includes(square)) {
            // Valid move - make the move
            makeMove(gameState.selectedSquare, square, gameState, dom);
        }
        else {
            // Click different square - select new piece
            const piece = getPieceAtSquareFromFEN(square, gameState.currentFEN);
            if (piece && isPieceOfCurrentPlayer(piece, gameState.currentFEN)) {
                gameState.selectedSquare = square;
                gameState.validMoves = findValidMovesForPiece(square, piece, gameState.currentFEN);
                highlightSquare(square);
                highlightValidMoves(gameState.validMoves);
            }
            else {
                clearSelection();
            }
        }
    }
}
// Make a move
export function makeMove(fromSquare, toSquare, gameState, dom) {
    const fromPiece = getPieceAtSquareFromFEN(fromSquare, gameState.currentFEN);
    const move = {
        from: fromSquare,
        to: toSquare,
        piece: fromPiece,
    };
    // Store the previous FEN before making the move
    const previousFEN = gameState.currentFEN;
    // Apply move to FEN
    const newFEN = applyMoveToFEN(gameState.currentFEN, move);
    gameState.currentFEN = newFEN;
    // Track position history for undo functionality
    gameState.positionHistory.push(newFEN);
    // Get available moves for the current position
    const availableMoves = gameState.positionMap.get(gameState.currentFEN);
    // Check if this move was correct by looking at the previous position's available moves
    const previousAvailableMoves = gameState.positionMap.get(previousFEN);
    // Create proper SAN notation for the move
    const chessMove = {
        from: fromSquare,
        to: toSquare,
        piece: fromPiece,
    };
    // Get the current notation preference
    const notationToggle = document.getElementById("practice-notation-toggle");
    const pieceFormat = notationToggle?.value === "unicode" ? "unicode" : "english";
    const moveNotation = moveToNotation(chessMove, "short", pieceFormat, previousFEN);
    const normalizedMoveNotation = `${fromSquare}${toSquare}`;
    // If there are no previous available moves, this is the initial position
    // In this case, we need to check if the move leads to a valid position
    let wasCorrectMove = false;
    // For the initial position, we need to check if the move is in the available moves
    // For subsequent positions, we check against the previous position's available moves
    if (!previousAvailableMoves || previousAvailableMoves.length === 0) {
        // This is the initial position - check if the move is in the available moves
        wasCorrectMove = !!(availableMoves &&
            availableMoves.some((move) => {
                // Convert move to from-to format for comparison
                if (move.match(/^[NBRQKP][a-h][1-8][a-h][1-8]$/)) {
                    // Format: "Ng1f3" - extract just the squares
                    const fromTo = move.substring(1, 3) + move.substring(3, 5);
                    return fromTo === normalizedMoveNotation;
                }
                else if (move.match(/^[a-h][1-8][a-h][1-8]$/)) {
                    // Format: "g1f3" - already in the right format
                    return move === normalizedMoveNotation;
                }
                return false;
            }));
    }
    else {
        // Check if this move matches any of the available moves from the previous position
        wasCorrectMove = previousAvailableMoves.some((move) => {
            // Check if this move matches any of the available moves
            // We need to handle different move formats
            if (move.includes(".")) {
                // Format: "1. Ng1f3 g8f6" - extract the moves after the move number
                const moveParts = move.split(" ");
                const actualMoves = moveParts.slice(1); // Skip the move number
                return actualMoves.some((actualMove) => {
                    // Convert actualMove to from-to format for comparison
                    if (actualMove.match(/^[NBRQKP][a-h][1-8][a-h][1-8]$/)) {
                        // Format: "Ng1f3" - extract just the squares
                        const fromTo = actualMove.substring(1, 3) + actualMove.substring(3, 5);
                        return fromTo === normalizedMoveNotation;
                    }
                    else if (actualMove.match(/^[a-h][1-8][a-h][1-8]$/)) {
                        // Format: "g1f3" - already in the right format
                        return actualMove === normalizedMoveNotation;
                    }
                    return false;
                });
            }
            else if (move.match(/^[NBRQKP][a-h][1-8][a-h][1-8]$/)) {
                // Format: "Ng1f3" - extract just the squares
                const fromTo = move.substring(1, 3) + move.substring(3, 5);
                return fromTo === normalizedMoveNotation;
            }
            else if (move.match(/^[a-h][1-8][a-h][1-8]$/)) {
                // Format: "g1f3" - already in the right format
                return move === normalizedMoveNotation;
            }
            return false;
        });
    }
    if (wasCorrectMove) {
        // This was a correct move
        gameState.statistics.correctMoves++;
        gameState.statistics.totalMoves++;
        // Increment human moves counter
        gameState.currentDepth++;
        // Track move in game state history
        const isWhite = gameState.moveHistory.length % 2 === 0;
        gameState.moveHistory.push({
            notation: moveNotation,
            isCorrect: true,
            isWhite,
        });
        showSuccessToast("Correct move!");
        addMoveToHistory(dom.moveHistory, moveNotation, true);
        // Re-render the board with the new FEN
        renderBoard(gameState.currentFEN);
        // Highlight the last move
        highlightLastMove(fromSquare, toSquare);
        // Clear selection (but keep last move highlights)
        clearBoardSelectionWithoutLastMove();
        gameState.selectedSquare = null;
        gameState.validMoves = [];
        // Clear user arrows after move
        clearAllArrows();
        // Update top moves panel for the new current position
        updateTopMovesPanelIfPresent(gameState, dom, undefined, true);
        // Check if we've reached the max human moves
        if (gameState.currentDepth >= gameState.maxDepth) {
            // Max human moves reached! Trigger confetti celebration
            triggerRainbowBurst();
            showSuccessToast(`Max human moves (${gameState.maxDepth}) reached! Great job!`);
            gameState.isPracticeActive = false;
        }
        else if (availableMoves && availableMoves.length > 0) {
            console.log("Available next moves:", availableMoves);
            // Computer's turn
            gameState.isHumanTurn = false;
            setTimeout(() => {
                makeComputerMove(gameState, dom);
            }, 500);
        }
        else {
            // Line completed! Trigger rainbow burst celebration
            triggerRainbowBurst();
            // Check if there's a pinned position to restart from
            if (gameState.pinnedPosition) {
                showInfoToast("Position completed! You can restart from pinned position or continue to next line.");
                // Don't set isPracticeActive to false yet - let user choose
            }
            else {
                showInfoToast("Position completed!");
                gameState.isPracticeActive = false;
            }
        }
    }
    else {
        // This was an incorrect move
        gameState.statistics.totalMoves++;
        // If metadata is available and the attempted move is in top-5, show delta vs best
        const attemptedLong = `${fromSquare}${toSquare}`;
        const topList = gameState.positionTopMoves?.get(previousFEN) || [];
        const best = topList[0];
        const found = topList.find((m) => m.move === attemptedLong);
        if (best && found) {
            const bestScore = best.score;
            const moveScore = found.score;
            const deltaCp = moveScore - bestScore;
            const deltaStr = Math.abs(deltaCp) >= 100
                ? `${Math.round(deltaCp / 100)}`
                : (deltaCp / 100).toFixed(1);
            const sign = deltaCp > 0 ? "+" : "";
            showErrorToast(`Incorrect move. It was a top-5 choice, but ${sign}${deltaStr} vs best (${best.move}).`);
            // Highlight the matching score chip in tomato
            const panel = getElementByIdOrThrow("practice-top-moves");
            const chip = panel.querySelector(`.practice-score-chip[data-move="${attemptedLong}"]`);
            if (chip) {
                chip.classList.add("mistake-highlight");
                // setTimeout(() => chip.classList.remove("mistake-highlight"), 1500);
            }
        }
        else {
            showErrorToast("Incorrect move! Try again.");
        }
        // Add the incorrect move to the attempted moves section
        addMoveToHistory(dom.moveHistory, moveNotation, false);
        // Revert the move by restoring the previous FEN
        gameState.currentFEN = previousFEN;
        // Re-render the board with the original FEN
        renderBoard(gameState.currentFEN);
        // Clear selection and allow retry (but keep last move highlights)
        clearBoardSelectionWithoutLastMove();
        gameState.selectedSquare = null;
        gameState.validMoves = [];
        // Keep it human's turn for retry
        gameState.isHumanTurn = true;
    }
    updateStatistics(dom, gameState);
}
// Make castling move
function makeCastlingMoveDirect(castlingMove, gameState, dom) {
    console.log("🎯 Direct castling triggered:", castlingMove);
    console.log("🎯 Current FEN:", gameState.currentFEN);
    const previousFEN = gameState.currentFEN;
    const newFEN = applyMoveToFEN(gameState.currentFEN, castlingMove);
    console.log("🎯 New FEN after castling:", newFEN);
    gameState.currentFEN = newFEN;
    // Track position history for undo functionality
    gameState.positionHistory.push(newFEN);
    // Get available moves for the current position
    const availableMoves = gameState.positionMap.get(gameState.currentFEN);
    // Always treat castling as correct (no validation needed)
    // This was a correct move
    gameState.statistics.correctMoves++;
    gameState.statistics.totalMoves++;
    // Increment human moves counter
    gameState.currentDepth++;
    // Create proper SAN notation for the castling move
    const notationToggle = document.getElementById("practice-notation-toggle");
    const pieceFormat = notationToggle?.value === "unicode" ? "unicode" : "english";
    const castlingNotation = moveToNotation(castlingMove, "short", pieceFormat, previousFEN);
    // Track move in game state history
    const isWhite = gameState.moveHistory.length % 2 === 0;
    gameState.moveHistory.push({
        notation: castlingNotation,
        isCorrect: true,
        isWhite,
    });
    showSuccessToast("Correct move!");
    addMoveToHistory(dom.moveHistory, castlingNotation, true);
    // Re-render the board with the new FEN
    renderBoard(gameState.currentFEN);
    // Highlight the last move (castling)
    highlightLastMove(castlingMove.from, castlingMove.to);
    // Clear selection and right-click selections (but keep last move highlights)
    clearBoardSelectionWithoutLastMove();
    gameState.selectedSquare = null;
    gameState.validMoves = [];
    // Clear user arrows after castling move
    clearAllArrows();
    // Check if we've reached the max depth
    if (gameState.currentDepth >= gameState.maxDepth) {
        // Max depth reached! Trigger confetti celebration
        triggerRainbowBurst();
        showSuccessToast(`Max depth (${gameState.maxDepth}) reached! Great job!`);
        gameState.isPracticeActive = false;
    }
    else if (availableMoves && availableMoves.length > 0) {
        console.log("Available next moves:", availableMoves);
        // Computer's turn
        gameState.isHumanTurn = false;
        setTimeout(() => {
            makeComputerMove(gameState, dom);
        }, 500);
    }
    else {
        // Line completed! Trigger rainbow burst celebration
        triggerRainbowBurst();
        // Check if there's a pinned position to restart from
        if (gameState.pinnedPosition) {
            showInfoToast("Position completed! You can restart from pinned position or continue to next line.");
            // Don't set isPracticeActive to false yet - let user choose
        }
        else {
            showInfoToast("Position completed!");
            gameState.isPracticeActive = false;
        }
    }
    updateStatistics(dom, gameState);
}
// Keep for future UI modes where SAN castling entry is used
export function makeCastlingMove(castlingNotation, gameState, dom) {
    console.log("🎯 Castling triggered:", castlingNotation);
    console.log("🎯 Current FEN:", gameState.currentFEN);
    // previous FEN is not needed for correctness feedback here
    const parsedMove = parseMove(castlingNotation, gameState.currentFEN);
    console.log("🎯 Parsed move:", parsedMove);
    if (parsedMove) {
        const newFEN = applyMoveToFEN(gameState.currentFEN, parsedMove);
        console.log("🎯 New FEN after castling:", newFEN);
        gameState.currentFEN = newFEN;
        // Track position history for undo functionality
        gameState.positionHistory.push(newFEN);
        // Get available moves for the current position
        const availableMoves = gameState.positionMap.get(gameState.currentFEN);
        // Always treat castling as correct (no validation needed)
        // This was a correct move
        gameState.statistics.correctMoves++;
        gameState.statistics.totalMoves++;
        // Increment human moves counter
        gameState.currentDepth++;
        // Track move in game state history
        const isWhite = gameState.moveHistory.length % 2 === 0;
        gameState.moveHistory.push({
            notation: castlingNotation,
            isCorrect: true,
            isWhite,
        });
        showSuccessToast("Correct move!");
        addMoveToHistory(dom.moveHistory, castlingNotation, true);
        // Re-render the board with the new FEN
        renderBoard(gameState.currentFEN);
        // Highlight the last move (castling)
        if (castlingNotation === "O-O") {
            // Kingside castling
            const fromSquare = gameState.currentFEN.includes(" w ") ? "e1" : "e8";
            const toSquare = gameState.currentFEN.includes(" w ") ? "g1" : "g8";
            highlightLastMove(fromSquare, toSquare);
        }
        else if (castlingNotation === "O-O-O") {
            // Queenside castling
            const fromSquare = gameState.currentFEN.includes(" w ") ? "e1" : "e8";
            const toSquare = gameState.currentFEN.includes(" w ") ? "c1" : "c8";
            highlightLastMove(fromSquare, toSquare);
        }
        // Clear selection and right-click selections (but keep last move highlights)
        clearBoardSelectionWithoutLastMove();
        gameState.selectedSquare = null;
        gameState.validMoves = [];
        // Clear user arrows after castling move
        clearAllArrows();
        // Check if we've reached the max depth
        if (gameState.currentDepth >= gameState.maxDepth) {
            // Max depth reached! Trigger confetti celebration
            triggerRainbowBurst();
            showSuccessToast(`Max depth (${gameState.maxDepth}) reached! Great job!`);
            gameState.isPracticeActive = false;
        }
        else if (availableMoves && availableMoves.length > 0) {
            console.log("Available next moves:", availableMoves);
            // Computer's turn
            gameState.isHumanTurn = false;
            setTimeout(() => {
                makeComputerMove(gameState, dom);
            }, 500);
        }
        else {
            // Line completed! Trigger rainbow burst celebration
            triggerRainbowBurst();
            // Check if there's a pinned position to restart from
            if (gameState.pinnedPosition) {
                showInfoToast("Position completed! You can restart from pinned position or continue to next line.");
                // Don't set isPracticeActive to false yet - let user choose
            }
            else {
                showInfoToast("Position completed!");
                gameState.isPracticeActive = false;
            }
        }
        updateStatistics(dom, gameState);
    }
    else {
        showErrorToast("Invalid castling move!");
    }
}
// Make computer move
export function makeComputerMove(gameState, dom) {
    // Get available moves for current position from position map
    const availableMoves = gameState.positionMap.get(gameState.currentFEN);
    if (availableMoves && availableMoves.length > 0) {
        // Select a move based on strategy
        const selectedMove = selectComputerMove(availableMoves, gameState);
        // Extract from-to squares from the selected move
        let fromToSquares;
        if (selectedMove.includes(".")) {
            // Format: "1. Ng1f3 g8f6" - extract the moves after the move number
            const moveParts = selectedMove.split(" ");
            const actualMoves = moveParts.slice(1); // Skip the move number
            fromToSquares = actualMoves.join(" ");
        }
        else if (selectedMove === "O-O" || selectedMove === "O-O-O") {
            // Castling moves - keep as-is
            fromToSquares = selectedMove;
        }
        else if (selectedMove.match(/^[NBRQKP][a-h][1-8][a-h][1-8]$/)) {
            // Format: "Ng1f3" - extract just the squares
            fromToSquares =
                selectedMove.substring(1, 3) + selectedMove.substring(3, 5);
        }
        else if (selectedMove.match(/^[a-h][1-8][a-h][1-8]$/)) {
            // Format: "g1f3" - already in the right format
            fromToSquares = selectedMove;
        }
        else {
            console.warn(`Invalid move format: ${selectedMove}`);
            showErrorToast("Computer move failed");
            gameState.isPracticeActive = false;
            updateStatus(dom, gameState);
            return;
        }
        // Apply the move using the from-to squares or castling notation
        if (fromToSquares === "O-O" || fromToSquares === "O-O-O") {
            // Handle castling moves
            const parsedMove = parseMove(fromToSquares, gameState.currentFEN);
            if (parsedMove) {
                const newFEN = applyMoveToFEN(gameState.currentFEN, parsedMove);
                gameState.currentFEN = newFEN;
                // Track position history for undo functionality
                gameState.positionHistory.push(newFEN);
                // Track move in game state history
                const isWhite = gameState.moveHistory.length % 2 === 0;
                gameState.moveHistory.push({
                    notation: selectedMove,
                    isCorrect: true,
                    isWhite,
                });
                addMoveToHistory(dom.moveHistory, selectedMove, true);
                renderBoard(gameState.currentFEN);
                // Check if we've reached the max depth
                if (gameState.currentDepth >= gameState.maxDepth) {
                    // Max depth reached! Trigger confetti celebration
                    triggerRainbowBurst();
                    showSuccessToast(`Max depth (${gameState.maxDepth}) reached! Great job!`);
                    gameState.isPracticeActive = false;
                }
                else {
                    // Check if there are more moves available for the human
                    const nextAvailableMoves = gameState.positionMap.get(gameState.currentFEN);
                    if (nextAvailableMoves && nextAvailableMoves.length > 0) {
                        console.log("Available next moves:", nextAvailableMoves);
                        gameState.isHumanTurn = true;
                        try {
                            updateTopMovesPanelIfPresent(gameState, dom);
                        }
                        catch { }
                    }
                    else {
                        // Check if there's a pinned position to restart from
                        if (gameState.pinnedPosition) {
                            showInfoToast("Position completed! You can restart from pinned position or continue to next line.");
                            // Don't set isPracticeActive to false yet - let user choose
                        }
                        else {
                            showInfoToast("Position completed!");
                            gameState.isPracticeActive = false;
                        }
                    }
                }
            }
            else {
                console.warn(`Failed to parse castling move: ${fromToSquares}`);
                showErrorToast("Computer move failed");
                gameState.isPracticeActive = false;
            }
        }
        else if (fromToSquares.length === 4 &&
            /^[a-h][1-8][a-h][1-8]$/.test(fromToSquares)) {
            const fromSquare = fromToSquares.substring(0, 2);
            const toSquare = fromToSquares.substring(2, 4);
            const piece = getPieceAtSquareFromFEN(fromSquare, gameState.currentFEN);
            const chessMove = {
                from: fromSquare,
                to: toSquare,
                piece: piece,
            };
            // Apply the move
            const newFEN = applyMoveToFEN(gameState.currentFEN, chessMove);
            gameState.currentFEN = newFEN;
            // Track position history for undo functionality
            gameState.positionHistory.push(newFEN);
            // Convert computer move to proper SAN notation
            const notationToggle = document.getElementById("practice-notation-toggle");
            const pieceFormat = notationToggle?.value === "unicode" ? "unicode" : "english";
            const computerMoveNotation = moveToNotation(chessMove, "short", pieceFormat, gameState.currentFEN);
            // Track move in game state history
            const isWhite = gameState.moveHistory.length % 2 === 0;
            gameState.moveHistory.push({
                notation: computerMoveNotation,
                isCorrect: true,
                isWhite,
            });
            // Record last engine move in long notation for panel highlighting
            gameState.lastEngineMoveLong = fromToSquares;
            addMoveToHistory(dom.moveHistory, computerMoveNotation, true);
            // Re-render the board with the new FEN
            renderBoard(gameState.currentFEN);
            // Highlight the last move (computer move)
            highlightLastMove(fromSquare, toSquare);
            // Update top moves panel to show engine's replies for this new computer-to-move position (or next human-to-move if you prefer)
            updateTopMovesPanelIfPresent(gameState, dom, undefined, true);
            // Check if we've reached the max depth
            if (gameState.currentDepth >= gameState.maxDepth) {
                // Max depth reached! Trigger confetti celebration
                triggerRainbowBurst();
                showSuccessToast(`Max depth (${gameState.maxDepth}) reached! Great job!`);
                gameState.isPracticeActive = false;
            }
            else {
                // Check if there are more moves available for the human
                const nextAvailableMoves = gameState.positionMap.get(gameState.currentFEN);
                if (nextAvailableMoves && nextAvailableMoves.length > 0) {
                    console.log("Available next moves:", nextAvailableMoves);
                    // Human's turn
                    gameState.isHumanTurn = true;
                    updateTopMovesPanelIfPresent(gameState, dom, undefined, true);
                }
                else {
                    // Check if there's a pinned position to restart from
                    if (gameState.pinnedPosition) {
                        showInfoToast("Position completed! You can restart from pinned position or continue to next line.");
                        // Don't set isPracticeActive to false yet - let user choose
                    }
                    else {
                        showInfoToast("Position completed!");
                        gameState.isPracticeActive = false;
                    }
                }
            }
        }
        else {
            console.warn(`Invalid from-to squares: ${fromToSquares}`);
            showErrorToast("Computer move failed");
            gameState.isPracticeActive = false;
        }
    }
    else {
        // No moves available - position is finished
        showInfoToast("Position completed!");
        gameState.isPracticeActive = false;
    }
    updateStatus(dom, gameState);
}
// Local helper to call the panel update from practice.ts without circular import
function updateTopMovesPanelIfPresent(gameState, _dom, _fenOverride, _scoresOnly) {
    const panel = getElementByIdOrThrow("practice-top-moves");
    const meta = gameState.positionTopMoves;
    if (!meta) {
        panel.innerHTML = "<em>No engine metadata loaded</em>";
        return;
    }
    const currentFEN = gameState.currentFEN;
    const prevHumanFEN = gameState.positionHistory.length >= 2
        ? gameState.positionHistory[gameState.positionHistory.length - 2]
        : null;
    const altsList = meta.get(currentFEN) || [];
    const repliesList = gameState.isHumanTurn
        ? prevHumanFEN
            ? meta.get(prevHumanFEN) || []
            : []
        : meta.get(currentFEN) || [];
    const scoreToStr = (cp) => Math.abs(cp) >= 10000 ? (cp > 0 ? "#" : "-#") : (cp / 100).toFixed(2);
    const altsHtml = altsList.length
        ? `<div class="practice-alts">
         <div class="practice-subheading">Scores for top-5 options</div>
         <div class="practice-score-row">${altsList
            .slice(0, 5)
            .map((m) => `<span class=\"practice-score-chip\" data-move=\"${m.move}\">${scoreToStr(m.score)}</span>`)
            .join("")}</div>
       </div>`
        : `<div class="practice-alts"><em>No scores available</em></div>`;
    // Determine FEN context for replies (same logic as list origin)
    const fenForReplies = gameState.isHumanTurn
        ? prevHumanFEN || gameState.currentFEN
        : gameState.currentFEN;
    const notationToggle = document.getElementById("practice-notation-toggle");
    const pieceFormat = notationToggle?.value === "unicode" ? "unicode" : "english";
    const repliesHtml = repliesList.length
        ? `<div class="practice-replies">
         <div class="practice-subheading">Engine replies to your last move</div>
         <div class="practice-replies-row">${repliesList
            .slice(0, 5)
            .map((m) => {
            const s = scoreToStr(m.score);
            const cls = Math.abs(m.score) >= 10000
                ? "score-mate"
                : m.score > 0
                    ? "score-positive"
                    : m.score < 0
                        ? "score-negative"
                        : "score-neutral";
            const isLast = gameState.lastEngineMoveLong &&
                m.move === gameState.lastEngineMoveLong;
            const hi = isLast ? " highlight" : "";
            const from = m.move.substring(0, 2);
            const to = m.move.substring(2, 4);
            // Convert to SAN for display, keep long in title
            let displayMove = m.move;
            const parsed = parseMove(m.move, fenForReplies);
            if (parsed) {
                displayMove = moveToNotation(parsed, "short", pieceFormat, fenForReplies);
            }
            return `<span class=\"practice-reply-chip${hi}\" data-from=\"${from}\" data-to=\"${to}\" title=\"${m.move}\"><span class=\"reply-move\">${displayMove}</span><span class=\"reply-score ${cls}\">${s}</span></span>`;
        })
            .join("")}</div>
       </div>`
        : `<div class="practice-replies"><em>No replies available</em></div>`;
    panel.innerHTML = `${altsHtml}<div style="height:6px"></div>${repliesHtml}`;
    // Hover arrows on reply chips
    const chips = panel.querySelectorAll(".practice-reply-chip");
    chips.forEach((chip) => {
        chip.addEventListener("mouseenter", () => {
            const from = chip.getAttribute("data-from");
            const to = chip.getAttribute("data-to");
            if (!from || !to)
                return;
            const existing = document.querySelector(".practice-arrow-preview");
            if (existing)
                existing.remove();
            const board = document.querySelector(".practice-board");
            const fromEl = document.querySelector(`[data-square="${from}"]`);
            const toEl = document.querySelector(`[data-square="${to}"]`);
            if (!board || !fromEl || !toEl)
                return;
            const br = board.getBoundingClientRect();
            const fr = fromEl.getBoundingClientRect();
            const tr = toEl.getBoundingClientRect();
            const fx = fr.left + fr.width / 2 - br.left;
            const fy = fr.top + fr.height / 2 - br.top;
            const tx = tr.left + tr.width / 2 - br.left;
            const ty = tr.top + tr.height / 2 - br.top;
            const angle = Math.atan2(ty - fy, tx - fx);
            const dist = Math.hypot(tx - fx, ty - fy);
            const preview = document.createElement("div");
            preview.className = "practice-arrow-preview";
            preview.style.left = `${fx}px`;
            preview.style.top = `${fy}px`;
            preview.style.width = `${Math.max(0, dist - 20)}px`;
            preview.style.transform = `rotate(${angle}rad)`;
            preview.style.transformOrigin = "0 50%";
            preview.style.setProperty("--arrow-color", "rgba(0, 123, 255, 0.95)");
            const existing2 = document.querySelector(".practice-arrow-preview");
            if (existing2)
                existing2.remove();
            board.appendChild(preview);
        });
        chip.addEventListener("mouseleave", () => {
            const existing = document.querySelector(".practice-arrow-preview");
            if (existing)
                existing.remove();
        });
    });
}
// Select computer move based on strategy
export function selectComputerMove(availableMoves, gameState) {
    switch (gameState.computerMoveStrategy) {
        case "random":
            return availableMoves[Math.floor(Math.random() * availableMoves.length)];
        case "serial":
            // Always pick the first move (deterministic)
            return availableMoves[0];
        case "adaptive":
            // TODO: Implement adaptive strategy based on player performance
            // For now, just use random
            return availableMoves[Math.floor(Math.random() * availableMoves.length)];
        default:
            return availableMoves[0];
    }
}
// Show hint
export function showHintForCurrentPosition(gameState) {
    if (!gameState.isPracticeActive || !gameState.isHumanTurn)
        return;
    // Get available moves for current position
    const availableMoves = gameState.positionMap.get(gameState.currentFEN);
    if (availableMoves && availableMoves.length > 0) {
        // Show a hint by highlighting the piece to move instead of the move
        const raw = availableMoves[0];
        // If move number present, extract first token after number
        const hintMove = raw.includes(".")
            ? raw.split(/\s+/).slice(1)[0] || raw
            : raw;
        let fromSquare = "";
        if (hintMove === "O-O" || hintMove === "O-O-O") {
            const isWhite = gameState.currentFEN.includes(" w ");
            fromSquare = isWhite ? "e1" : "e8";
        }
        else {
            // Try robust parsing to compute source square
            const parsed = parseMove(hintMove, gameState.currentFEN);
            if (parsed) {
                fromSquare = parsed.from;
            }
            else {
                // Fallback: normalize to long if needed and derive
                const long = hintMove.match(/^[NBRQKP][a-h][1-8][a-h][1-8]$/)
                    ? hintMove.substring(1)
                    : hintMove;
                if (/^[a-h][1-8][a-h][1-8]$/.test(long)) {
                    fromSquare = long.substring(0, 2);
                }
            }
        }
        const fromEl = document.querySelector(`[data-square="${fromSquare}"]`);
        if (fromEl) {
            fromEl.classList.add("hint-piece");
            setTimeout(() => fromEl.classList.remove("hint-piece"), 1500);
        }
        // Do not reveal any coordinates in the hint toast
        showWarningToast("Hint shown");
    }
    else {
        showWarningToast("No moves available for this position");
    }
}
function isPieceOfCurrentPlayer(piece, fen) {
    const isWhiteTurn = fen.includes(" w ");
    const isWhitePiece = piece === piece.toUpperCase();
    return isWhitePiece === isWhiteTurn;
}
function findValidMovesForPiece(square, _piece, _fen) {
    // For now, return all squares as valid moves
    // This is a simplified implementation
    const validMoves = [];
    const files = "abcdefgh";
    const ranks = "12345678";
    for (const file of files) {
        for (const rank of ranks) {
            const targetSquare = file + rank;
            if (targetSquare !== square) {
                validMoves.push(targetSquare);
            }
        }
    }
    return validMoves;
}
function highlightSquare(square) {
    const squareElement = document.querySelector(`[data-square="${square}"]`);
    if (squareElement) {
        squareElement.classList.add("selected");
    }
}
function highlightValidMoves(moves) {
    moves.forEach((square) => {
        const squareElement = document.querySelector(`[data-square="${square}"]`);
        if (squareElement) {
            squareElement.classList.add("valid-move");
        }
    });
}
function clearSelection() {
    clearBoardSelection();
}
//# sourceMappingURL=practice-game.js.map