/**
 * Arrow Utility Functions
 *
 * Provides functions for managing move arrows on the chess board.
 */
/**
 * Hide move arrow
 * @param arrowId Optional specific arrow ID to hide, or hide all if not provided
 */
export declare function hideMoveArrow(arrowId?: string): void;
/**
 * Position arrow between squares
 * @param arrow The arrow element to position
 * @param from The starting square
 * @param to The ending square
 */
export declare function positionArrow(
  arrow: HTMLElement,
  from: string,
  to: string,
): void;
/**
 * Get the arrow elements map (for internal use)
 */
export declare function getArrowElements(): Map<string, HTMLElement>;
/**
 * Set the arrow elements map (for internal use)
 */
export declare function setArrowElements(
  elements: Map<string, HTMLElement>,
): void;
