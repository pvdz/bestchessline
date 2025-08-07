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
  startElement: HTMLElement | null;
}

let arrowDrawingState: ArrowDrawingState = {
  isDrawing: false,
  startSquare: null,
  startElement: null,
};

/**
 * Initialize arrow drawing functionality
 */
export function initializeArrowDrawing(): void {
  const boardGrid = document.querySelector(
    ".practice-board-grid",
  ) as HTMLElement;
  if (!boardGrid) return;

  // Add right-click event listener to the board
  boardGrid.addEventListener("contextmenu", handleRightClick);

  // Add mouse move listener for drawing preview
  boardGrid.addEventListener("mousemove", handleMouseMove);

  // Add mouse up listener to finish drawing
  document.addEventListener("mouseup", handleMouseUp);
}

/**
 * Handle right-click on board squares
 */
function handleRightClick(event: MouseEvent): void {
  event.preventDefault();

  // Find the square element, even if clicking on a piece
  const target = event.target as HTMLElement;
  const squareEl = target.closest(".practice-square") as HTMLElement;
  const square = squareEl?.dataset.square;

  if (!square) return;

  if (!arrowDrawingState.isDrawing) {
    // Start drawing arrow
    startArrowDrawing(square, squareEl);
  } else {
    // Finish drawing arrow
    finishArrowDrawing(square);
  }
}

/**
 * Handle mouse move for arrow preview
 */
function handleMouseMove(event: MouseEvent): void {
  if (!arrowDrawingState.isDrawing || !arrowDrawingState.startElement) return;

  // Get the element under the mouse cursor
  const elementUnderMouse = document.elementFromPoint(
    event.clientX,
    event.clientY,
  ) as HTMLElement;
  const squareEl = elementUnderMouse?.closest(
    ".practice-square",
  ) as HTMLElement;
  const square = squareEl?.dataset.square;

  if (!square || square === arrowDrawingState.startSquare) return;

  // Update preview arrow
  updateArrowPreview(square);
}

/**
 * Handle mouse up to finish drawing
 */
function handleMouseUp(event: MouseEvent): void {
  if (!arrowDrawingState.isDrawing) return;

  // Get the element under the mouse cursor
  const elementUnderMouse = document.elementFromPoint(
    event.clientX,
    event.clientY,
  ) as HTMLElement;
  const squareEl = elementUnderMouse?.closest(
    ".practice-square",
  ) as HTMLElement;
  const square = squareEl?.dataset.square;

  if (square && square !== arrowDrawingState.startSquare) {
    finishArrowDrawing(square);
  } else {
    // Cancel drawing if clicking same square or outside board
    cancelArrowDrawing();
  }
}

/**
 * Start drawing an arrow from a square
 */
function startArrowDrawing(square: string, element: HTMLElement): void {
  arrowDrawingState.isDrawing = true;
  arrowDrawingState.startSquare = square;
  arrowDrawingState.startElement = element;

  // Add visual feedback without toggling selection
  element.style.boxShadow = "0 0 15px rgba(255, 215, 0, 0.9)";
}

/**
 * Update arrow preview while drawing
 */
function updateArrowPreview(toSquare: string): void {
  if (!arrowDrawingState.startSquare) return;

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
  if (arrowDrawingState.startElement) {
    arrowDrawingState.startElement.style.boxShadow = "";
  }

  // Remove preview arrow
  const existingPreview = document.querySelector(".practice-arrow-preview");
  if (existingPreview) {
    existingPreview.remove();
  }

  arrowDrawingState.isDrawing = false;
  arrowDrawingState.startSquare = null;
  arrowDrawingState.startElement = null;
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
}

/**
 * Clean up arrow drawing event listeners
 */
export function cleanupArrowDrawing(): void {
  const boardGrid = document.querySelector(
    ".practice-board-grid",
  ) as HTMLElement;
  if (boardGrid) {
    boardGrid.removeEventListener("contextmenu", handleRightClick);
    boardGrid.removeEventListener("mousemove", handleMouseMove);
  }

  document.removeEventListener("mouseup", handleMouseUp);

  // Clear any remaining arrows
  clearAllArrows();

  // Reset drawing state
  arrowDrawingState = {
    isDrawing: false,
    startSquare: null,
    startElement: null,
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
export function shouldHandleArrowRightClick(event: MouseEvent): boolean {
  const target = event.target as HTMLElement;
  const squareEl = target.closest(".practice-square") as HTMLElement;
  return squareEl !== null;
}
