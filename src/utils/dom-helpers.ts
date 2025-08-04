/**
 * DOM Element Helper Functions
 *
 * Provides type-safe ways to get DOM elements with proper type checking.
 * These functions replace unsafe type casts and provide better error handling.
 */

/**
 * Safely get an HTML input element by ID
 */
export function getInputElement(id: string): HTMLInputElement | null {
  const element = getElementByIdOrThrow(id);
  return element instanceof HTMLInputElement ? element : null;
}

/**
 * Safely get an HTML textarea element by ID
 */
export function getTextAreaElement(id: string): HTMLTextAreaElement | null {
  const element = getElementByIdOrThrow(id);
  return element instanceof HTMLTextAreaElement ? element : null;
}

/**
 * Safely get an HTML button element by ID
 */
export function getButtonElement(id: string): HTMLButtonElement | null {
  const element = getElementByIdOrThrow(id);
  return element instanceof HTMLButtonElement ? element : null;
}

/**
 * Safely get a checked radio button by name and value
 */
export function getCheckedRadio(
  name: string,
  value: string,
): HTMLInputElement | null {
  const element = querySelectorOrThrow(
    document,
    `input[name="${name}"][value="${value}"]`,
  );
  return element instanceof HTMLInputElement ? element : null;
}

/**
 * Safely get a checked radio button by name
 */
export function getCheckedRadioByName(name: string): HTMLInputElement | null {
  const element = querySelectorOrThrow(
    document,
    `input[name="${name}"]:checked`,
  );
  return element instanceof HTMLInputElement ? element : null;
}

/**
 * Safely get an element by querySelector with type checking
 */
function querySelectorElement<T extends Element>(
  parent: Element,
  selector: string,
): T | null {
  const element = parent.querySelector(selector);
  return element instanceof Element ? (element as T) : null;
}

/**
 * Safely get an HTMLElement by querySelector
 */
export function querySelectorHTMLElement(
  parent: Element,
  selector: string,
): HTMLElement | null {
  return querySelectorElement<HTMLElement>(parent, selector);
}

/**
 * Safely get an HTMLButtonElement by querySelector
 */
export function querySelectorButton(
  parent: Element,
  selector: string,
): HTMLButtonElement | null {
  return querySelectorElement<HTMLButtonElement>(parent, selector);
}

/**
 * Safely get an HTMLElement by querySelector
 */
export function querySelectorHTMLElementBySelector(
  selector: string,
): HTMLElement | null {
  const element = querySelectorOrThrow(document, selector);
  return element instanceof HTMLElement ? element : null;
}

/**
 * Get an element by ID or throw an error if not found
 * Use this when an element is required for the application to function
 */
export const getElementByIdOrThrow = (id: string): HTMLElement => {
  const element = document.getElementById(id);
  if (!element) {
    const errorMessage = `Required element '${id}' not found. This is a bug.`;
    console.error(errorMessage);

    // Show error in UI
    const statusElement = getElementByIdOrThrow("line-fisher-status");
    if (statusElement) {
      statusElement.textContent = errorMessage;
    }

    throw new Error(errorMessage);
  }
  return element;
};

export const querySelectorOrThrow = (
  parent: HTMLElement | Document,
  selector: string,
): HTMLElement => {
  const element = parent.querySelector(selector) as HTMLElement | null;
  if (!element) {
    const errorMessage = `Required element selector '${selector}' did not find anything. This is a bug.`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
  return element;
};
