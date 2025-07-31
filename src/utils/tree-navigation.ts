import { BestLineNode, ChessMove } from "../types.js";
import { applyMoveToFEN } from "./fen-manipulation.js";
import * as Board from "../chess-board.js";
import { getAppState, clearBranch, updateAppState } from "../main.js";
import { updateMoveList } from "./game-navigation.js";

/**
 * Tree Navigation Utility Functions
 *
 * Provides functions for navigating and manipulating tree structures.
 */

/**
 * Get the path from root to a specific node
 * @param targetNode The node to find the path to
 * @param rootNodes Array of root nodes to search in
 * @returns Array of nodes representing the path from root to target
 */
export function getPathToNode(
  targetNode: BestLineNode,
  rootNodes: BestLineNode[],
): BestLineNode[] {
  const findPath = (
    nodes: BestLineNode[],
    path: BestLineNode[] = [],
  ): BestLineNode[] | null => {
    for (const node of nodes) {
      const currentPath = [...path, node];

      if (node === targetNode) {
        return currentPath;
      }

      if (node.children.length > 0) {
        const result = findPath(node.children, currentPath);
        if (result) {
          return result;
        }
      }
    }
    return null;
  };

  return findPath(rootNodes) || [];
}

/**
 * Apply a sequence of moves to the board, replacing the current game
 * @param moves Array of BestLineNode moves to apply
 */
export function applyMovesToBoard(moves: BestLineNode[]): void {
  // Clear any existing branch
  clearBranch();

  // Convert BestLineNode moves to ChessMove array
  const chessMoves: ChessMove[] = moves.map((node) => node.move);

  // Get the initial FEN from the first node, or use current board FEN
  const initialFEN = moves.length > 0 ? moves[0].fen : Board.getFEN();

  // Replace the entire game with these moves
  updateAppState({
    moves: chessMoves,
    initialFEN: initialFEN,
    currentMoveIndex: chessMoves.length - 1, // Set to last move
    isInBranch: false,
    branchMoves: [],
    branchStartIndex: -1,
  });

  // Update the board to show the final position
  if (moves.length > 0) {
    const lastNode = moves[moves.length - 1];
    const finalFen = applyMoveToFEN(lastNode.fen, lastNode.move);
    Board.setPosition(finalFen);
  }

  // Update the UI
  updateMoveList();
}
