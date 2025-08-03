import type { LineFisherState, LineFisherConfig } from "../line_fisher.js";
/**
 * Get current Line Fisher state
 */
export declare const getLineFisherState: () => LineFisherState;
/**
 * Update Line Fisher state
 */
export declare const updateLineFisherState: (
  newState: Partial<LineFisherState>,
) => void;
/**
 * Get Line Fisher configuration
 */
export declare const getLineFisherConfig: () => LineFisherConfig;
/**
 * Update Line Fisher configuration
 */
export declare const updateLineFisherConfig: (
  updates: Partial<LineFisherConfig>,
) => void;
/**
 * Initialize Line Fisher progress
 */
export declare const initializeLineFisherProgress: (
  state: LineFisherState,
) => void;
/**
 * Update Line Fisher progress
 */
export declare const updateLineFisherProgress: (state: LineFisherState) => void;
/**
 * Save Line Fisher progress
 */
export declare const saveLineFisherProgress: (state: LineFisherState) => void;
/**
 * Resume Line Fisher analysis from saved state
 */
export declare const resumeLineFisherAnalysis: (state: LineFisherState) => void;
/**
 * Handle Line Fisher interruption
 */
export declare const handleLineFisherInterruption: (
  state: LineFisherState,
) => void;
