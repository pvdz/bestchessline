import { OpeningLine } from "./practice-types.js";
export declare function parseOpeningLines(text: string): OpeningLine[];
export declare function convertOpeningLinesToPCN(
  openingLines: OpeningLine[],
  startingFEN: string,
): OpeningLine[];
export declare function buildPositionMap(
  openingLines: OpeningLine[],
  startingFEN: string,
): Map<string, string[]>;
