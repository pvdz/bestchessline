import { TreeDiggerNode, TreeDiggerAnalysis } from "../types.js";
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
export declare function getLineCompletion(node: TreeDiggerNode, analysis: TreeDiggerAnalysis): string;
/**
 * Find an existing line that leads to the given position
 * @param targetFen The target FEN position to search for
 * @param analysis The current analysis
 * @returns Formatted line string or null if not found
 */
export declare function findExistingLine(targetFen: string, analysis: TreeDiggerAnalysis): string | null;
/**
 * Get the complete line from root to the given node
 * @param node The node to get the complete line for
 * @returns Formatted line string
 */
export declare function getCompleteLine(node: TreeDiggerNode): string;
