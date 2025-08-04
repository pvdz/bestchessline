import { querySelectorOrThrow } from "./dom-helpers.js";
/**
 * Arrow Utility Functions
 *
 * Provides functions for managing move arrows on the chess board.
 */
// Global map to track arrow elements
let arrowElements = new Map();
/**
 * Hide move arrow
 * @param arrowId Optional specific arrow ID to hide, or hide all if not provided
 */
export function hideMoveArrow(arrowId) {
  if (arrowId) {
    // Hide specific arrow and its score label
    const arrow = arrowElements.get(arrowId);
    if (arrow) {
      arrow.remove();
      arrowElements.delete(arrowId);
    }
    const scoreLabel = arrowElements.get(`${arrowId}-score`);
    if (scoreLabel) {
      scoreLabel.remove();
      arrowElements.delete(`${arrowId}-score`);
    }
  } else {
    // Hide all arrows and score labels
    const elementsToRemove = Array.from(arrowElements.values());
    elementsToRemove.forEach((element) => {
      element.remove();
    });
    arrowElements.clear();
    // Also remove any orphaned score labels from document.body
    const orphanedLabels = document.querySelectorAll(".move-score-label");
    orphanedLabels.forEach((label) => {
      label.remove();
    });
  }
}
/**
 * Position arrow between squares
 * @param arrow The arrow element to position
 * @param from The starting square
 * @param to The ending square
 */
export function positionArrow(arrow, from, to) {
  const fromElement = querySelectorOrThrow(document, `[data-square="${from}"]`);
  const toElement = querySelectorOrThrow(document, `[data-square="${to}"]`);
  const boardContainer = querySelectorOrThrow(document, ".board-section");
  if (!fromElement || !toElement || !boardContainer) {
    return;
  }
  const fromRect = fromElement.getBoundingClientRect();
  const toRect = toElement.getBoundingClientRect();
  const boardContainerRect = boardContainer.getBoundingClientRect();
  const fromCenter = {
    x: fromRect.left + fromRect.width / 2 - boardContainerRect.left,
    y: fromRect.top + fromRect.height / 2 - boardContainerRect.top,
  };
  const toCenter = {
    x: toRect.left + toRect.width / 2 - boardContainerRect.left,
    y: toRect.top + toRect.height / 2 - boardContainerRect.top,
  };
  const angle = Math.atan2(
    toCenter.y - fromCenter.y,
    toCenter.x - fromCenter.x,
  );
  const distance = Math.sqrt(
    Math.pow(toCenter.x - fromCenter.x, 2) +
      Math.pow(toCenter.y - fromCenter.y, 2),
  );
  arrow.style.position = "absolute";
  arrow.style.left = `${fromCenter.x}px`;
  arrow.style.top = `${fromCenter.y}px`;
  arrow.style.width = `${distance - 24}px`; // Subtract arrow head width to compensate
  arrow.style.transform = `rotate(${angle}rad)`;
  arrow.style.transformOrigin = "0 50%";
}
/**
 * Get the arrow elements map (for internal use)
 */
export function getArrowElements() {
  return arrowElements;
}
/**
 * Set the arrow elements map (for internal use)
 */
export function setArrowElements(elements) {
  arrowElements = elements;
}
//# sourceMappingURL=arrow-utils.js.map
