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
  const element = document.getElementById(id);
  return element instanceof HTMLInputElement ? element : null;
}

/**
 * Safely get an HTML textarea element by ID
 */
export function getTextAreaElement(id: string): HTMLTextAreaElement | null {
  const element = document.getElementById(id);
  return element instanceof HTMLTextAreaElement ? element : null;
}

/**
 * Safely get an HTML button element by ID
 */
export function getButtonElement(id: string): HTMLButtonElement | null {
  const element = document.getElementById(id);
  return element instanceof HTMLButtonElement ? element : null;
}

/**
 * Safely get a checked radio button by name and value
 */
export function getCheckedRadio(
  name: string,
  value: string,
): HTMLInputElement | null {
  const element = document.querySelector(
    `input[name="${name}"][value="${value}"]`,
  );
  return element instanceof HTMLInputElement ? element : null;
}

/**
 * Safely get all radio buttons by name
 */
function getAllRadios(
  name: string,
): NodeListOf<HTMLInputElement> | null {
  const elements = document.querySelectorAll(`input[name="${name}"]`);
  return elements.length > 0
    ? (elements as NodeListOf<HTMLInputElement>)
    : null;
}

/**
 * Safely get a checked radio button by name
 */
export function getCheckedRadioByName(name: string): HTMLInputElement | null {
  const element = document.querySelector(`input[name="${name}"]:checked`);
  return element instanceof HTMLInputElement ? element : null;
}

/**
 * Safely get an element that matches a selector
 */
function querySelector<T extends Element>(selector: string): T | null {
  const element = document.querySelector(selector);
  return element as T | null;
}

/**
 * Safely get all elements that match a selector
 */
function querySelectorAll<T extends Element>(
  selector: string,
): NodeListOf<T> | null {
  const elements = document.querySelectorAll(selector);
  return elements.length > 0 ? (elements as NodeListOf<T>) : null;
}

/**
 * Safely get an element by ID with type checking
 */
function getElementById<T extends Element>(id: string): T | null {
  const element = document.getElementById(id);
  return element as T | null;
}

/**
 * Check if an element is an HTMLElement
 */
function isHTMLElement(
  element: EventTarget | null,
): element is HTMLElement {
  return element instanceof HTMLElement;
}

/**
 * Check if an element is an HTMLInputElement
 */
function isHTMLInputElement(
  element: Element | null,
): element is HTMLInputElement {
  return element instanceof HTMLInputElement;
}

/**
 * Check if an element is an HTMLButtonElement
 */
function isHTMLButtonElement(
  element: Element | null,
): element is HTMLButtonElement {
  return element instanceof HTMLButtonElement;
}

/**
 * Check if an element is an HTMLTextAreaElement
 */
function isHTMLTextAreaElement(
  element: Element | null,
): element is HTMLTextAreaElement {
  return element instanceof HTMLTextAreaElement;
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
  const element = document.querySelector(selector);
  return element instanceof HTMLElement ? element : null;
} 