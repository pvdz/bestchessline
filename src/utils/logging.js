"use strict";
/**
 * Logging Utility Functions
 *
 * Provides controlled logging capabilities with enable/disable functionality.
 * These functions allow for debug logging that can be turned on/off as needed.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = log;
exports.logError = logError;
// ============================================================================
// LOGGING CONFIGURATION
// ============================================================================
var loggingEnabled = false;
/**
 * Logging utility function
 * @param args - Arguments to pass to console.log
 */
function log() {
  var args = [];
  for (var _i = 0; _i < arguments.length; _i++) {
    args[_i] = arguments[_i];
  }
  if (loggingEnabled) {
    console.log.apply(console, args);
  }
}
/**
 * Error logging utility function
 * @param args - Arguments to pass to console.error
 */
function logError() {
  var args = [];
  for (var _i = 0; _i < arguments.length; _i++) {
    args[_i] = arguments[_i];
  }
  if (loggingEnabled) {
    console.error.apply(console, args);
  }
}
