import { parseFEN, coordsToSquare } from "./fen-utils.js";
import { createPieceNotation, getColorFromNotation } from "../types.js";
/**
 * Board Rendering Utility Functions
 *
 * Provides functions for rendering chess boards in various contexts.
 */
/**
 * Render a small board for the progress panel
 */
export function renderProgressBoard(boardElement, fen) {
    try {
        const position = parseFEN(fen);
        let html = "";
        // Render board from white's perspective (bottom to top)
        for (let rank = 0; rank <= 7; rank++) {
            for (let file = 0; file < 8; file++) {
                const square = coordsToSquare(rank, file);
                const piece = position.board[rank][file];
                const isLight = (rank + file) % 2 === 0;
                const squareClass = isLight ? "light" : "dark";
                html += `<div class="square ${squareClass}" data-square="${square}">`;
                if (piece) {
                    const pieceNotation = createPieceNotation(piece);
                    const color = getColorFromNotation(pieceNotation);
                    const pieceClass = color === "w" ? "white" : "black";
                    html += `<div class="piece ${pieceClass}">${piece}</div>`;
                }
                html += "</div>";
            }
        }
        boardElement.innerHTML = html;
    }
    catch (error) {
        console.error("Error rendering progress board:", error);
        boardElement.innerHTML =
            '<div style="padding: 20px; text-align: center; color: #666;">Invalid position</div>';
    }
}
//# sourceMappingURL=board-rendering.js.map