/**
 * Calculate total leaf nodes in the tree
 */
declare const calculateTotalLeafs: (nodes: BestLineNode[]) => number;

/**
 * Calculate number of unique positions analyzed
 */
declare const calculateUniquePositions: (
  nodes: BestLineNode[],
  analysis: BestLinesAnalysis,
) => number;

export {
  startBestLinesAnalysis,
  stopBestLinesAnalysis,
  clearBestLinesAnalysis,
  getCurrentAnalysis,
  isAnalyzing,
  getProgress,
  getBestLinesState,
  calculateTotalLeafs,
  calculateUniquePositions,
};
