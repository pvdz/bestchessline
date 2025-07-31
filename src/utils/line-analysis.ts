import { BestLineNode, TreeDiggerAnalysis } from "../types.js";
import { applyMoveToFEN } from "./fen-manipulation.js";
import { formatLineWithMoveNumbers } from "./copy-utils.js";
import { moveToNotation } from "./notation-utils.js";

/**
 * Line Analysis Utility Functions
 * 
 * Provides functions for analyzing and formatting chess lines.
 */

/**
 * Get line completion status for a node
 * @param node The node to analyze
 * @param analysis The current analysis
 * @returns HTML string describing the line completion
 */
export function getLineCompletion(
  node: BestLineNode,
  analysis: TreeDiggerAnalysis,
): string {
  const positionAfterMove = applyMoveToFEN(node.fen, node.move);
  const isTransposition = analysis.analyzedPositions.has(positionAfterMove);

  if (isTransposition) {
    // Show incomplete line for transposed positions
    const currentLine = getCompleteLine(node);
    const existingLine = findExistingLine(positionAfterMove, analysis);
    if (existingLine) {
      return `<span class="incomplete-line">→ Incomplete line: ${currentLine} → transposes into: ${existingLine}</span>`;
    }
    return `<span class="incomplete-line">→ Incomplete line: ${currentLine} → position already analyzed</span>`;
  } else {
    // Show the complete line from root to this leaf
    const completeLine = getCompleteLine(node);
    return `<span class="complete-line">→ Complete line: ${completeLine}</span>`;
  }
}

/**
 * Find an existing line that leads to the given position
 * @param targetFen The target FEN position to search for
 * @param analysis The current analysis
 * @returns Formatted line string or null if not found
 */
export function findExistingLine(
  targetFen: string,
  analysis: TreeDiggerAnalysis,
): string | null {
  const searchNode = (
    nodes: BestLineNode[],
    path: BestLineNode[],
  ): string | null => {
    for (const node of nodes) {
      const newPath = [...path, node];
      const nodeFen = applyMoveToFEN(node.fen, node.move);

      if (nodeFen === targetFen) {
        return formatLineWithMoveNumbers(newPath);
      }

      const result = searchNode(node.children, newPath);
      if (result) return result;
    }
    return null;
  };

  return searchNode(analysis.nodes, []);
}

/**
 * Get the complete line from root to the given node
 * @param node The node to get the complete line for
 * @returns Formatted line string
 */
export function getCompleteLine(node: BestLineNode): string {
  const moves: BestLineNode[] = [];
  let current: BestLineNode | undefined = node;

  // Walk up the tree to collect moves
  while (current) {
    moves.unshift(current);
    current = current.parent;
  }

  // Format the line with proper chess notation
  let formattedLine = "";

  for (let i = 0; i < moves.length; i++) {
    const moveNode = moves[i];
    const moveText = moveToNotation(moveNode.move);

    if (moveNode.isWhiteMove) {
      // White move - start new move number
      if (i > 0) formattedLine += " ";
      formattedLine += `${moveNode.moveNumber}. ${moveText}`;
    } else {
      // Black move - add to current move number
      formattedLine += ` ${moveText}`;
    }
  }

  return formattedLine;
} 