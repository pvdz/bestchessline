import type { LineFisherConfig } from "../line_fisher.js";
/**
 * Get Line Fisher initiator moves from UI
 * Parse space-separated moves from text input, validate each move is a valid chess move,
 * handle empty input with default values, and return array of move strings
 */
export declare const getLineFisherInitiatorMoves: () => string[];
/**
 * Get Line Fisher responder move counts from UI
 * Parse space-separated numbers from text input, validate each number is positive integer,
 * handle empty input with default values, and return array of integers
 */
export declare const getLineFisherResponderMoveCounts: () => number[];
/**
 * Get Line Fisher depth from UI
 * TODO: Read depth from slider input
 */
export declare const getLineFisherDepth: () => number;
/**
 * Get Line Fisher threads from UI
 * TODO: Read threads from slider input
 */
export declare const getLineFisherThreads: () => number;
/**
 * Get Line Fisher default responder count from UI
 * Read default responder count from slider input
 */
export declare const getLineFisherDefaultResponderCount: () => number;
/**
 * Get Line Fisher configuration from UI
 * TODO: Read all configuration values from UI elements
 */
export declare const getLineFisherConfigFromUI: () => LineFisherConfig;
/**
 * Update Line Fisher UI from configuration
 * TODO: Update UI elements with configuration values
 */
export declare const updateLineFisherUIFromConfig: (
  config: LineFisherConfig,
) => void;
/**
 * Initialize Line Fisher UI controls
 * Set up event listeners and initialize UI state
 */
export declare const initializeLineFisherUIControls: () => void;
/**
 * Update Line Fisher slider value displays
 * TODO: Update slider value labels
 */
export declare const updateLineFisherSliderValues: () => void;
/**
 * Validate Line Fisher configuration
 * Check initiator moves are valid chess moves, check responder counts are positive integers,
 * check depth is between 1 and 15, check threads is between 1 and 16, and return boolean and error message
 */
export declare const validateLineFisherConfig: (config: LineFisherConfig) => {
  isValid: boolean;
  errorMessage: string;
};
/**
 * Show Line Fisher configuration error
 * Display error messages to user using toast notifications or status updates
 */
export declare const showLineFisherConfigError: (message: string) => void;
/**
 * Add helpful tooltips to Line Fisher UI elements
 * Explain configuration options, show usage hints, and provide error explanations
 */
export declare const addLineFisherTooltips: () => void;
/**
 * Show usage hints for Line Fisher
 */
export declare const showLineFisherUsageHints: () => void;
/**
 * Provide detailed error explanations
 */
export declare const showLineFisherErrorExplanation: (error: string) => void;
