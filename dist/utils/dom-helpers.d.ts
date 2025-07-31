/**
 * DOM Element Helper Functions
 *
 * Provides type-safe ways to get DOM elements with proper type checking.
 * These functions replace unsafe type casts and provide better error handling.
 */
/**
 * Safely get an HTML input element by ID
 */
export declare function getInputElement(id: string): HTMLInputElement | null;
/**
 * Safely get an HTML textarea element by ID
 */
export declare function getTextAreaElement(id: string): HTMLTextAreaElement | null;
/**
 * Safely get an HTML button element by ID
 */
export declare function getButtonElement(id: string): HTMLButtonElement | null;
/**
 * Safely get an HTML select element by ID
 */
export declare function getSelectElement(id: string): HTMLSelectElement | null;
/**
 * Safely get a checked radio button by name and value
 */
export declare function getCheckedRadio(name: string, value: string): HTMLInputElement | null;
/**
 * Safely get all radio buttons by name
 */
export declare function getAllRadios(name: string): NodeListOf<HTMLInputElement> | null;
/**
 * Safely get a checked radio button by name
 */
export declare function getCheckedRadioByName(name: string): HTMLInputElement | null;
/**
 * Safely get an element that matches a selector
 */
export declare function querySelector<T extends Element>(selector: string): T | null;
/**
 * Safely get all elements that match a selector
 */
export declare function querySelectorAll<T extends Element>(selector: string): NodeListOf<T> | null;
/**
 * Safely get an element by ID with type checking
 */
export declare function getElementById<T extends Element>(id: string): T | null;
/**
 * Check if an element is an HTMLElement
 */
export declare function isHTMLElement(element: EventTarget | null): element is HTMLElement;
/**
 * Check if an element is an HTMLInputElement
 */
export declare function isHTMLInputElement(element: Element | null): element is HTMLInputElement;
/**
 * Check if an element is an HTMLButtonElement
 */
export declare function isHTMLButtonElement(element: Element | null): element is HTMLButtonElement;
/**
 * Check if an element is an HTMLTextAreaElement
 */
export declare function isHTMLTextAreaElement(element: Element | null): element is HTMLTextAreaElement;
/**
 * Safely get an element by querySelector with type checking
 */
export declare function querySelectorElement<T extends Element>(parent: Element, selector: string): T | null;
/**
 * Safely get an HTMLElement by querySelector
 */
export declare function querySelectorHTMLElement(parent: Element, selector: string): HTMLElement | null;
/**
 * Safely get an HTMLButtonElement by querySelector
 */
export declare function querySelectorButton(parent: Element, selector: string): HTMLButtonElement | null;
/**
 * Safely get an HTMLElement by querySelector
 */
export declare function querySelectorHTMLElementBySelector(selector: string): HTMLElement | null;
