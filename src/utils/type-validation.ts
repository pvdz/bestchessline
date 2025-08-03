import type {
  PieceNotation,
  PieceTypeNotation,
  ColorNotation,
  WhitePieceNotation,
  BlackPieceNotation,
} from "../types.js";
import {
  createPieceNotation,
  createPieceTypeNotation,
  createColorNotation,
} from "../types.js";

/**
 * Type Validation Utilities
 *
 * Provides runtime validation for opaque types to catch TypeScript coverage gaps.
 */

/**
 * Validate piece notation with detailed error reporting
 */
export const validatePieceNotation = (
  piece: unknown,
): piece is PieceNotation => {
  if (typeof piece !== "string") {
    console.error(`Invalid piece notation type: ${typeof piece}`, piece);
    return false;
  }

  if (piece.length !== 1) {
    console.error(`Invalid piece notation length: ${piece.length}`, piece);
    return false;
  }

  if (!/^[PNBRQKpnbrqk]$/.test(piece)) {
    console.error(`Invalid piece notation character: ${piece}`);
    return false;
  }

  return true;
};

/**
 * Validate piece type notation with detailed error reporting
 */
export const validatePieceTypeNotation = (
  type: unknown,
): type is PieceTypeNotation => {
  if (typeof type !== "string") {
    console.error(`Invalid piece type notation type: ${typeof type}`, type);
    return false;
  }

  if (!/^[PNBRQK]$/.test(type)) {
    console.error(`Invalid piece type notation: ${type}`);
    return false;
  }

  return true;
};

/**
 * Validate color notation with detailed error reporting
 */
export const validateColorNotation = (
  color: unknown,
): color is ColorNotation => {
  if (typeof color !== "string") {
    console.error(`Invalid color notation type: ${typeof color}`, color);
    return false;
  }

  if (color !== "w" && color !== "b") {
    console.error(`Invalid color notation: ${color}`);
    return false;
  }

  return true;
};

/**
 * Validate white piece notation with detailed error reporting
 */
export const validateWhitePieceNotation = (
  piece: unknown,
): piece is WhitePieceNotation => {
  if (typeof piece !== "string") {
    console.error(`Invalid white piece notation type: ${typeof piece}`, piece);
    return false;
  }

  if (!/^[PNBRQK]$/.test(piece)) {
    console.error(`Invalid white piece notation: ${piece}`);
    return false;
  }

  return true;
};

/**
 * Validate black piece notation with detailed error reporting
 */
export const validateBlackPieceNotation = (
  piece: unknown,
): piece is BlackPieceNotation => {
  if (typeof piece !== "string") {
    console.error(`Invalid black piece notation type: ${typeof piece}`, piece);
    return false;
  }

  if (!/^[pnbrqk]$/.test(piece)) {
    console.error(`Invalid black piece notation: ${piece}`);
    return false;
  }

  return true;
};

/**
 * Safe piece notation creation with validation
 */
export const safeCreatePieceNotation = (
  value: unknown,
): PieceNotation | null => {
  if (!validatePieceNotation(value)) {
    return null;
  }

  try {
    return createPieceNotation(value as string);
  } catch (error) {
    console.error("Error creating piece notation:", error);
    return null;
  }
};

/**
 * Safe piece type notation creation with validation
 */
export const safeCreatePieceTypeNotation = (
  value: unknown,
): PieceTypeNotation | null => {
  if (!validatePieceTypeNotation(value)) {
    return null;
  }

  try {
    return createPieceTypeNotation(value as string);
  } catch (error) {
    console.error("Error creating piece type notation:", error);
    return null;
  }
};

/**
 * Safe color notation creation with validation
 */
export const safeCreateColorNotation = (
  value: unknown,
): ColorNotation | null => {
  if (!validateColorNotation(value)) {
    return null;
  }

  try {
    return createColorNotation(value as string);
  } catch (error) {
    console.error("Error creating color notation:", error);
    return null;
  }
};

/**
 * Comprehensive validation for piece-related operations
 */
export const validatePieceOperation = (
  operation: string,
  piece: unknown,
  additionalData?: Record<string, unknown>,
): boolean => {
  const isValid = validatePieceNotation(piece);

  if (!isValid) {
    console.error(`Validation failed for operation: ${operation}`, {
      piece,
      pieceType: typeof piece,
      additionalData,
    });
  }

  return isValid;
};

/**
 * Runtime type checking for opaque types
 */
export const assertPieceNotation = (
  piece: unknown,
): asserts piece is PieceNotation => {
  if (!validatePieceNotation(piece)) {
    throw new Error(`Invalid piece notation: ${piece}`);
  }
};

export const assertPieceTypeNotation = (
  type: unknown,
): asserts type is PieceTypeNotation => {
  if (!validatePieceTypeNotation(type)) {
    throw new Error(`Invalid piece type notation: ${type}`);
  }
};

export const assertColorNotation = (
  color: unknown,
): asserts color is ColorNotation => {
  if (!validateColorNotation(color)) {
    throw new Error(`Invalid color notation: ${color}`);
  }
};
