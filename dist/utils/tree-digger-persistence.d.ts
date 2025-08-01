import type {
  TreeDiggerAnalysis,
  TreeDiggerState,
  TreeDiggerStateExport,
  TreeDiggerStateValidation,
} from "../types.js";
/**
 * Serialize tree digger state for export
 */
export declare const serializeTreeDiggerState: (
  analysis: TreeDiggerAnalysis | null,
  state: TreeDiggerState,
) => TreeDiggerStateExport;
/**
 * Validate imported tree digger state
 */
export declare const validateTreeDiggerState: (
  stateExport: TreeDiggerStateExport,
  currentBoardPosition: string,
  currentConfig: TreeDiggerAnalysis["config"],
) => TreeDiggerStateValidation;
/**
 * Deserialize tree digger state from import
 */
export declare const deserializeTreeDiggerState: (
  stateExport: TreeDiggerStateExport,
) => {
  analysis: TreeDiggerAnalysis;
  state: TreeDiggerState;
};
/**
 * Export tree digger state to JSON file
 */
export declare const exportTreeDiggerState: (
  analysis: TreeDiggerAnalysis | null,
  state: TreeDiggerState,
) => void;
/**
 * Copy tree digger state to clipboard as JSON
 */
export declare const copyTreeDiggerStateToClipboard: (
  analysis: TreeDiggerAnalysis | null,
  state: TreeDiggerState,
) => Promise<void>;
/**
 * Import tree digger state from JSON file
 */
export declare const importTreeDiggerState: (
  file: File,
) => Promise<TreeDiggerStateExport>;
/**
 * Import tree digger state from clipboard
 */
export declare const importTreeDiggerStateFromClipboard: () => Promise<TreeDiggerStateExport>;
/**
 * Get state file size in a human-readable format
 */
export declare const formatStateFileSize: (bytes: number) => string;
/**
 * Estimate state file size for current analysis
 */
export declare const estimateStateFileSize: (
  analysis: TreeDiggerAnalysis | null,
) => number;
