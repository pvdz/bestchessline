/**
 * UI Getter Functions
 * 
 * Provides functions to retrieve values from UI elements and controls.
 * These functions handle both input values and display span values with fallbacks.
 */

/**
 * Get depth scaler from UI (1-15)
 */
export function getDepthScaler(): number {
  const depthScalerInput = document.getElementById(
    "tree-digger-depth-scaler",
  ) as HTMLInputElement;
  const depthScalerValue = document.getElementById(
    "tree-digger-depth-scaler-value",
  );

  // Try to get the value from the display span first, then fall back to input value
  if (depthScalerValue && depthScalerValue.textContent) {
    const spanValue = parseInt(depthScalerValue.textContent);
    if (!isNaN(spanValue)) {
      return spanValue;
    }
  }

  // Fall back to input value
  return depthScalerInput ? parseInt(depthScalerInput.value) : 3;
}

/**
 * Get black moves count from UI
 */
export function getResponderMovesCount(): number {
  const responderMovesInput = document.getElementById(
    "tree-digger-responder-moves",
  ) as HTMLInputElement;
  const responderMovesValue = document.getElementById(
    "tree-digger-responder-moves-value",
  );

  // Try to get the value from the display span first, then fall back to input value
  if (responderMovesValue && responderMovesValue.textContent) {
    const spanValue = parseInt(responderMovesValue.textContent);
    if (!isNaN(spanValue)) {
      return spanValue;
    }
  }

  // Fall back to input value
  return responderMovesInput ? parseInt(responderMovesInput.value) : 6;
}

/**
 * Get thread count from UI
 */
export function getThreadCount(): number {
  const threadsInput = document.getElementById(
    "tree-digger-threads",
  ) as HTMLInputElement;
  const threadsValue = document.getElementById("tree-digger-threads-value");

  // Try to get the value from the display span first, then fall back to input value
  if (threadsValue && threadsValue.textContent) {
    const spanValue = parseInt(threadsValue.textContent);
    if (!isNaN(spanValue)) {
      return spanValue;
    }
  }

  // Fall back to input value
  return threadsInput ? parseInt(threadsInput.value) : 10;
}

/**
 * Get initiator moves from UI inputs
 */
export function getInitiatorMoves(): string[] {
  const initiatorMove1Input = document.getElementById(
    "tree-digger-initiator-move-1",
  ) as HTMLInputElement;
  const initiatorMove2Input = document.getElementById(
    "tree-digger-initiator-move-2",
  ) as HTMLInputElement;

  const move1 = initiatorMove1Input?.value.trim() || "";
  const move2 = initiatorMove2Input?.value.trim() || "";

  const moves: string[] = [];
  if (move1) moves.push(move1);
  if (move2) moves.push(move2);

  return moves;
}

/**
 * Get first reply override from UI (0 = use default)
 */
export function getFirstReplyOverride(): number {
  const overrideInput = document.getElementById(
    "tree-digger-override-1",
  ) as HTMLInputElement;
  const overrideValue = document.getElementById("tree-digger-override-1-value");

  // Try to get the value from the display span first, then fall back to input value
  if (overrideValue && overrideValue.textContent) {
    const spanValue = parseInt(overrideValue.textContent);
    if (!isNaN(spanValue)) {
      return spanValue;
    }
  }

  // Fall back to input value
  return overrideInput ? parseInt(overrideInput.value) : 0;
}

/**
 * Get second reply override from UI (0 = use default)
 */
export function getSecondReplyOverride(): number {
  const overrideInput = document.getElementById(
    "tree-digger-override-2",
  ) as HTMLInputElement;
  const overrideValue = document.getElementById("tree-digger-override-2-value");

  // Try to get the value from the display span first, then fall back to input value
  if (overrideValue && overrideValue.textContent) {
    const spanValue = parseInt(overrideValue.textContent);
    if (!isNaN(spanValue)) {
      return spanValue;
    }
  }

  // Fall back to input value
  return overrideInput ? parseInt(overrideInput.value) : 0;
} 