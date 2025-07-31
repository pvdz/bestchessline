/**
 * UI Getter Functions
 *
 * Provides functions to retrieve values from UI elements and controls.
 * These functions handle both input values and display span values with fallbacks.
 */
/**
 * Get depth scaler from UI (1-15)
 */
export declare function getDepthScaler(): number;
/**
 * Get black moves count from UI
 */
export declare function getResponderMovesCount(): number;
/**
 * Get thread count from UI
 */
export declare function getThreadCount(): number;
/**
 * Get initiator moves from UI inputs
 */
export declare function getInitiatorMoves(): string[];
/**
 * Get first reply override from UI (0 = use default)
 */
export declare function getFirstReplyOverride(): number;
/**
 * Get second reply override from UI (0 = use default)
 */
export declare function getSecondReplyOverride(): number;
