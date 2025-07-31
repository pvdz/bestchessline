import { formatScoreWithMateIn } from "./formatting-utils.js";
import { BestLineNode } from "../types.js";

/**
 * Node Utility Functions
 * 
 * Provides functions for formatting and manipulating tree nodes.
 */

/**
 * Format a node's score with delta information
 * @param node The node to format the score for
 * @returns Formatted score string with delta information
 */
export function formatNodeScore(node: BestLineNode): string {
  if (node.needsEvaluation) {
    return " (?)";
  }

  if (node.score === undefined || node.score === null) {
    return "";
  }

  const currentScore = formatScoreWithMateIn(node.score, node.mateIn ?? 0);

  // Calculate delta from parent position
  let deltaText = "";
  if (node.parent) {
    const parentScore = node.parent.score;
    if (parentScore !== undefined && parentScore !== null) {
      const delta = node.score - parentScore;

      if (Math.abs(delta) < 0.01) {
        // Equal position (within 0.01 centipawns)
        deltaText = " <span class='delta-equal'>(≈)</span>";
      } else if (delta > 0) {
        // Improved position
        const deltaFormatted = formatScoreWithMateIn(delta, 0);
        deltaText = ` <span class='delta-improved'>(▲${deltaFormatted})</span>`;
      } else {
        // Regressed position
        const deltaFormatted = formatScoreWithMateIn(Math.abs(delta), 0);
        deltaText = ` <span class='delta-regressed'>(▼${deltaFormatted})</span>`;
      }
    }
  }

  return ` (${currentScore}${deltaText})`;
} 