import { OpeningLine } from "./practice-types.js";
export declare function constructMoveManually(move: string, fen: string): any;
export declare function parseOpeningLines(text: string): OpeningLine[];
export declare function buildPositionMap(
  openingLines: OpeningLine[],
  startingFEN: string,
): Map<string, string[]>;
