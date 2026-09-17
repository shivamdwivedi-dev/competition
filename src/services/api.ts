import type { AuctionItem, Bid, SystemTelemetry } from '../types/auction';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Configurable endpoint routes - easily updated once backend routes are finalized
export const API_ROUTES = {
  getAuction: (id: string) => `${API_BASE}/auctions/${id}`,
  getBids: (id: string) => `${API_BASE}/auctions/${id}/bids`,
  postBid: () => `${API_BASE}/bids`,
  postBidLegacy: (id: string) => `${API_BASE}/auctions/${id}/bid`,
  getTelemetry: () => `${API_BASE}/telemetry`,
};

export const apiService = {
  async getAuctionDetails(auctionId: string): Promise<AuctionItem> {
    try {
      const res = await fetch(API_ROUTES.getAuction(auctionId));
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      return {
        id: data.id || data.auctionId || auctionId,
        title: data.title || 'Quantum Overdrive GPU Cluster - 8x H100',
        description: data.description || 'Enterprise grade AI acceleration cluster with liquid cooling manifold and sub-millisecond interconnect.',
        imageUrl: data.imageUrl || 'https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=1200&q=80',
        startingPrice: data.startingPrice ?? 5000,
        reservePrice: data.reservePrice ?? 12000,
        minIncrement: data.minIncrement ?? 100,
        currentHighestBid: data.currentHighestBid ?? data.highestBid ?? 7400,
        highestBidderId: data.highestBidderId ?? data.highestBidder ?? 'bidder-synora-core',
        highestBidderName: data.highestBidderName ?? (typeof data.highestBidder === 'string' ? data.highestBidder : 'NeuralByte_AI'),
        startTime: data.startTime ? new Date(data.startTime).getTime() : Date.now() - 1000 * 60 * 12,
        endTime: data.endTime ? new Date(data.endTime).getTime() : Date.now() + 1000 * 60 * 5,
        status: data.status || 'LIVE',
        totalBidsCount: data.totalBidsCount ?? data.totalBids ?? 38,
      };
    } catch {
      // Offline fallback mock data for local testing
      return {
        id: auctionId,
        title: 'Quantum Overdrive GPU Cluster - 8x H100',
        description: 'Enterprise grade AI acceleration cluster with liquid cooling manifold and sub-millisecond interconnect.',
        imageUrl: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=1200&q=80',
        startingPrice: 5000,
        reservePrice: 12000,
        minIncrement: 100,
        currentHighestBid: 7400,
        highestBidderId: 'bidder-synora-core',
        highestBidderName: 'NeuralByte_AI',
        startTime: Date.now() - 1000 * 60 * 12,
        endTime: Date.now() + 1000 * 60 * 5,
        status: 'LIVE',
        totalBidsCount: 38,
      };
    }
  },

  async getBidHistory(auctionId: string): Promise<Bid[]> {
    try {
      const res = await fetch(API_ROUTES.getBids(auctionId));
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const rawBids = await res.json();
      if (Array.isArray(rawBids)) {
        return rawBids.map((b: any, index: number) => ({
          id: b.id || b._id || `bid-${index}-${Date.now()}`,
          auctionId: b.auctionId || auctionId,
          bidderId: b.bidderId || b.userId || 'usr-anon',
          bidderName: b.bidderName || b.userName || b.userId || 'Bidder',
          amount: Number(b.amount || b.bidAmount || 0),
          timestamp: b.timestamp ? new Date(b.timestamp).getTime() : Date.now() - index * 6000,
          status: b.status || 'ACCEPTED',
          latencyMs: b.latencyMs,
          reason: b.reason,
        }));
      }
      return [];
    } catch {
      // Clean starting audit history for local development
      return [
        { id: 'b-5', auctionId, bidderId: 'bidder-synora-core', bidderName: 'NeuralByte_AI', amount: 7400, timestamp: Date.now() - 5000, status: 'ACCEPTED', latencyMs: 3 },
        { id: 'b-4', auctionId, bidderId: 'usr-quantum', bidderName: 'QuantumX', amount: 7300, timestamp: Date.now() - 18000, status: 'ACCEPTED', latencyMs: 5 },
        { id: 'b-3', auctionId, bidderId: 'usr-slow', bidderName: 'SlowTrader', amount: 7100, timestamp: Date.now() - 25000, status: 'REJECTED', reason: 'Outpaced by higher bid', latencyMs: 12 },
        { id: 'b-2', auctionId, bidderId: 'usr-neon', bidderName: 'NeonRider', amount: 7100, timestamp: Date.now() - 32000, status: 'ACCEPTED', latencyMs: 4 },
        { id: 'b-1', auctionId, bidderId: 'usr-alpha', bidderName: 'AlphaTrader', amount: 6800, timestamp: Date.now() - 48000, status: 'ACCEPTED', latencyMs: 6 },
      ];
    }
  },

  async placeBid(auctionId: string, amount: number, userId: string, userName?: string): Promise<Bid> {
    const payload = {
      auctionId,
      userId,
      amount,
      userName: userName || userId,
      timestamp: Date.now(),
    };

    const res = await fetch(API_ROUTES.postBid(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      if (res.status === 404) {
        // Fallback to legacy endpoint if /api/bids is 404
        const legacyRes = await fetch(API_ROUTES.postBidLegacy(auctionId), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!legacyRes.ok) {
          const errData = await legacyRes.json().catch(() => ({}));
          throw new Error(errData.message || 'Bid rejected by server');
        }
        return await legacyRes.json();
      }

      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Bid rejected by server');
    }

    return await res.json();
  },

  async getTelemetry(): Promise<SystemTelemetry> {
    try {
      const res = await fetch(API_ROUTES.getTelemetry());
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      return {
        bidsPerSecond: 142,
        activeSockets: 24,
        averageLatencyMs: 3.6,
        redisThroughput: 99.4,
        serverTime: Date.now(),
      };
    }
  },
};
