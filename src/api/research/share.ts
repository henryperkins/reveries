/**
 * Backend API endpoints for research session sharing
 * Handles creation, retrieval, and management of shared research sessions
 */

import { ExportedResearchData } from '@/types';

// Types for sharing system
export interface ShareRequest {
  sessionId: string;
  data: ExportedResearchData;
  options: ShareOptions;
}

export interface ShareOptions {
  isPublic: boolean;
  expiresIn: number; // hours
  password?: string;
  allowComments?: boolean;
  allowDownload?: boolean;
}

export interface ShareRecord {
  shareId: string;
  sessionId: string;
  data: ExportedResearchData;
  options: ShareOptions;
  createdAt: string;
  expiresAt: string;
  accessCount: number;
  lastAccessedAt?: string;
  isActive: boolean;
}

export interface ShareValidation {
  isValid: boolean;
  isExpired?: boolean;
  requiresPassword?: boolean;
  isPublic?: boolean;
  accessCount?: number;
}

// In-memory storage for demonstration (in production, use a database)
class ShareStorage {
  private static instance: ShareStorage;
  private shares: Map<string, ShareRecord> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  private constructor() {
    // Clean up expired shares every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredShares();
    }, 3600000);
  }

  public static getInstance(): ShareStorage {
    if (!ShareStorage.instance) {
      ShareStorage.instance = new ShareStorage();
    }
    return ShareStorage.instance;
  }

  generateShareId(_shareId?: string): string {
    return `share_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  async createShare(request: ShareRequest): Promise<ShareRecord> {
    const shareId = this.generateShareId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + request.options.expiresIn * 3600000);

    const shareRecord: ShareRecord = {
      shareId,
      sessionId: request.sessionId,
      data: request.data,
      options: request.options,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      accessCount: 0,
      isActive: true
    };

    this.shares.set(shareId, shareRecord);
    return shareRecord;
  }

  async getShare(shareId: string, password?: string): Promise<ShareRecord | null> {
    const share = this.shares.get(shareId);
    
    if (!share || !share.isActive) {
      return null;
    }

    // Check expiration
    if (new Date() > new Date(share.expiresAt)) {
      share.isActive = false;
      return null;
    }

    // Check password if required
    if (share.options.password && share.options.password !== password) {
      throw new Error('Invalid password');
    }

    // Update access tracking
    share.accessCount++;
    share.lastAccessedAt = new Date().toISOString();

    return share;
  }

  async validateShare(shareId: string): Promise<ShareValidation> {
    const share = this.shares.get(shareId);
    
    if (!share || !share.isActive) {
      return { isValid: false };
    }

    const isExpired = new Date() > new Date(share.expiresAt);
    if (isExpired) {
      share.isActive = false;
      return { isValid: false, isExpired: true };
    }

    return {
      isValid: true,
      isExpired: false,
      requiresPassword: !!share.options.password,
      isPublic: share.options.isPublic,
      accessCount: share.accessCount
    };
  }

  async updateShare(_shareId: string, updates: Partial<ShareOptions>): Promise<boolean> {
    const share = this.shares.get(_shareId);
    
    if (!share || !share.isActive) {
      return false;
    }

    share.options = { ...share.options, ...updates };
    return true;
  }

  async deleteShare(shareId: string): Promise<boolean> {
    const share = this.shares.get(shareId);
    
    if (!share) {
      return false;
    }

    share.isActive = false;
    return true;
  }

  async getSharesBySession(sessionId: string): Promise<ShareRecord[]> {
    return Array.from(this.shares.values())
      .filter(share => share.sessionId === sessionId && share.isActive)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getPublicShares(limit = 50): Promise<ShareRecord[]> {
    return Array.from(this.shares.values())
      .filter(share => share.isActive && share.options.isPublic && new Date() <= new Date(share.expiresAt))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  private cleanupExpiredShares(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [_shareId, share] of this.shares.entries()) {
      if (now > new Date(share.expiresAt)) {
        share.isActive = false;
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired shares`);
    }
  }

  getStats(): { totalShares: number; activeShares: number; expiredShares: number } {
    const shares = Array.from(this.shares.values());
    const now = new Date();
    
    return {
      totalShares: shares.length,
      activeShares: shares.filter(s => s.isActive && now <= new Date(s.expiresAt)).length,
      expiredShares: shares.filter(s => now > new Date(s.expiresAt)).length
    };
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// API Handler Class
export class ShareAPIHandler {
  private storage: ShareStorage;

  constructor() {
    this.storage = ShareStorage.getInstance();
  }

  // POST /api/research/share - Create a new share
  async createShare(request: ShareRequest): Promise<{ shareId: string; shareUrl: string }> {
    try {
      // Validate request
      if (!request.sessionId || !request.data || !request.options) {
        throw new Error('Missing required fields: sessionId, data, or options');
      }

      // Validate expiration (max 30 days)
      if (request.options.expiresIn > 24 * 30) {
        throw new Error('Maximum expiration time is 30 days');
      }

      // Validate data size (max 10MB for demo)
      const dataSize = JSON.stringify(request.data).length;
      if (dataSize > 10 * 1024 * 1024) {
        throw new Error('Research data too large (max 10MB)');
      }

      const shareRecord = await this.storage.createShare(request);
      
      return {
        shareId: shareRecord.shareId,
        shareUrl: `/shared/${shareRecord.shareId}`
      };
    } catch (error) {
      console.error('Failed to create share:', error);
      throw error;
    }
  }

  // GET /api/research/share/:shareId - Retrieve shared data
  async getShare(shareId: string, password?: string): Promise<ExportedResearchData> {
    try {
      const shareRecord = await this.storage.getShare(shareId, password);
      
      if (!shareRecord) {
        throw new Error('Share not found or expired');
      }

      return shareRecord.data;
    } catch (error) {
      console.error('Failed to retrieve share:', error);
      throw error;
    }
  }

  // GET /api/research/share/:shareId/validate - Check if share is valid
  async validateShare(shareId: string): Promise<ShareValidation> {
    return this.storage.validateShare(shareId);
  }

  // PUT /api/research/share/:shareId - Update share settings
  async updateShare(shareId: string, updates: Partial<ShareOptions>): Promise<{ success: boolean }> {
    try {
      const success = await this.storage.updateShare(shareId, updates);
      
      if (!success) {
        throw new Error('Share not found or cannot be updated');
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to update share:', error);
      throw error;
    }
  }

  // DELETE /api/research/share/:shareId - Delete/deactivate share
  async deleteShare(shareId: string): Promise<{ success: boolean }> {
    try {
      const success = await this.storage.deleteShare(shareId);
      
      if (!success) {
        throw new Error('Share not found');
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to delete share:', error);
      throw error;
    }
  }

  // GET /api/research/share/session/:sessionId - Get all shares for a session
  async getSessionShares(sessionId: string): Promise<Omit<ShareRecord, 'data'>[]> {
    try {
      const shares = await this.storage.getSharesBySession(sessionId);
      
      // Return without the actual data to reduce payload size
      return shares.map(share => ({
        shareId: share.shareId,
        sessionId: share.sessionId,
        options: share.options,
        createdAt: share.createdAt,
        expiresAt: share.expiresAt,
        accessCount: share.accessCount,
        lastAccessedAt: share.lastAccessedAt,
        isActive: share.isActive
      }));
    } catch (error) {
      console.error('Failed to get session shares:', error);
      throw error;
    }
  }

  // GET /api/research/share/public - Get public shares
  async getPublicShares(limit = 20): Promise<{
    shareId: string;
    title: string;
    query: string;
    summary: any;
    createdAt: string;
    accessCount: number;
  }[]> {
    try {
      const shares = await this.storage.getPublicShares(limit);
      
      // Return minimal info for public listing
      return shares.map(share => ({
        shareId: share.shareId,
        title: share.data.query || 'Untitled Research',
        query: share.data.query,
        summary: share.data.summary,
        createdAt: share.createdAt,
        accessCount: share.accessCount
      }));
    } catch (error) {
      console.error('Failed to get public shares:', error);
      throw error;
    }
  }

  // GET /api/research/share/stats - Get sharing statistics
  async getStats(): Promise<{
    totalShares: number;
    activeShares: number;
    expiredShares: number;
  }> {
    return this.storage.getStats();
  }
}

// Express.js route handlers (if using Express)
export function createShareRoutes() {
  const handler = new ShareAPIHandler();

  return {
    // POST /api/research/share
    createShare: async (req: any, res: any) => {
      try {
        const result = await handler.createShare(req.body);
        res.status(201).json(result);
      } catch (error) {
        res.status(400).json({ 
          error: error instanceof Error ? error.message : 'Failed to create share' 
        });
      }
    },

    // GET /api/research/share/:shareId
    getShare: async (req: any, res: any) => {
      try {
        const { shareId } = req.params;
        const { password } = req.query;
        const data = await handler.getShare(shareId, password);
        res.json(data);
      } catch (error) {
        res.status(404).json({ 
          error: error instanceof Error ? error.message : 'Share not found' 
        });
      }
    },

    // GET /api/research/share/:shareId/validate
    validateShare: async (req: any, res: any) => {
      try {
        const { shareId } = req.params;
        const validation = await handler.validateShare(shareId);
        res.json(validation);
      } catch (error) {
        res.status(500).json({ 
          error: error instanceof Error ? error.message : 'Validation failed' 
        });
      }
    },

    // PUT /api/research/share/:shareId
    updateShare: async (req: any, res: any) => {
      try {
        const { shareId } = req.params;
        const result = await handler.updateShare(shareId, req.body);
        res.json(result);
      } catch (error) {
        res.status(400).json({ 
          error: error instanceof Error ? error.message : 'Failed to update share' 
        });
      }
    },

    // DELETE /api/research/share/:shareId
    deleteShare: async (req: any, res: any) => {
      try {
        const { shareId } = req.params;
        const result = await handler.deleteShare(shareId);
        res.json(result);
      } catch (error) {
        res.status(404).json({ 
          error: error instanceof Error ? error.message : 'Share not found' 
        });
      }
    },

    // GET /api/research/share/session/:sessionId
    getSessionShares: async (req: any, res: any) => {
      try {
        const { sessionId } = req.params;
        const shares = await handler.getSessionShares(sessionId);
        res.json(shares);
      } catch (error) {
        res.status(500).json({ 
          error: error instanceof Error ? error.message : 'Failed to get session shares' 
        });
      }
    },

    // GET /api/research/share/public
    getPublicShares: async (req: any, res: any) => {
      try {
        const limit = parseInt(req.query.limit as string) || 20;
        const shares = await handler.getPublicShares(limit);
        res.json(shares);
      } catch (error) {
        res.status(500).json({ 
          error: error instanceof Error ? error.message : 'Failed to get public shares' 
        });
      }
    },

    // GET /api/research/share/stats
    getStats: async (_req: any, res: any) => {
      try {
        const stats = await handler.getStats();
        res.json(stats);
      } catch (error) {
        res.status(500).json({ 
          error: error instanceof Error ? error.message : 'Failed to get stats' 
        });
      }
    }
  };
}

// Next.js API route handlers (if using Next.js)
export function createNextAPIHandlers() {
  const handler = new ShareAPIHandler();

  return {
    share: async (req: any, res: any) => {
      const { method } = req;

      switch (method) {
        case 'POST':
          try {
            const result = await handler.createShare(req.body);
            res.status(201).json(result);
          } catch (error) {
            res.status(400).json({ 
              error: error instanceof Error ? error.message : 'Failed to create share' 
            });
          }
          break;

        default:
          res.setHeader('Allow', ['POST']);
          res.status(405).end(`Method ${method} Not Allowed`);
      }
    },

    shareById: async (req: any, res: any) => {
      const { method, query: { shareId, password } } = req;

      switch (method) {
        case 'GET':
          try {
            const data = await handler.getShare(shareId as string, password as string);
            res.json(data);
          } catch (error) {
            res.status(404).json({ 
              error: error instanceof Error ? error.message : 'Share not found' 
            });
          }
          break;

        case 'PUT':
          try {
            const result = await handler.updateShare(shareId as string, req.body);
            res.json(result);
          } catch (error) {
            res.status(400).json({ 
              error: error instanceof Error ? error.message : 'Failed to update share' 
            });
          }
          break;

        case 'DELETE':
          try {
            const result = await handler.deleteShare(shareId as string);
            res.json(result);
          } catch (error) {
            res.status(404).json({ 
              error: error instanceof Error ? error.message : 'Share not found' 
            });
          }
          break;

        default:
          res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
          res.status(405).end(`Method ${method} Not Allowed`);
      }
    }
  };
}

export default ShareAPIHandler;