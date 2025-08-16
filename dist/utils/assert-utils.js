import { parseFEN } from "./fen-utils.js";
import { getCurrentFishState } from "../line/fish/fish-state.js";
// Centralized assertion utilities with runtime toggle
// Default enabled, can be disabled via setAssertionsEnabled(false) or window.__ASSERTS_ENABLED = false
let ASSERTS_ENABLED = globalThis.__ASSERTS_ENABLED ?? true;
export function setAssertionsEnabled(enabled) {
    ASSERTS_ENABLED = !!enabled;
    globalThis.__ASSERTS_ENABLED = ASSERTS_ENABLED;
}
export function getAssertionsEnabled() {
    return ASSERTS_ENABLED;
}
function safeStringify(value) {
    try {
        return JSON.stringify(value, (_k, v) => (v === undefined ? null : v), 2);
    }
    catch (e) {
        try {
            return String(value);
        }
        catch {
            return "<unstringifiable>";
        }
    }
}
function emitAssertionFailed(message, context) {
    if (typeof window !== "undefined" && window.dispatchEvent) {
        console.warn("hard stopping fishing after assertion failure", message, context);
        getCurrentFishState().isFishing = false;
    }
}
export function ASSERT(condition, message, context) {
    if (!ASSERTS_ENABLED)
        return;
    if (!condition) {
        const errMsg = `${message}${context ? "\nContext: " + safeStringify(context) : ""}`;
        try {
            // Only log as error if not explicitly marked as cache validation
            const isCacheValidation = context && context.source === "getTopLines(cache-validate)";
            if (!isCacheValidation) {
                console.error("ASSERTION FAILED:", errMsg);
            }
            else {
                console.warn("Assertion (cache-validate):", errMsg);
            }
            console.trace();
        }
        catch { }
        if (!(context && context.source === "getTopLines(cache-validate)")) {
            emitAssertionFailed(message, context);
        }
        throw new Error(errMsg);
    }
}
export function assertFenParsable(label, fen, extra) {
    if (!ASSERTS_ENABLED)
        return;
    try {
        parseFEN(fen);
    }
    catch (e) {
        const ctx = { label, fen, error: e?.message, ...extra };
        ASSERT(false, `FEN not parsable at ${label}`, ctx);
    }
}
//# sourceMappingURL=assert-utils.js.map