import type { FishState } from "./types.js";
export declare function getCurrentFishState(): FishState;
/**
 * Import fish state from clipboard
 * Import fish analysis state from clipboard JSON format.
 * Parse JSON state, validate format, and load into current state
 */
export declare const importFishState: (importedState: any) => boolean;
export declare const importFishStateFromClipboard: () => Promise<void>;
