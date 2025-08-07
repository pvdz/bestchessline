import { FishState, FishLine, LineFisherConfig } from "./types.js";
/**
 * Update fish config display in UI
 * Non-blocking UI update with error handling
 */
export declare function updateFishConfigDisplay(config: LineFisherConfig): void;
/**
 * Update fish status display
 * Non-blocking UI update with error handling
 */
export declare function updateFishStatus(message: string): void;
/**
 * Update fish progress display
 * Non-blocking UI update with error handling
 */
export declare function updateFishProgress(state: FishState): void;
/**
 * Update fish root score display
 * Non-blocking UI update with error handling
 */
export declare function updateFishRootScore(score: number): void;
/**
 * Update an existing line element's content without re-rendering
 */
export declare const updateLineElement: (
  lineElement: HTMLElement,
  line: FishLine,
) => void;
/**
 * Update Line Fisher button states
 * Enable/disable buttons based on analysis state, update visual feedback,
 * and handle button state transitions
 */
export declare const updateLineFisherButtonStates: (
  isAnalyzing: boolean,
  isFishing: boolean,
) => void;
