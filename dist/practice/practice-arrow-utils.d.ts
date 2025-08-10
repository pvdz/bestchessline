/**
 * Practice Arrow Utility Functions
 *
 * Provides functions for managing user-drawn arrows on the practice chess board.
 * Supports right-click to draw arrows and automatic cleanup after moves.
 */
/**
 * Initialize arrow drawing functionality
 */
export declare function initializeArrowDrawing(): void;
/**
 * Remove all user arrows
 */
export declare function clearAllArrows(): void;
/**
 * Clean up arrow drawing event listeners
 */
export declare function cleanupArrowDrawing(): void;
/**
 * Check if arrow drawing is currently active
 */
export declare function isArrowDrawingActive(): boolean;
/**
 * Check if a right-click should be handled by arrow drawing
 * This prevents square selection when starting arrow drawing
 */
export declare function shouldHandleArrowRightClick(event: MouseEvent): boolean;
export declare function isArrowDrawing(): boolean;
export declare function consumeRecentArrowCompleted(): boolean;
