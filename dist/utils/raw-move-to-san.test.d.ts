/**
 * Test file for rawMoveToSAN function
 *
 * To run:
 * 1. Compile: node_modules/.bin/tsc --outDir dist --rootDir src src/utils/raw-move-to-san.test.ts
 * 2. Run: node dist/utils/raw-move-to-san.test.js
 */
declare function parseFEN(fen: string): {
  board: string[][];
  turn: string;
};
declare const rawMoveToSAN: (rawMove: string, fen: string) => string;
declare const testCases: {
  name: string;
  fen: string;
  rawMove: string;
  expected: string;
}[];
declare function runTests(): void;
