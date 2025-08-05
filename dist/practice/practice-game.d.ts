import { GameState, DOMElements } from "./practice-types.js";
export declare function handleSquareClick(
  square: string,
  gameState: GameState,
  dom: DOMElements,
): void;
export declare function makeMove(
  fromSquare: string,
  toSquare: string,
  gameState: GameState,
  dom: DOMElements,
): void;
export declare function makeComputerMove(
  gameState: GameState,
  dom: DOMElements,
): void;
export declare function showHintForCurrentPosition(gameState: GameState): void;
