/**
 * API Types
 *
 * Standard types for API requests and responses
 */

/**
 * Standard API Response Wrapper
 */
export interface ApiResponse<T = any> {
  data: T;
  meta: {
    timestamp: string;
    requestId: string;
    version?: string;
  };
}

/**
 * Paginated Response
 */
export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  meta: ApiResponse['meta'] & {
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  };
}

/**
 * Cursor-based Paginated Response
 */
export interface CursorPaginatedResponse<T = any> extends ApiResponse<T[]> {
  meta: ApiResponse['meta'] & {
    pagination: {
      limit: number;
      nextCursor: string | null;
      hasMore: boolean;
    };
  };
}

/**
 * Pagination Query Params
 */
export interface PaginationParams {
  limit?: number;
  offset?: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

/**
 * Cursor Pagination Query Params
 */
export interface CursorPaginationParams {
  limit?: number;
  before?: string;
  after?: string;
}
