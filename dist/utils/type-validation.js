import {
  createPieceNotation,
  createPieceTypeNotation,
  createColorNotation,
} from "../line/types.js";
/**
 * Type Validation Utilities
 *
 * Provides runtime validation for opaque types to catch TypeScript coverage gaps.
 */
export function validatePiece(piece) {
  return (
    typeof piece === "string" &&
    piece.length === 1 &&
    "PNBRQK".includes(piece.toUpperCase())
  );
}
export function validatePieceType(type) {
  return (
    typeof type === "string" &&
    ["P", "N", "B", "R", "Q", "K"].includes(type.toUpperCase())
  );
}
export function validateColor(color) {
  return typeof color === "string" && ["W", "B"].includes(color.toUpperCase());
}
export function validatePieceWithColor(piece) {
  return (
    typeof piece === "string" &&
    piece.length === 1 &&
    "PNBRQKpnbrqk".includes(piece)
  );
}
export function validatePieceTypeWithColor(type) {
  return (
    typeof type === "string" &&
    ["P", "N", "B", "R", "Q", "K", "p", "n", "b", "r", "q", "k"].includes(type)
  );
}
export function validateValue(value) {
  return typeof value === "number" && !isNaN(value) && isFinite(value);
}
export function validateStringValue(value) {
  return typeof value === "string" && value.length > 0;
}
export function validateBooleanValue(value) {
  return typeof value === "boolean";
}
export function validatePieceTypeForNotation(piece) {
  return (
    typeof piece === "string" && ["P", "N", "B", "R", "Q", "K"].includes(piece)
  );
}
export function validatePieceTypeForFEN(piece) {
  return (
    typeof piece === "string" &&
    piece.length === 1 &&
    "PNBRQKpnbrqk".includes(piece)
  );
}
export function validateType(type) {
  return (
    typeof type === "string" &&
    ["P", "N", "B", "R", "Q", "K"].includes(type.toUpperCase())
  );
}
export function validateColorForFEN(color) {
  return typeof color === "string" && ["w", "b"].includes(color.toLowerCase());
}
// Add the missing validation functions that were being called
export function validatePieceNotation(piece) {
  return (
    typeof piece === "string" &&
    piece.length === 1 &&
    /^[PNBRQKpnbrqk]$/.test(piece)
  );
}
export function validatePieceTypeNotation(type) {
  return typeof type === "string" && /^[PNBRQK]$/.test(type);
}
export function validateColorNotation(color) {
  return typeof color === "string" && (color === "w" || color === "b");
}
/**
 * Safe piece notation creation with validation
 */
export const safeCreatePieceNotation = (value) => {
  if (!validatePieceNotation(value)) {
    return null;
  }
  try {
    return createPieceNotation(value);
  } catch (error) {
    console.error("Error creating piece notation:", error);
    return null;
  }
};
/**
 * Safe piece type notation creation with validation
 */
export const safeCreatePieceTypeNotation = (value) => {
  if (!validatePieceTypeNotation(value)) {
    return null;
  }
  try {
    return createPieceTypeNotation(value);
  } catch (error) {
    console.error("Error creating piece type notation:", error);
    return null;
  }
};
/**
 * Safe color notation creation with validation
 */
export const safeCreateColorNotation = (value) => {
  if (!validateColorNotation(value)) {
    return null;
  }
  try {
    return createColorNotation(value);
  } catch (error) {
    console.error("Error creating color notation:", error);
    return null;
  }
};
/**
 * Comprehensive validation for piece-related operations
 */
export const validatePieceOperation = (operation, piece, additionalData) => {
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
export const assertPieceNotation = (piece) => {
  if (!validatePieceNotation(piece)) {
    throw new Error(`Invalid piece notation: ${piece}`);
  }
};
export const assertPieceTypeNotation = (type) => {
  if (!validatePieceTypeNotation(type)) {
    throw new Error(`Invalid piece type notation: ${type}`);
  }
};
export const assertColorNotation = (color) => {
  if (!validateColorNotation(color)) {
    throw new Error(`Invalid color notation: ${color}`);
  }
};
//# sourceMappingURL=type-validation.js.map
