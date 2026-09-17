import type { AuctionItem, Bid, BackendBidResponse, BackendAuctionSummary, SystemTelemetry } from '../types/auction';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
const ENABLE_MOCK = import.meta.env.VITE_ENABLE_MOCK === 'true';

export const API_ROUTES = {
  getAuction: (id: string) => `${API_BASE}/auctions/${id}`,
  listAuctions: () => `${API_BASE}/auctions`,
  getAuditBids: (id: string) => `${API_BASE}/auctions/${id}/bids`,
  postBid: () => `${API_BASE}/bids`,
  health: () => `${API_BASE.replace(/\/api\/?$/, '')}/health`,
  telemetry: () => `${API_BASE}/telemetry`,
};

export class BackendError extends Error {
  statusCode?: number;
  backendData?: BackendBidResponse;

  constructor(message: string, statusCode?: number, backendData?: BackendBidResponse) {
    super(message);
    this.name = 'BackendError';
    this.statusCode = statusCode;
    this.backendData = backendData;
  }
}

export const apiService = {
  // Check backend server health
  async checkHealth(): Promise<{ status: string; uptime: number; timestamp: number } | null> {
    try {
      const res = await fetch(API_ROUTES.health(), { signal: AbortSignal.timeout(3000) });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  // GET /api/auctions - List all active auctions from real backend
  async listActiveAuctions(): Promise<BackendAuctionSummary[]> {
    try {
      const res = await fetch(API_ROUTES.listAuctions(), { signal: AbortSignal.timeout(4000) });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const json = await res.json();
      const rawList = json.data || json;
      if (Array.isArray(rawList)) {
        return rawList.map((a: any) => ({
          id: String(a.id || a._id),
          title: String(a.title || 'Untitled Auction'),
          startingPrice: Number(a.startingPrice || a.starting_price || 0),
          highestBid: Number(a.highestBid || a.highest_bid || a.startingPrice || 0),
          highestBidder: a.highestBidder || a.highest_bidder || null,
          endTime: typeof a.endTime === 'number' ? a.endTime : new Date(a.endTime || a.end_time).getTime(),
          createdAt: typeof a.createdAt === 'number' ? a.createdAt : new Date(a.createdAt || a.created_at || Date.now()).getTime(),
          timeRemainingMs: Number(a.timeRemainingMs || 0),
          isEnded: Boolean(a.isEnded !== undefined ? a.isEnded : (Date.now() >= (typeof a.endTime === 'number' ? a.endTime : new Date(a.endTime).getTime()))),
        }));
      }
      return [];
    } catch (err) {
      if (ENABLE_MOCK) {
        return [
          {
            id: 'mock-synora-01',
            title: 'Vintage Rolex Submariner (Offline Mock)',
            startingPrice: 500,
            highestBid: 1200,
            highestBidder: 'user_piyush',
            endTime: Date.now() + 1000 * 60 * 15,
            createdAt: Date.now() - 1000 * 60 * 10,
            timeRemainingMs: 1000 * 60 * 15,
            isEnded: false,
          }
        ];
      }
      throw err;
    }
  },

  // GET /api/auctions/:id - Authoritative auction details from backend
  async getAuctionDetails(auctionId: string): Promise<AuctionItem> {
    try {
      const res = await fetch(API_ROUTES.getAuction(auctionId), { signal: AbortSignal.timeout(4000) });
      if (!res.ok) {
        throw new BackendError(`Auction ${auctionId} not found (HTTP ${res.status})`, res.status);
      }

      const json = await res.json();
      const raw = json.data || json;
      return this.normalizeAuction(raw);
    } catch (err) {
      // If mock is explicitly enabled for offline dev
      if (ENABLE_MOCK) {
        return {
          id: auctionId || 'mock-synora-01',
          title: 'Vintage Mechanical Watch (Dev Mock)',
          description: 'Dev-only mock state. Real backend not detected on port 5001.',
          imageUrl: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=1200&q=80',
          startingPrice: 500,
          reservePrice: 2500,
          minIncrement: 50,
          currentHighestBid: 1200,
          highestBidderId: 'user_piyush',
          highestBidderName: 'user_piyush',
          startTime: Date.now() - 1000 * 60 * 10,
          endTime: Date.now() + 1000 * 60 * 5,
          status: 'LIVE',
          totalBidsCount: 4,
          timeRemainingMs: 1000 * 60 * 5,
          isEnded: false,
        };
      }
      // Re-throw so UI accurately reflects that backend is offline or auction is missing
      throw err;
    }
  },

  normalizeAuction(raw: any): AuctionItem {
    const highestBid = Number(raw.highestBid ?? raw.highest_bid ?? raw.currentHighestBid ?? 0);
    const startingPrice = Number(raw.startingPrice ?? raw.starting_price ?? 500);
    const bidder = raw.highestBidder ?? raw.highest_bidder ?? null;
    const now = Date.now();
    const endTime = raw.endTime ? (typeof raw.endTime === 'number' ? raw.endTime : new Date(raw.endTime).getTime()) : (now + 1000 * 60 * 5);
    const isEnded = raw.isEnded !== undefined ? Boolean(raw.isEnded) : (now >= endTime || raw.status === 'ENDED');
    const minIncrement = Number(raw.minIncrement ?? 50);

    return {
      id: String(raw.id || raw.auctionId || ''),
      title: String(raw.title || 'Auction Item'),
      description: String(raw.description || 'Live bidding item managed atomically by Redis Lua script on Port 5001.'),
      imageUrl: raw.imageUrl || 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=1200&q=80',
      startingPrice,
      reservePrice: Number(raw.reservePrice || (startingPrice * 2)),
      minIncrement: minIncrement > 0 ? minIncrement : 50,
      currentHighestBid: highestBid > 0 ? highestBid : startingPrice,
      highestBidderId: bidder,
      highestBidderName: bidder || 'No bids yet',
      startTime: raw.createdAt ? Number(raw.createdAt) : now - 1000 * 60 * 5,
      endTime,
      status: isEnded ? 'ENDED' : 'LIVE',
      totalBidsCount: Array.isArray(raw.recentBids)
        ? raw.recentBids.filter((b: any) => b && (typeof b === 'object' || (typeof b === 'string' && b.trim().length > 0))).length
        : Number(raw.totalBidsCount || raw.totalBids || (highestBid > 0 ? 1 : 0)),
      timeRemainingMs: raw.timeRemainingMs !== undefined ? Number(raw.timeRemainingMs) : Math.max(0, endTime - now),
      isEnded,
    };
  },

  // GET /api/auctions/:id/bids - Audit bid history
  async getBidHistory(auctionId: string): Promise<Bid[]> {
    try {
      // 1. Try embedded recentBids from GET /api/auctions/:id
      const detailRes = await fetch(API_ROUTES.getAuction(auctionId), { signal: AbortSignal.timeout(3000) });
      if (detailRes.ok) {
        const detailJson = await detailRes.json();
        const data = detailJson.data || detailJson;
        if (Array.isArray(data.recentBids) && data.recentBids.length > 0) {
          const parsedBids = data.recentBids
            .map((raw: any, index: number) => {
              let b = raw;
              if (typeof b === 'string') {
                if (!b.trim()) return null;
                try {
                  b = JSON.parse(b);
                } catch {
                  return null;
                }
              }
              if (!b || typeof b !== 'object') return null;
              const amount = Number(b.amount || 0);
              const userId = String(b.userId || b.user_id || 'anonymous');
              const ts = typeof b.timestamp === 'number' ? b.timestamp : (b.timestamp ? new Date(b.timestamp).getTime() : Date.now());
              return {
                id: String(b.id || `bid-${ts}-${index}`),
                auctionId,
                bidderId: userId,
                bidderName: userId,
                amount,
                timestamp: isNaN(ts) ? Date.now() : ts,
                status: 'ACCEPTED' as const,
              };
            })
            .filter(Boolean) as Bid[];

          if (parsedBids.length > 0) {
            return parsedBids;
          }
        }
      }

      // 2. Try PostgreSQL audit endpoint GET /api/auctions/:id/bids
      const auditRes = await fetch(API_ROUTES.getAuditBids(auctionId), { signal: AbortSignal.timeout(3000) });
      if (auditRes.ok) {
        const auditJson = await auditRes.json();
        const rawBids = auditJson.data || auditJson;
        if (Array.isArray(rawBids) && rawBids.length > 0) {
          return rawBids.map((b: any, index: number) => {
            const isAccepted = !b.status || b.status === 'ACCEPTED';
            return {
              id: String(b.id || `audit-${index}`),
              auctionId: String(b.auction_id || b.auctionId || auctionId),
              bidderId: String(b.user_id || b.userId || 'anonymous'),
              bidderName: String(b.user_id || b.userId || 'Bidder'),
              amount: Number(b.amount || 0),
              timestamp: b.created_at ? new Date(b.created_at).getTime() : (b.timestamp ? Number(b.timestamp) : Date.now()),
              status: isAccepted ? ('ACCEPTED' as const) : ('REJECTED' as const),
              reason: b.status && b.status.startsWith('REJECTED_') ? b.status.replace('REJECTED_', '') : undefined,
            };
          });
        }
      }

      return [];
    } catch {
      if (ENABLE_MOCK) {
        return [
          { id: 'b-mock-1', auctionId, bidderId: 'user_piyush', bidderName: 'user_piyush', amount: 1200, timestamp: Date.now() - 1000 * 30, status: 'ACCEPTED' },
          { id: 'b-mock-2', auctionId, bidderId: 'user_shivam', bidderName: 'user_shivam', amount: 1000, timestamp: Date.now() - 1000 * 90, status: 'ACCEPTED' },
          { id: 'b-mock-3', auctionId, bidderId: 'user_arya', bidderName: 'user_arya', amount: 800, timestamp: Date.now() - 1000 * 180, status: 'ACCEPTED' },
        ];
      }
      return [];
    }
  },

  // POST /api/bids - Exact backend atomic contract: { auctionId, userId, amount }
  async placeBid(auctionId: string, amount: number, userId: string): Promise<BackendBidResponse> {
    const payload = {
      auctionId,
      userId,
      amount,
    };

    let res: Response;
    try {
      res = await fetch(API_ROUTES.postBid(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (networkErr: any) {
      throw new BackendError(
        `Network error: Could not reach backend at ${API_ROUTES.postBid()}. Ensure server is running on port 5001.`,
        0
      );
    }

    let json: BackendBidResponse;
    try {
      json = await res.json();
    } catch {
      throw new BackendError(`Server returned non-JSON response (HTTP ${res.status})`, res.status);
    }

    // Backend rejected bid (e.g. 409 BID_TOO_LOW or AUCTION_ENDED)
    if (!res.ok || json.success === false) {
      throw new BackendError(
        json.message || json.reason || 'Bid rejected by server',
        res.status,
        json
      );
    }

    return json;
  },

  async getTelemetry(): Promise<SystemTelemetry> {
    try {
      const res = await fetch(API_ROUTES.telemetry(), { signal: AbortSignal.timeout(2000) });
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      return {
        bidsPerSecond: 0,
        activeSockets: 1,
        averageLatencyMs: 0,
        redisThroughput: 100,
        serverTime: Date.now(),
      };
    }
  },
};
