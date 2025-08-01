import type { TreeDiggerNode, TreeDiggerAnalysis } from "../types.js";
/**
 * Tree Digger Pagination Utility Functions
 *
 * Provides functions for paginating large tree displays to improve performance.
 */
/**
 * Pagination configuration
 */
export interface TreePaginationConfig {
  pageSize: number;
  currentPage: number;
  maxVisibleNodes: number;
  showProgressInsteadOfTree: boolean;
  progressThreshold: number;
}
/**
 * Default pagination configuration
 */
export declare const DEFAULT_PAGINATION_CONFIG: TreePaginationConfig;
/**
 * Pagination state
 */
export interface TreePaginationState {
  config: TreePaginationConfig;
  totalNodes: number;
  totalPages: number;
  visibleNodes: TreeDiggerNode[];
  isLargeTree: boolean;
}
/**
 * Calculate tree statistics for pagination
 */
export declare const calculateTreeStatistics: (
  analysis: TreeDiggerAnalysis,
) => {
  totalNodes: number;
  totalLeafs: number;
  maxDepth: number;
  averageDepth: number;
};
/**
 * Get paginated tree nodes
 */
export declare const getPaginatedTreeNodes: (
  analysis: TreeDiggerAnalysis,
  config?: TreePaginationConfig,
) => TreePaginationState;
/**
 * Render pagination controls
 */
export declare const renderPaginationControls: (
  paginationState: TreePaginationState,
  onPageChange: (page: number) => void,
) => string;
/**
 * Render progress summary for large trees
 */
export declare const renderLargeTreeProgress: (
  analysis: TreeDiggerAnalysis,
) => string;
/**
 * Handle pagination button clicks
 */
export declare const handlePaginationClick: (
  event: Event,
  onPageChange: (page: number) => void,
) => void;
