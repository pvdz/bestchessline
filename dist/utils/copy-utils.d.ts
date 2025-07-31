import { BestLineNode } from "../types.js";
/**
 * Copy and Export Utility Functions
 *
 * Provides functions for copying and exporting tree data.
 */
/**
 * Format a line of moves with move numbers
 * @param moves Array of moves to format
 * @returns Formatted line string
 */
export declare function formatLineWithMoveNumbers(moves: BestLineNode[]): string;
/**
 * Initialize copy button functionality
 */
export declare function initializeCopyButton(): void;
/**
 * Generate all complete lines from the tree
 * @param nodes Array of root nodes to generate lines from
 * @returns String containing all complete lines
 */
export declare function generateAllLines(nodes: BestLineNode[]): string;
