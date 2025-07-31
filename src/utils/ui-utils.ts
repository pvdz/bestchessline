/**
 * UI Utility Functions
 * 
 * Provides functions for UI interactions, notifications, and utility
 * functions for user interface management.
 */

/**
 * Show a toast notification
 * @param message The message to display
 * @param background The background color (default: #333)
 * @param duration How long to show (ms, default: 4000)
 */
export function showToast(
  message: string,
  background = "#333",
  duration = 4000,
): void {
  const toast = document.createElement("div");
  toast.textContent = message;
  toast.style.position = "fixed";
  toast.style.bottom = "64px";
  toast.style.left = "50%";
  toast.style.transform = "translateX(-50%)";
  toast.style.background = background;
  toast.style.color = "#fff";
  toast.style.padding = "8px 16px";
  toast.style.borderRadius = "6px";
  toast.style.zIndex = "9999";
  toast.style.fontWeight = "bold";
  toast.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}

/**
 * Create a debounced function that delays invoking the provided function
 * until after the specified wait time has elapsed since the last time it was invoked.
 * @param func The function to debounce
 * @param wait The number of milliseconds to delay
 * @returns A debounced version of the function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Clear the initiator move input fields
 */
export function clearInitiatorMoveInputs(): void {
  const initiatorMove1Input = document.getElementById(
    "tree-digger-initiator-move-1",
  ) as HTMLInputElement;
  const initiatorMove2Input = document.getElementById(
    "tree-digger-initiator-move-2",
  ) as HTMLInputElement;

  if (initiatorMove1Input) initiatorMove1Input.value = "";
  if (initiatorMove2Input) initiatorMove2Input.value = "";
}

/**
 * Update tree font size
 * @param fontSize The font size in pixels
 */
export function updateTreeFontSize(fontSize: number): void {
  const treeSection = document.querySelector(".tree-digger-tree");
  if (treeSection) {
    (treeSection as HTMLElement).style.fontSize = `${fontSize}px`;
  }

  // Also update the initial font size when the control is first loaded
  const treeFontSizeInput = document.getElementById(
    "tree-font-size",
  ) as HTMLInputElement;
  if (treeFontSizeInput) {
    treeFontSizeInput.value = fontSize.toString();
  }
} 