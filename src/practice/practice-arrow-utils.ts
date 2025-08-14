/**
 * Practice Arrow Utility Functions
 *
 * Provides functions for managing user-drawn arrows on the practice chess board.
 * Supports right-click to draw arrows and automatic cleanup after moves.
 */

// Global map to track user arrow elements
let userArrowElements: Map<string, HTMLElement> = new Map();

// Track arrow drawing state
interface ArrowDrawingState {
  isDrawing: boolean;
  startSquare: string | null;
}

let arrowDrawingState: ArrowDrawingState = {
  isDrawing: false,
  startSquare: null,
};

// Track last hover square during a draw gesture
let lastHoverSquare: string | null = null;
let drewArrow = false;

/**
 * Initialize arrow drawing functionality
 */
export function initializeArrowDrawing(): void {
  const boardGrid = document.getElementById(
    "practice-board-grid",
  ) as HTMLElement | null;
  if (!boardGrid) return;

  // Suppress context menu on right-click
  boardGrid.addEventListener("contextmenu", (ev) => ev.preventDefault());

  // Start priming on right mouse down
  boardGrid.addEventListener("mousedown", handleMouseDown);

  // Mouse move for preview and to trigger start after leaving origin square
  boardGrid.addEventListener("mousemove", handleMouseMove);

  // Finish on mouse up anywhere
  document.addEventListener("mouseup", handleMouseUp);
}

/**
 * Handle right mouse down on board squares
 */
function handleMouseDown(event: MouseEvent): void {
  // Only react to right mouse button
  if (event.button !== 2) return;
  event.preventDefault();

  const target = event.target as HTMLElement;
  const squareEl = target.closest(".practice-square") as HTMLElement | null;
  const square = squareEl?.dataset.square || null;
  if (!square || !squareEl) return;

  // Prime drawing start; actual drawing begins once cursor leaves origin square
  arrowDrawingState.startSquare = square;
  lastHoverSquare = null;
  drewArrow = false;
}

/**
 * Handle mouse move for arrow preview
 */
function handleMouseMove(event: MouseEvent): void {
  if (!arrowDrawingState.startSquare) return;

  // Get the element under the mouse cursor
  const elementUnderMouse = document.elementFromPoint(
    event.clientX,
    event.clientY,
  ) as HTMLElement;
  const squareEl = elementUnderMouse?.closest(
    ".practice-square",
  ) as HTMLElement | null;
  const square = squareEl?.dataset.square || null;
  lastHoverSquare = square;

  if (!square || square === arrowDrawingState.startSquare) {
    const existingPreview = document.querySelector(".practice-arrow-preview");
    if (existingPreview) {
      existingPreview.remove();
    }
    return;
  }

  // Start drawing if not started yet
  if (!arrowDrawingState.isDrawing) {
    startArrowDrawing(arrowDrawingState.startSquare);
  }

  // Update preview arrow
  updateArrowPreview(square);
  drewArrow = true;
}

/**
 * Handle mouse up to finish drawing
 */
function handleMouseUp(_event: MouseEvent): void {
  if (
    arrowDrawingState.isDrawing &&
    lastHoverSquare &&
    lastHoverSquare !== arrowDrawingState.startSquare
  ) {
    finishArrowDrawing(lastHoverSquare);
  } else {
    // Cancel drawing if clicking same square or outside board
    cancelArrowDrawing();
  }
}

/**
 * Start drawing an arrow from a square
 */
function startArrowDrawing(square: string): void {
  arrowDrawingState.isDrawing = true;
  arrowDrawingState.startSquare = square;
}

/**
 * Update arrow preview while drawing
 */
function updateArrowPreview(toSquare: string): void {
  if (!arrowDrawingState.startSquare) {
    return;
  }

  // Don't show preview if start and end squares are the same
  if (arrowDrawingState.startSquare === toSquare) {
    // Remove existing preview arrow
    const existingPreview = document.querySelector(".practice-arrow-preview");
    if (existingPreview) {
      existingPreview.remove();
    }
    return;
  }

  // Remove existing preview arrow
  const existingPreview = document.querySelector(".practice-arrow-preview");
  if (existingPreview) {
    existingPreview.remove();
  }

  // Create preview arrow
  createArrow(arrowDrawingState.startSquare, toSquare, true);
}

/**
 * Finish drawing an arrow
 */
function finishArrowDrawing(toSquare: string): void {
  if (!arrowDrawingState.startSquare) return;

  const fromSquare = arrowDrawingState.startSquare;

  // Don't create arrow if start and end squares are the same
  if (fromSquare === toSquare) {
    cancelArrowDrawing();
    return;
  }

  const arrowKey = `${fromSquare}-${toSquare}`;

  // Check if arrow already exists
  if (userArrowElements.has(arrowKey)) {
    // Remove existing arrow
    removeArrow(arrowKey);
  } else {
    // Create new arrow
    createArrow(fromSquare, toSquare, false);
  }

  // Clean up drawing state
  cancelArrowDrawing();
}

/**
 * Cancel arrow drawing
 */
function cancelArrowDrawing(): void {
  // Remove preview arrow
  const existingPreview = document.querySelector(".practice-arrow-preview");
  if (existingPreview) {
    existingPreview.remove();
  }

  arrowDrawingState.isDrawing = false;
  arrowDrawingState.startSquare = null;
  lastHoverSquare = null;
}

/**
 * Create an arrow between two squares
 */
function createArrow(
  fromSquare: string,
  toSquare: string,
  isPreview: boolean = false,
): void {
  // Don't create arrow if start and end squares are the same
  if (fromSquare === toSquare) {
    return;
  }

  const boardContainer = document.querySelector(
    ".practice-board",
  ) as HTMLElement;
  if (!boardContainer) return;

  const fromElement = document.querySelector(
    `[data-square="${fromSquare}"]`,
  ) as HTMLElement;
  const toElement = document.querySelector(
    `[data-square="${toSquare}"]`,
  ) as HTMLElement;

  if (!fromElement || !toElement) return;

  const fromRect = fromElement.getBoundingClientRect();
  const toRect = toElement.getBoundingClientRect();
  const boardRect = boardContainer.getBoundingClientRect();

  const fromCenter = {
    x: fromRect.left + fromRect.width / 2 - boardRect.left,
    y: fromRect.top + fromRect.height / 2 - boardRect.top,
  };

  const toCenter = {
    x: toRect.left + toRect.width / 2 - boardRect.left,
    y: toRect.top + toRect.height / 2 - boardRect.top,
  };

  const angle = Math.atan2(
    toCenter.y - fromCenter.y,
    toCenter.x - fromCenter.x,
  );
  const distance = Math.sqrt(
    Math.pow(toCenter.x - fromCenter.x, 2) +
      Math.pow(toCenter.y - fromCenter.y, 2),
  );

  // Calculate directional offsets for better alignment
  const dx = toCenter.x - fromCenter.x;
  const dy = toCenter.y - fromCenter.y;

  // Adjust position based on direction
  let offsetX = 0;
  let offsetY = 0;

  if (Math.abs(dx) > Math.abs(dy)) {
    // Horizontal movement
    if (dx > 0) {
      // Moving right
      offsetX = 2;
      offsetY = -2;
    } else {
      // Moving left
      offsetX = -2;
      offsetY = -2;
    }
  } else {
    // Vertical movement
    if (dy > 0) {
      // Moving down
      offsetX = -1;
      offsetY = 2;
    } else {
      // Moving up
      offsetX = -1;
      offsetY = -2;
    }
  }

  // Create arrow element with improved styling
  const arrow = document.createElement("div");
  arrow.className = isPreview ? "practice-arrow-preview" : "practice-arrow";
  arrow.style.left = `${fromCenter.x + offsetX}px`;
  arrow.style.top = `${fromCenter.y + offsetY}px`;
  arrow.style.width = `${distance - 20}px`;
  arrow.style.transform = `rotate(${angle}rad)`;
  arrow.style.transformOrigin = "0 50%";
  arrow.style.setProperty(
    "--arrow-color",
    isPreview ? "rgba(255, 0, 0, 0.9)" : "rgba(255, 0, 0, 1)",
  );
  arrow.style.pointerEvents = "none";
  boardContainer.appendChild(arrow);

  if (!isPreview) {
    const arrowKey = `${fromSquare}-${toSquare}`;
    userArrowElements.set(arrowKey, arrow);
  }
}

/**
 * Remove a specific arrow
 */
function removeArrow(arrowKey: string): void {
  const arrow = userArrowElements.get(arrowKey);
  if (arrow) {
    arrow.remove();
    userArrowElements.delete(arrowKey);
  }
}

/**
 * Remove all user arrows
 */
export function clearAllArrows(): void {
  userArrowElements.forEach((arrow) => {
    arrow.remove();
  });
  userArrowElements.clear();
  // Also remove any stray arrows not tracked (e.g., Top-5 arrows)
  document
    .querySelectorAll(".practice-arrow, .practice-arrow-preview")
    .forEach((el) => {
      el.remove();
    });
}

/**
 * Clean up arrow drawing event listeners
 */
export function cleanupArrowDrawing(): void {
  const boardGrid = document.getElementById(
    "practice-board-grid",
  ) as HTMLElement | null;
  if (boardGrid) {
    // These listeners may or may not be attached; removing is safe either way
    boardGrid.removeEventListener("contextmenu", (ev) => ev.preventDefault());
    boardGrid.removeEventListener("mousedown", handleMouseDown);
    boardGrid.removeEventListener("mousemove", handleMouseMove);
  }

  document.removeEventListener("mouseup", handleMouseUp);

  // Clear any remaining arrows
  clearAllArrows();

  // Reset drawing state
  arrowDrawingState = {
    isDrawing: false,
    startSquare: null,
  };
}

/**
 * Check if arrow drawing is currently active
 */
export function isArrowDrawingActive(): boolean {
  return arrowDrawingState.isDrawing;
}

/**
 * Check if a right-click should be handled by arrow drawing
 * This prevents square selection when starting arrow drawing
 */
export function shouldHandleArrowRightClick(_event?: MouseEvent): boolean {
  // Claim RMB if we are drawing or have a primed start square.
  // This suppresses other RMB handlers from acting on the same gesture.
  if (arrowDrawingState.isDrawing) return true;
  if (arrowDrawingState.startSquare) return true;
  return false;
}

// Expose current drawing state read-only to external code
export function isArrowDrawing(): boolean {
  return arrowDrawingState.isDrawing;
}

// Expose a one-shot flag for consumers to detect an arrow completion
export function consumeRecentArrowCompleted(): boolean {
  const v = drewArrow;
  drewArrow = false;
  return v;
}
