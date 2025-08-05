import { parseMove } from "./move-parsing.js";

interface MoveNotation {
  from: string;
  to: string;
  piece: string;
}

export function getMoveNotation(move: MoveNotation): string {
  return `${move.piece}${move.from}${move.to}`;
}

export function parseMoveFromSAN(
  san: string,
  fen: string,
): MoveNotation | null {
  const parsedMove = parseMove(san, fen);
  if (!parsedMove) return null;

  return {
    from: parsedMove.from,
    to: parsedMove.to,
    piece: parsedMove.piece,
  };
}
