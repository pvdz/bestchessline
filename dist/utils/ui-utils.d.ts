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
export declare function showToast(message: string, background?: string, duration?: number): void;
/**
 * Create a debounced function that delays invoking the provided function
 * until after the specified wait time has elapsed since the last time it was invoked.
 * @param func The function to debounce
 * @param wait The number of milliseconds to delay
 * @returns A debounced version of the function
 */
export declare function debounce<T extends (...args: never[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void;
/**
 * Clear the initiator move input fields
 */
export declare function clearInitiatorMoveInputs(): void;
