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
export const DEFAULT_PAGINATION_CONFIG: TreePaginationConfig = {
  pageSize: 50,
  currentPage: 1,
  maxVisibleNodes: 200,
  showProgressInsteadOfTree: false,
  progressThreshold: 1000, // Show progress instead of tree when node count exceeds this
};

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
export const calculateTreeStatistics = (
  analysis: TreeDiggerAnalysis,
): {
  totalNodes: number;
  totalLeafs: number;
  maxDepth: number;
  averageDepth: number;
} => {
  let totalNodes = 0;
  let totalLeafs = 0;
  let maxDepth = 0;
  let totalDepth = 0;

  const traverseTree = (nodes: TreeDiggerNode[], depth: number): void => {
    for (const node of nodes) {
      totalNodes++;
      totalDepth += depth;
      maxDepth = Math.max(maxDepth, depth);

      if (node.children.length === 0) {
        totalLeafs++;
      } else {
        traverseTree(node.children, depth + 1);
      }
    }
  };

  traverseTree(analysis.nodes, 0);

  return {
    totalNodes,
    totalLeafs,
    maxDepth,
    averageDepth: totalNodes > 0 ? totalDepth / totalNodes : 0,
  };
};

/**
 * Get paginated tree nodes
 */
export const getPaginatedTreeNodes = (
  analysis: TreeDiggerAnalysis,
  config: TreePaginationConfig = DEFAULT_PAGINATION_CONFIG,
): TreePaginationState => {
  const stats = calculateTreeStatistics(analysis);
  const isLargeTree = stats.totalNodes > config.progressThreshold;

  if (isLargeTree && config.showProgressInsteadOfTree) {
    // Return progress state instead of tree nodes
    return {
      config,
      totalNodes: stats.totalNodes,
      totalPages: 0,
      visibleNodes: [],
      isLargeTree: true,
    };
  }

  // Flatten tree nodes for pagination
  const allNodes: TreeDiggerNode[] = [];
  const flattenTree = (nodes: TreeDiggerNode[]): void => {
    for (const node of nodes) {
      allNodes.push(node);
      if (node.children.length > 0) {
        flattenTree(node.children);
      }
    }
  };

  flattenTree(analysis.nodes);

  const totalPages = Math.ceil(allNodes.length / config.pageSize);
  const startIndex = (config.currentPage - 1) * config.pageSize;
  const endIndex = Math.min(startIndex + config.pageSize, allNodes.length);
  const visibleNodes = allNodes.slice(startIndex, endIndex);

  return {
    config,
    totalNodes: stats.totalNodes,
    totalPages,
    visibleNodes,
    isLargeTree: false,
  };
};

/**
 * Render pagination controls
 */
export const renderPaginationControls = (
  paginationState: TreePaginationState,
  _onPageChange: (page: number) => void,
): string => {
  if (paginationState.isLargeTree) {
    return `
      <div class="tree-pagination-large">
        <div class="pagination-warning">
          <strong>Large Tree Detected</strong>
          <p>This tree has ${paginationState.totalNodes.toLocaleString()} nodes. 
          Showing progress instead of full tree for better performance.</p>
        </div>
      </div>
    `;
  }

  if (paginationState.totalPages <= 1) {
    return "";
  }

  const { currentPage } = paginationState.config;
  const { totalPages } = paginationState;
  const pages = [];

  // Add first page
  if (currentPage > 1) {
    pages.push(`<button class="pagination-btn" data-page="1">1</button>`);
  }

  // Add ellipsis if needed
  if (currentPage > 3) {
    pages.push(`<span class="pagination-ellipsis">...</span>`);
  }

  // Add pages around current page
  const startPage = Math.max(2, currentPage - 1);
  const endPage = Math.min(totalPages - 1, currentPage + 1);

  for (let i = startPage; i <= endPage; i++) {
    const isCurrent = i === currentPage;
    pages.push(
      `<button class="pagination-btn ${isCurrent ? "current" : ""}" data-page="${i}">${i}</button>`,
    );
  }

  // Add ellipsis if needed
  if (currentPage < totalPages - 2) {
    pages.push(`<span class="pagination-ellipsis">...</span>`);
  }

  // Add last page
  if (currentPage < totalPages) {
    pages.push(
      `<button class="pagination-btn" data-page="${totalPages}">${totalPages}</button>`,
    );
  }

  return `
    <div class="tree-pagination">
      <div class="pagination-info">
        Showing ${(currentPage - 1) * paginationState.config.pageSize + 1}-${Math.min(
          currentPage * paginationState.config.pageSize,
          paginationState.totalNodes,
        )} of ${paginationState.totalNodes.toLocaleString()} nodes
      </div>
      <div class="pagination-controls">
        <button class="pagination-btn" data-page="${currentPage - 1}" ${currentPage <= 1 ? "disabled" : ""}>
          ← Previous
        </button>
        ${pages.join("")}
        <button class="pagination-btn" data-page="${currentPage + 1}" ${currentPage >= totalPages ? "disabled" : ""}>
          Next →
        </button>
      </div>
    </div>
  `;
};

/**
 * Render progress summary for large trees
 */
export const renderLargeTreeProgress = (
  analysis: TreeDiggerAnalysis,
): string => {
  const stats = calculateTreeStatistics(analysis);
  const progress = analysis.isComplete
    ? 100
    : Math.round(
        (analysis.analyzedPositions.size / analysis.totalPositions) * 100,
      );

  return `
    <div class="tree-progress-summary">
      <h3>Tree Analysis Progress</h3>
      <div class="progress-stats">
        <div class="progress-stat">
          <span class="stat-label">Total Nodes:</span>
          <span class="stat-value">${stats.totalNodes.toLocaleString()}</span>
        </div>
        <div class="progress-stat">
          <span class="stat-label">Total Leafs:</span>
          <span class="stat-value">${stats.totalLeafs.toLocaleString()}</span>
        </div>
        <div class="progress-stat">
          <span class="stat-label">Max Depth:</span>
          <span class="stat-value">${stats.maxDepth}</span>
        </div>
        <div class="progress-stat">
          <span class="stat-label">Average Depth:</span>
          <span class="stat-value">${stats.averageDepth.toFixed(1)}</span>
        </div>
        <div class="progress-stat">
          <span class="stat-label">Unique Positions:</span>
          <span class="stat-value">${analysis.analyzedPositions.size.toLocaleString()}</span>
        </div>
        <div class="progress-stat">
          <span class="stat-label">Progress:</span>
          <span class="stat-value">${progress}%</span>
        </div>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${progress}%"></div>
      </div>
      <div class="progress-status">
        ${analysis.isComplete ? "✅ Analysis Complete" : "🔄 Analysis in Progress"}
      </div>
    </div>
  `;
};

/**
 * Handle pagination button clicks
 */
export const handlePaginationClick = (
  event: Event,
  onPageChange: (page: number) => void,
): void => {
  const target = event.target as HTMLElement;
  if (
    target.classList.contains("pagination-btn") &&
    !target.hasAttribute("disabled")
  ) {
    const page = parseInt(target.getAttribute("data-page") || "1");
    onPageChange(page);
  }
};
