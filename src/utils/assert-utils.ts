import { parseFEN } from "./fen-utils.js";
import { getCurrentFishState } from "../line/fish/fish-state.js";

// Centralized assertion utilities with runtime toggle
// Default enabled, can be disabled via setAssertionsEnabled(false) or window.__ASSERTS_ENABLED = false
let ASSERTS_ENABLED: boolean = (globalThis as any).__ASSERTS_ENABLED ?? true;

export function setAssertionsEnabled(enabled: boolean): void {
  ASSERTS_ENABLED = !!enabled;
  (globalThis as any).__ASSERTS_ENABLED = ASSERTS_ENABLED;
}

export function getAssertionsEnabled(): boolean {
  return ASSERTS_ENABLED;
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, (_k, v) => (v === undefined ? null : v), 2);
  } catch (e) {
    try {
      return String(value);
    } catch {
      return "<unstringifiable>";
    }
  }
}

function emitAssertionFailed(
  message: string,
  context?: Record<string, unknown>,
): void {
  if (typeof window !== "undefined" && (window as any).dispatchEvent) {
    console.warn(
      "hard stopping fishing after assertion failure",
      message,
      context,
    );
    getCurrentFishState().isFishing = false;
  }
}

export function ASSERT(
  condition: unknown,
  message: string,
  context?: Record<string, unknown>,
): asserts condition {
  if (!ASSERTS_ENABLED) return;
  if (!condition) {
    const errMsg = `${message}${context ? "\nContext: " + safeStringify(context) : ""}`;
    try {
      // Only log as error if not explicitly marked as cache validation
      const isCacheValidation =
        context && (context as any).source === "getTopLines(cache-validate)";
      if (!isCacheValidation) {
        console.error("ASSERTION FAILED:", errMsg);
      } else {
        console.warn("Assertion (cache-validate):", errMsg);
      }
      console.trace();
    } catch {}
    if (
      !(context && (context as any).source === "getTopLines(cache-validate)")
    ) {
      emitAssertionFailed(message, context);
    }
    throw new Error(errMsg);
  }
}

export function assertFenParsable(
  label: string,
  fen: string,
  extra?: Record<string, unknown>,
): void {
  if (!ASSERTS_ENABLED) return;
  try {
    parseFEN(fen);
  } catch (e) {
    const ctx = { label, fen, error: (e as Error)?.message, ...extra };
    ASSERT(false, `FEN not parsable at ${label}`, ctx);
  }
}
