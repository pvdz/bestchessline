import {
  LineFisherState,
  LineFisherProgress,
  LineFisherResult,
  LineFisherConfig,
} from "../line_fisher.js";
/**
 * Generate computation formula for Line Fisher
 * Creates a human-readable formula showing how nodes and lines are calculated
 */
export declare const generateLineFisherFormula: (config: LineFisherConfig) => {
  nodeFormula: string;
  lineFormula: string;
};
/**
 * Update Line Fisher results panel
 * TODO: Display current analysis results in the results panel
 */
export declare const updateLineFisherResultsPanel: (
  _state: LineFisherState,
) => void;
export declare const updateLineFisherConfigDisplay: (
  state: LineFisherState,
) => Promise<void>;
/**
 * Update Line Fisher progress display
 * Show current analysis progress with progress bar
 */
export declare const updateLineFisherProgressDisplay: (
  progress: LineFisherProgress,
) => void;
/**
 * Update Line Fisher explored lines display
 * Show all explored lines with their moves, scores, and completion status
 */
export declare const updateLineFisherExploredLines: (
  results: LineFisherResult[],
) => void;
/**
 * Create Line Fisher configuration HTML structure
 * Create configuration HTML structure with layout for settings display,
 * statistics display, and board position display
 */
export declare const createLineFisherConfigHTML: () => string;
/**
 * Create Line Fisher lines display HTML structure
 * Create line display HTML structure with line index column, move notation column,
 * score column, delta column, and responses column
 */
export declare const createLineFisherLinesHTML: () => string;
/**
 * Render chess board in the Line Fisher config section
 * Similar to tree digger board rendering
 */
export declare const renderLineFisherBoard: (fen: string) => void;
