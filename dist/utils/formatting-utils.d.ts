/**
 * Formatting Utility Functions
 *
 * Provides functions for formatting scores, times, and other display-related
 * utilities for the chess application.
 */
/**
 * Format a score with proper mate notation using mateIn
 * @param score The score in centipawns
 * @param mateIn The number of moves required for mate (0 if not a mate)
 * @returns Formatted score string
 */
export declare function formatScoreWithMateIn(score: number, mateIn: number): string;
/**
 * Format a time duration in milliseconds to a human-readable string
 * @param ms Time in milliseconds
 * @returns Formatted time string
 */
export declare function formatTime(ms: number): string;
