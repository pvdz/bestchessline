import { getElementByIdOrThrow } from "./dom-helpers.js";
import { logError } from "./logging.js";
const sharedArrayBufferSupported = setSharedArrayBufferSupported();
/**
 * Check if SharedArrayBuffer is available and supported
 */
export function isSharedArrayBufferSupported() {
  return sharedArrayBufferSupported;
}
function setSharedArrayBufferSupported() {
  try {
    // Check if SharedArrayBuffer exists
    if (typeof SharedArrayBuffer === "undefined") {
      return false;
    }
    // Check if WebAssembly threads are supported
    if (typeof WebAssembly === "undefined" || !WebAssembly.Memory) {
      return false;
    }
    // Try to create a shared memory instance
    const memory = new WebAssembly.Memory({
      initial: 1,
      maximum: 1,
      shared: true,
    });
    // Check if the buffer is actually a SharedArrayBuffer
    return memory.buffer instanceof SharedArrayBuffer;
  } catch (error) {
    logError("SharedArrayBuffer not supported:", error);
    return false;
  }
}
/**
 * Get the appropriate Stockfish worker URL based on environment
 */
export function getStockfishWorkerUrl() {
  if (isSharedArrayBufferSupported()) {
    return getStockfishWorkerUrlThreaded();
  } else {
    // For GitHub Pages, we'll need to use a different approach
    // This will be handled by the fallback mechanism
    return getStockfishWorkerUrlFallback();
  }
}
export function getStockfishWorkerUrlThreaded() {
  return "/dist/stockfish.js";
}
export function getStockfishWorkerUrlFallback() {
  return "/dist/stockfish-single.js";
}
export async function emphasizeFishTickerWithPause() {
  const el = getElementByIdOrThrow("fish-pv-ticker");
  const prevWeight = el.style.fontWeight;
  // Freeze updates visually by bolding and dimming other UI slightly
  el.style.fontWeight = "bold";
  try {
    // Pause further ticker updates for 3s
    // await new Promise((r) => setTimeout(r, 3000));
    // Debug pause gate: wait until Continue button sets this flag
    try {
      while (!window.__SF_DEBUG_CONTINUE__) {
        await new Promise((r) => setTimeout(r, 100));
      }
    } catch {}
    // Reset flag for subsequent steps
    try {
      window.__SF_DEBUG_CONTINUE__ = false;
    } catch {}
  } finally {
    el.style.fontWeight = prevWeight || "";
  }
}
//# sourceMappingURL=stockfish-utils.js.map
