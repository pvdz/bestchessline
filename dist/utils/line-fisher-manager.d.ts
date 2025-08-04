import type { LineFisherState } from "../line_fisher.js";
/**
 * Start Line Fisher analysis from manager
 * Initialize analysis state, validate configuration, begin analysis process.
 * Get configuration from UI, validate configuration, initialize analysis state,
 * begin recursive analysis, and update button states
 */
export declare const startLineFisherAnalysisFromManager: () => Promise<void>;
/**
 * Stop Line Fisher analysis from manager
 * Halt analysis process and update UI state.
 * Halt analysis process, preserve partial results, update button states, and update status
 */
export declare const stopLineFisherAnalysisFromManager: () => Promise<void>;
/**
 * Reset Line Fisher analysis from manager
 * Clear all results and reset to initial state.
 * Clear all results, reset progress, clear UI, and reset state
 */
export declare const resetLineFisherAnalysisFromManager: () => Promise<void>;
/**
 * Continue Line Fisher analysis from manager
 * Resume analysis from where it left off.
 * Resume analysis from saved state, restore progress, and continue tree building
 */
export declare const continueLineFisherAnalysisFromManager: () => Promise<void>;
/**
 * Copy Line Fisher state to clipboard
 * Export current analysis state to clipboard.
 * Serialize current state, copy to clipboard, and show success notification
 */
export declare const copyLineFisherStateToClipboardFromManager: () => Promise<void>;
/**
 * Export Line Fisher state to file
 * Export current analysis state to JSON file.
 * Serialize state to JSON, trigger file download, and include timestamp in filename
 */
export declare const exportLineFisherStateFromManager: () => Promise<void>;
/**
 * Import Line Fisher state from manager
 * Import analysis state from file.
 * Handle file input, parse JSON state, validate state format, and load state into UI
 */
export declare const importLineFisherStateFromManager: () => Promise<void>;
/**
 * Update Line Fisher button states
 * Enable/disable buttons based on analysis state, update visual feedback,
 * and handle button state transitions
 */
export declare const updateLineFisherButtonStates: () => void;
/**
 * Update Line Fisher state information display
 * Show current state information in the UI.
 * Show current state information in the UI
 */
export declare const updateLineFisherStateInfo: (
  state: LineFisherState,
) => Promise<void>;
/**
 * Handle Line Fisher state file input
 * Process file input for state import.
 * Process file input event, validate file format, load state data, and update UI
 */
export declare const handleLineFisherStateFileInput: (
  event: Event,
) => Promise<void>;
/**
 * Recover Line Fisher from crash
 * Reset UI state after analysis crash.
 * Reset UI state after crash, clear analysis state, update button states, and show recovery message
 */
export declare const recoverLineFisherFromCrash: () => Promise<void>;
/**
 * Enhanced error handling for Line Fisher operations
 * Better error messages, graceful failure recovery, and user-friendly notifications
 */
export declare const handleLineFisherError: (
  error: Error,
  context: string,
) => void;
/**
 * Graceful recovery from Line Fisher errors
 */
export declare const recoverFromLineFisherError: () => Promise<void>;
/**
 * Validate Line Fisher state before operations
 */
export declare const validateLineFisherState: (state: LineFisherState) => {
  isValid: boolean;
  errors: string[];
};
