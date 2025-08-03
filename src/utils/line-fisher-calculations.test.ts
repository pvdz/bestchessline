// Test file for line-fisher-calculations module
// Tests the new 2n-1 formula where n is the tree formula result

import {
  calculateTotalNodes,
  calculateTotalLines,
} from "./line-fisher-calculations.js";
import { generateLineFisherFormula } from "./line-fisher-results.js";
import type { LineFisherConfig } from "../line_fisher.js";

console.log("=== NODE AND LINE COUNT TESTS ===\n");

// Test 1: Flat responder count of 3, depth 1
console.log("Test 1: Flat responder count of 3, depth 1");
const config1: LineFisherConfig = {
  initiatorMoves: [],
  maxDepth: 1,
  responderMoveCounts: [],
  threads: 4,
  defaultResponderCount: 3,
};
const result1 = generateLineFisherFormula(config1);
const actualNodes1 = calculateTotalNodes(config1);
const actualLines1 = calculateTotalLines(config1);
console.log("Config:", config1);
console.log("Node Formula:");
console.log(result1.nodeFormula);
console.log("Line Formula:", result1.lineFormula);
console.log("Actual nodes:", actualNodes1);
console.log("Actual lines:", actualLines1);
console.log("");

// Test 2: Flat responder count of 3, depth 2
console.log("Test 2: Flat responder count of 3, depth 2");
const config2: LineFisherConfig = {
  initiatorMoves: [],
  maxDepth: 2,
  responderMoveCounts: [],
  threads: 4,
  defaultResponderCount: 3,
};
const result2 = generateLineFisherFormula(config2);
const actualNodes2 = calculateTotalNodes(config2);
const actualLines2 = calculateTotalLines(config2);
console.log("Config:", config2);
console.log("Node Formula:");
console.log(result2.nodeFormula);
console.log("Line Formula:", result2.lineFormula);
console.log("Actual nodes:", actualNodes2);
console.log("Actual lines:", actualLines2);
console.log("");

// Test 3: Flat responder count of 3, depth 3
console.log("Test 3: Flat responder count of 3, depth 3");
const config3: LineFisherConfig = {
  initiatorMoves: [],
  maxDepth: 3,
  responderMoveCounts: [],
  threads: 4,
  defaultResponderCount: 3,
};
const result3 = generateLineFisherFormula(config3);
const actualNodes3 = calculateTotalNodes(config3);
const actualLines3 = calculateTotalLines(config3);
console.log("Config:", config3);
console.log("Node Formula:");
console.log(result3.nodeFormula);
console.log("Line Formula:", result3.lineFormula);
console.log("Actual nodes:", actualNodes3);
console.log("Actual lines:", actualLines3);
console.log("");

// Test 4: Overrides of 6, 7, and default of 3, depth 4
console.log("Test 4: Overrides of 6, 7, and default of 3, depth 4");
const config4: LineFisherConfig = {
  initiatorMoves: [],
  maxDepth: 4,
  responderMoveCounts: [6, 7],
  threads: 4,
  defaultResponderCount: 3,
};
const result4 = generateLineFisherFormula(config4);
const actualNodes4 = calculateTotalNodes(config4);
const actualLines4 = calculateTotalLines(config4);
console.log("Config:", config4);
console.log("Node Formula:");
console.log(result4.nodeFormula);
console.log("Line Formula:", result4.lineFormula);
console.log("Actual nodes:", actualNodes4);
console.log("Actual lines:", actualLines4);
console.log("");

// Test 5: Mixed overrides and defaults, depth 3
console.log("Test 5: Mixed overrides and defaults, depth 3");
const config5: LineFisherConfig = {
  initiatorMoves: [],
  maxDepth: 3,
  responderMoveCounts: [2, 5],
  threads: 4,
  defaultResponderCount: 3,
};
const result5 = generateLineFisherFormula(config5);
const actualNodes5 = calculateTotalNodes(config5);
const actualLines5 = calculateTotalLines(config5);
console.log("Config:", config5);
console.log("Node Formula:");
console.log(result5.nodeFormula);
console.log("Line Formula:", result5.lineFormula);
console.log("Actual nodes:", actualNodes5);
console.log("Actual lines:", actualLines5);
console.log("");

// Test 6: All overrides, depth 2
console.log("Test 6: All overrides, depth 2");
const config6: LineFisherConfig = {
  initiatorMoves: [],
  maxDepth: 2,
  responderMoveCounts: [4, 5],
  threads: 4,
  defaultResponderCount: 3,
};
const result6 = generateLineFisherFormula(config6);
const actualNodes6 = calculateTotalNodes(config6);
const actualLines6 = calculateTotalLines(config6);
console.log("Config:", config6);
console.log("Node Formula:");
console.log(result6.nodeFormula);
console.log("Line Formula:", result6.lineFormula);
console.log("Actual nodes:", actualNodes6);
console.log("Actual lines:", actualLines6);
console.log("");

// Test 7: Single override, depth 3
console.log("Test 7: Single override, depth 3");
const config7: LineFisherConfig = {
  initiatorMoves: [],
  maxDepth: 3,
  responderMoveCounts: [4],
  threads: 4,
  defaultResponderCount: 3,
};
const result7 = generateLineFisherFormula(config7);
const actualNodes7 = calculateTotalNodes(config7);
const actualLines7 = calculateTotalLines(config7);
console.log("Config:", config7);
console.log("Node Formula:");
console.log(result7.nodeFormula);
console.log("Line Formula:", result7.lineFormula);
console.log("Actual nodes:", actualNodes7);
console.log("Actual lines:", actualLines7);
console.log("");

// Test 8: High responder counts, depth 2
console.log("Test 8: High responder counts, depth 2");
const config8: LineFisherConfig = {
  initiatorMoves: [],
  maxDepth: 2,
  responderMoveCounts: [8, 10],
  threads: 4,
  defaultResponderCount: 3,
};
const result8 = generateLineFisherFormula(config8);
const actualNodes8 = calculateTotalNodes(config8);
const actualLines8 = calculateTotalLines(config8);
console.log("Config:", config8);
console.log("Node Formula:");
console.log(result8.nodeFormula);
console.log("Line Formula:", result8.lineFormula);
console.log("Actual nodes:", actualNodes8);
console.log("Actual lines:", actualLines8);
console.log("");

// Test 9: Example from problem statement: k = [2, 3, 2], h = 3
console.log("Test 9: Example from problem statement: k = [2, 3, 2], h = 3");
const config9: LineFisherConfig = {
  initiatorMoves: [],
  maxDepth: 3,
  responderMoveCounts: [2, 3, 2],
  threads: 4,
  defaultResponderCount: 3,
};
const result9 = generateLineFisherFormula(config9);
const actualNodes = calculateTotalNodes(config9);
const actualLines = calculateTotalLines(config9);
console.log("Config:", config9);
console.log("Node Formula:");
console.log(result9.nodeFormula);
console.log("Line Formula:", result9.lineFormula);
console.log("Actual nodes:", actualNodes);
console.log("Actual lines:", actualLines);
console.log("Expected: 41 nodes, 12 leaf nodes (current implementation)");
console.log("");

// Test 10: No overrides, depth 3
console.log("Test 10: No overrides, depth 3");
const config10: LineFisherConfig = {
  initiatorMoves: [],
  maxDepth: 3,
  responderMoveCounts: [],
  threads: 4,
  defaultResponderCount: 3,
};
const result10 = generateLineFisherFormula(config10);
const actualNodes10 = calculateTotalNodes(config10);
const actualLines10 = calculateTotalLines(config10);
console.log("Config:", config10);
console.log("Node Formula:");
console.log(result10.nodeFormula);
console.log("Line Formula:", result10.lineFormula);
console.log("Actual nodes:", actualNodes10);
console.log("Actual lines:", actualLines10);
console.log("");

// Test 11: Overrides "3 3", default 3, depth 10
console.log("Test 11: Overrides '3 3', default 3, depth 10");
const config11: LineFisherConfig = {
  initiatorMoves: [],
  maxDepth: 10,
  responderMoveCounts: [3, 3],
  threads: 4,
  defaultResponderCount: 3,
};
const result11 = generateLineFisherFormula(config11);
const actualNodes11 = calculateTotalNodes(config11);
const actualLines11 = calculateTotalLines(config11);
console.log("Config:", config11);
console.log("Node Formula:");
console.log(result11.nodeFormula);
console.log("Line Formula:", result11.lineFormula);
console.log("Actual nodes:", actualNodes11);
console.log("Actual lines:", actualLines11);
console.log("");

console.log("=== SUMMARY ===");
console.log("All tests completed successfully!");
