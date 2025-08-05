import type {
  PieceNotation,
  PieceTypeNotation,
  ColorNotation,
} from "../line/types.js";
/**
 * Type Validation Utilities
 *
 * Provides runtime validation for opaque types to catch TypeScript coverage gaps.
 */
export declare function validatePiece(piece: string): boolean;
export declare function validatePieceType(type: string): boolean;
export declare function validateColor(color: string): boolean;
export declare function validatePieceWithColor(piece: string): boolean;
export declare function validatePieceTypeWithColor(type: string): boolean;
export declare function validateValue(value: number): boolean;
export declare function validateStringValue(value: string): boolean;
export declare function validateBooleanValue(value: boolean): boolean;
export declare function validatePieceTypeForNotation(piece: string): boolean;
export declare function validatePieceTypeForFEN(piece: string): boolean;
export declare function validateType(type: string): boolean;
export declare function validateColorForFEN(color: string): boolean;
export declare function validatePieceNotation(
  piece: unknown,
): piece is PieceNotation;
export declare function validatePieceTypeNotation(
  type: unknown,
): type is PieceTypeNotation;
export declare function validateColorNotation(
  color: unknown,
): color is ColorNotation;
/**
 * Safe piece notation creation with validation
 */
export declare const safeCreatePieceNotation: (
  value: unknown,
) => PieceNotation | null;
/**
 * Safe piece type notation creation with validation
 */
export declare const safeCreatePieceTypeNotation: (
  value: unknown,
) => PieceTypeNotation | null;
/**
 * Safe color notation creation with validation
 */
export declare const safeCreateColorNotation: (
  value: unknown,
) => ColorNotation | null;
/**
 * Comprehensive validation for piece-related operations
 */
export declare const validatePieceOperation: (
  operation: string,
  piece: unknown,
  additionalData?: Record<string, unknown>,
) => boolean;
/**
 * Runtime type checking for opaque types
 */
export declare const assertPieceNotation: (
  piece: unknown,
) => asserts piece is PieceNotation;
export declare const assertPieceTypeNotation: (
  type: unknown,
) => asserts type is PieceTypeNotation;
export declare const assertColorNotation: (
  color: unknown,
) => asserts color is ColorNotation;
