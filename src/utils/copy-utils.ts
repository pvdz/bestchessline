import { BestLineNode } from "../types.js";
import { applyMoveToFEN } from "./fen-manipulation.js";
import { moveToNotation } from "./notation-utils.js";
import * as BestLines from "../tree-digger.js";

/**
 * Copy and Export Utility Functions
 *
 * Provides functions for copying and exporting tree data.
 */

/**
 * Format a line of moves with move numbers
 * @param moves Array of moves to format
 * @returns Formatted line string
 */
export function formatLineWithMoveNumbers(moves: BestLineNode[]): string {
  if (moves.length === 0) return "";

  let result = "";
  let moveNumber = 1;

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    const moveText = moveToNotation(move.move);

    if (i % 2 === 0) {
      // White's move - add move number
      result += `${moveNumber}. ${moveText}`;
    } else {
      // Black's move - just add the move
      result += ` ${moveText}`;
      moveNumber++;
    }

    // Add space between moves (except for the last move)
    if (i < moves.length - 1) {
      result += " ";
    }
  }

  return result;
}

/**
 * Initialize copy button functionality
 */
export function initializeCopyButton(): void {
  const copyBtn = document.getElementById("copy-tree-digger-tree");
  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      const analysis = BestLines.getCurrentAnalysis();
      if (analysis && analysis.nodes.length > 0) {
        const treeText = generateAllLines(analysis.nodes);

        // Debug: Log the generated text to see if it's complete
        console.log("Generated tree text:", treeText);
        console.log("Text length:", treeText.length);
        console.log("Number of lines:", treeText.split("\n").length);

        navigator.clipboard
          .writeText(treeText)
          .then(() => {
            copyBtn.textContent = "Copied!";
            setTimeout(() => {
              copyBtn.textContent = "Copy";
            }, 2000);
          })
          .catch((err) => {
            console.error("Failed to copy: ", err);
            copyBtn.textContent = "Copy Failed";
            setTimeout(() => {
              copyBtn.textContent = "Copy";
            }, 2000);
          });
      } else {
        // Show a short confirmation for no data
        const toast = document.createElement("div");
        toast.textContent = "No tree to copy!";
        toast.style.position = "fixed";
        toast.style.bottom = "24px";
        toast.style.left = "50%";
        toast.style.transform = "translateX(-50%)";
        toast.style.background = "#dc3545";
        toast.style.color = "#fff";
        toast.style.padding = "8px 16px";
        toast.style.borderRadius = "6px";
        toast.style.zIndex = "9999";
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 1200);
      }
    });
  }
}

/**
 * Generate all complete lines from the tree
 * @param nodes Array of root nodes to generate lines from
 * @returns String containing all complete lines
 */
export function generateAllLines(nodes: BestLineNode[]): string {
  let result = "";
  let lineCount = 0;

  const traverseNode = (
    node: BestLineNode,
    currentLine: BestLineNode[] = [],
  ): void => {
    // Add current node to the line
    const newLine = [...currentLine, node];

    if (node.children.length === 0) {
      // Check if this is a transposed node (not a real leaf)
      const positionAfterMove = applyMoveToFEN(node.fen, node.move);
      const analysis = BestLines.getCurrentAnalysis();
      const isTransposition =
        analysis && analysis.analyzedPositions.has(positionAfterMove);

      if (!isTransposition) {
        // This is a real leaf node - output the complete line
        const lineText = formatLineWithMoveNumbers(newLine);
        result += `${lineText}\n`;
        lineCount++;
        console.log(`Generated line ${lineCount}:`, lineText);
      } else {
        console.log(`Skipping transposed node: ${moveToNotation(node.move)}`);
      }
    } else {
      // Continue traversing children
      for (const child of node.children) {
        traverseNode(child, newLine);
      }
    }
  };

  // Traverse all root nodes
  for (const rootNode of nodes) {
    traverseNode(rootNode);
  }

  console.log(`Total lines generated: ${lineCount}`);
  return result;
}
