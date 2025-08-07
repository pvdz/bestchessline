import type { LineFisherConfig } from "../line/fish/types.js";

/**
 * Calculate total nodes in the analysis tree
 */
export const calculateTotalNodes = (config: LineFisherConfig): number => {
  // For each responder node there is one initiator node (the move in response), plus the initial move
  // Total nodes = 1 + 2 * ( responder nodes )
  // Or actually:
  // Total nodes = 1 + 2 * ( m[0] + (m[0] * m[1]) + (m[0] * m[1] * m[2]) + ... + (m[0] * m[1] * ... * m[n-1]) )

  return 1 + 2 * calculateResponderNodes(config);
};

/**
 * Calculate the number of responder nodes in the analysis tree
 * @param config - The configuration for the Line Fisher analysis
 * @returns The number of responder nodes in the analysis tree
 */
export const calculateResponderNodes = (config: LineFisherConfig): number => {
  const maxDepth = config.maxDepth;
  const responderCounts = config.responderMoveCounts;
  const defaultResponderCount = config.defaultResponderCount;

  // This is just the number of responder nodes, which is the main computation anyways.

  // Total nodes = m[0] + (m[0] * m[1]) + (m[0] * m[1] * m[2]) + ... + (m[0] * m[1] * ... * m[n-1])
  // So for each move, multiply the number of nodes by the responder count for each previous move including this one
  // Then sum up the results for all moves.
  // If the count is fixed for all layers, it would be sum(m^i) for each i = 0 to maxDepth-1
  // But because m can be different for every depth, we have to do this more complicated way.

  // For each move, increase prod by responder count at this move. Then add that result to the sum.
  let prod = 1;
  let sum = 0;
  for (let i = 0; i < maxDepth; i++) {
    prod =
      prod *
      (i < responderCounts.length ? responderCounts[i] : defaultResponderCount);
    sum = sum + prod;
  }

  return sum;
};

/**
 * Calculate total lines in the analysis
 */
export const calculateTotalLines = (config: LineFisherConfig): number => {
  const maxDepth = config.maxDepth;
  const responderCounts = config.responderMoveCounts;
  const defaultResponderCount = config.defaultResponderCount;

  let prod = 1;
  for (let i = 0; i < maxDepth; i++) {
    if (i < responderCounts.length) {
      prod = prod * responderCounts[i];
    } else {
      prod = prod * defaultResponderCount;
    }
  }

  return prod || 1;
};
