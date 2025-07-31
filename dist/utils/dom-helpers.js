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
    const element = document.getElementById(id);
    return element instanceof HTMLInputElement ? element : null;
}
/**
 * Safely get an HTML textarea element by ID
 */
export function getTextAreaElement(id) {
    const element = document.getElementById(id);
    return element instanceof HTMLTextAreaElement ? element : null;
}
/**
 * Safely get an HTML button element by ID
 */
export function getButtonElement(id) {
    const element = document.getElementById(id);
    return element instanceof HTMLButtonElement ? element : null;
}
/**
 * Safely get a checked radio button by name and value
 */
export function getCheckedRadio(name, value) {
    const element = document.querySelector(`input[name="${name}"][value="${value}"]`);
    return element instanceof HTMLInputElement ? element : null;
}
/**
 * Safely get all radio buttons by name
 */
function getAllRadios(name) {
    const elements = document.querySelectorAll(`input[name="${name}"]`);
    return elements.length > 0
        ? elements
        : null;
}
/**
 * Safely get a checked radio button by name
 */
export function getCheckedRadioByName(name) {
    const element = document.querySelector(`input[name="${name}"]:checked`);
    return element instanceof HTMLInputElement ? element : null;
}
/**
 * Safely get an element that matches a selector
 */
function querySelector(selector) {
    const element = document.querySelector(selector);
    return element;
}
/**
 * Safely get all elements that match a selector
 */
function querySelectorAll(selector) {
    const elements = document.querySelectorAll(selector);
    return elements.length > 0 ? elements : null;
}
/**
 * Safely get an element by ID with type checking
 */
function getElementById(id) {
    const element = document.getElementById(id);
    return element;
}
/**
 * Check if an element is an HTMLElement
 */
function isHTMLElement(element) {
    return element instanceof HTMLElement;
}
/**
 * Check if an element is an HTMLInputElement
 */
function isHTMLInputElement(element) {
    return element instanceof HTMLInputElement;
}
/**
 * Check if an element is an HTMLButtonElement
 */
function isHTMLButtonElement(element) {
    return element instanceof HTMLButtonElement;
}
/**
 * Check if an element is an HTMLTextAreaElement
 */
function isHTMLTextAreaElement(element) {
    return element instanceof HTMLTextAreaElement;
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
    const element = document.querySelector(selector);
    return element instanceof HTMLElement ? element : null;
}
//# sourceMappingURL=dom-helpers.js.map