import type {
  PieceNotation,
  PieceTypeNotation,
  ColorNotation,
  WhitePieceNotation,
  BlackPieceNotation,
} from "../types.js";
/**
 * Type Validation Utilities
 *
 * Provides runtime validation for opaque types to catch TypeScript coverage gaps.
 */
/**
 * Validate piece notation with detailed error reporting
 */
export declare const validatePieceNotation: (
  piece: unknown,
) => piece is PieceNotation;
/**
 * Validate piece type notation with detailed error reporting
 */
export declare const validatePieceTypeNotation: (
  type: unknown,
) => type is PieceTypeNotation;
/**
 * Validate color notation with detailed error reporting
 */
export declare const validateColorNotation: (
  color: unknown,
) => color is ColorNotation;
/**
 * Validate white piece notation with detailed error reporting
 */
export declare const validateWhitePieceNotation: (
  piece: unknown,
) => piece is WhitePieceNotation;
/**
 * Validate black piece notation with detailed error reporting
 */
export declare const validateBlackPieceNotation: (
  piece: unknown,
) => piece is BlackPieceNotation;
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
