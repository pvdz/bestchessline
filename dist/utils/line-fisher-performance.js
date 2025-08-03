/**
 * Line Fisher performance optimization utilities
 */
export const optimizeLineFisherPerformance = (state) => {
  // Implement efficient transposition detection using hash-based lookup
  const positionHash = (fen) => {
    // Create a simple hash for position comparison
    return fen.split(" ")[0]; // Use only the board part for transposition detection
  };
  // Optimize memory usage by using WeakMap for position tracking
  const positionCache = new WeakMap();
  // Improve analysis speed by batching operations
  const batchSize = 10;
  let pendingOperations = 0;
  const processBatch = async (operations) => {
    const batches = [];
    for (let i = 0; i < operations.length; i += batchSize) {
      batches.push(operations.slice(i, i + batchSize));
    }
    for (const batch of batches) {
      await Promise.all(batch.map((op) => op()));
      // Allow UI updates between batches
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  };
  // Cache frequently accessed calculations
  const calculationCache = new Map();
  const getCachedCalculation = (key, calculation) => {
    if (calculationCache.has(key)) {
      return calculationCache.get(key);
    }
    const result = calculation();
    calculationCache.set(key, result);
    return result;
  };
  // Optimize progress updates by debouncing
  let progressUpdateTimeout = null;
  const debouncedProgressUpdate = () => {
    if (progressUpdateTimeout) {
      clearTimeout(progressUpdateTimeout);
    }
    progressUpdateTimeout = window.setTimeout(() => {
      // Note: This would need to be imported from line_fisher.ts
      // For now, we'll leave this as a placeholder
      progressUpdateTimeout = null;
    }, 100); // Update every 100ms instead of every operation
  };
  // Export optimization functions
  return {
    positionHash,
    positionCache,
    processBatch,
    getCachedCalculation,
    debouncedProgressUpdate,
  };
};
//# sourceMappingURL=line-fisher-performance.js.map
