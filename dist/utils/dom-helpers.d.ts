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
 * Safely get a checked radio button by name and value
 */
export declare function getCheckedRadio(name: string, value: string): HTMLInputElement | null;
/**
 * Safely get a checked radio button by name
 */
export declare function getCheckedRadioByName(name: string): HTMLInputElement | null;
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
