export interface SessionInfo {
  title?: string;
  description?: string;
  [key: string]: any;
}

/**
 * Browser-only stub for the real DatabaseService.
 * Now redirects to the adapter which provides compatibility
 * with the new database service while maintaining the old API.
 */
export { DatabaseService, databaseService } from './databaseServiceAdapter';