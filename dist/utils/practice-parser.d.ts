interface MoveNotation {
  from: string;
  to: string;
  piece: string;
}
export declare function getMoveNotation(move: MoveNotation): string;
export declare function parseMoveFromSAN(
  san: string,
  fen: string,
): MoveNotation | null;
export {};
