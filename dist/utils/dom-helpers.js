/**
 * DOM Element Helper Functions
 *
 * Provides type-safe ways to get DOM elements with proper type checking.
 * These functions replace unsafe type casts and provide better error handling.
 */
/**
 * Safely get an HTML input element by ID
 */
export function getInputElement(id) {
    const element = getElementByIdOrThrow(id);
    return element instanceof HTMLInputElement ? element : null;
}
/**
 * Get an HTML input element by ID or throw an error if not found or wrong type
 */
export const getInputElementOrThrow = (id) => {
    const element = getElementByIdOrThrow(id);
    if (!(element instanceof HTMLInputElement)) {
        const errorMessage = `Required input element '${id}' not found or not an <input>. This is a bug.`;
        console.error(errorMessage);
        // Best-effort status update for visibility
        const statusElement = document.getElementById("fish-status");
        if (statusElement) {
            statusElement.textContent = errorMessage;
        }
        throw new Error(errorMessage);
    }
    return element;
};
/**
 * Safely get an HTML textarea element by ID
 */
export function getTextAreaElement(id) {
    const element = getElementByIdOrThrow(id);
    return element instanceof HTMLTextAreaElement ? element : null;
}
/**
 * Safely get an HTML button element by ID
 */
export function getButtonElement(id) {
    const element = getElementByIdOrThrow(id);
    return element instanceof HTMLButtonElement ? element : null;
}
/**
 * Safely get a checked radio button by name and value
 */
export function getCheckedRadio(name, value) {
    const element = querySelectorOrThrow(document, `input[name="${name}"][value="${value}"]`);
    return element instanceof HTMLInputElement ? element : null;
}
/**
 * Safely get a checked radio button by name
 */
export function getCheckedRadioByName(name) {
    const element = querySelectorOrThrow(document, `input[name="${name}"]:checked`);
    return element instanceof HTMLInputElement ? element : null;
}
/**
 * Safely get an element by querySelector with type checking
 */
function querySelectorElement(parent, selector) {
    const element = parent.querySelector(selector);
    return element instanceof Element ? element : null;
}
/**
 * Safely get an HTMLElement by querySelector
 */
export function querySelectorHTMLElement(parent, selector) {
    return querySelectorElement(parent, selector);
}
/**
 * Safely get an HTMLButtonElement by querySelector
 */
export function querySelectorButton(parent, selector) {
    return querySelectorElement(parent, selector);
}
/**
 * Safely get an HTMLElement by querySelector
 */
export function querySelectorHTMLElementBySelector(selector) {
    const element = querySelectorOrThrow(document, selector);
    return element instanceof HTMLElement ? element : null;
}
/**
 * Get an element by ID or throw an error if not found
 * Use this when an element is required for the application to function
 */
export const getElementByIdOrThrow = (id) => {
    const element = document.getElementById(id);
    if (!element) {
        const errorMessage = `Required element '${id}' not found. This is a bug.`;
        console.error(errorMessage);
        // Show error in UI
        const statusElement = getElementByIdOrThrow("fish-status");
        if (statusElement) {
            statusElement.textContent = errorMessage;
        }
        throw new Error(errorMessage);
    }
    return element;
};
export const querySelectorOrThrow = (parent, selector) => {
    const element = parent.querySelector(selector);
    if (!element) {
        const errorMessage = `Required element selector '${selector}' did not find anything. This is a bug.`;
        console.error(errorMessage);
        throw new Error(errorMessage);
    }
    return element;
};
//# sourceMappingURL=dom-helpers.js.map