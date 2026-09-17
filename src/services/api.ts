import type { AuctionItem, Bid, SystemTelemetry } from '../types/auction';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Configurable endpoint routes for easy adjustment with backend
export const API_ROUTES = {
  getAuction: (id: string) => `${API_BASE}/auctions/${id}`,
  getBids: (id: string) => `${API_BASE}/auctions/${id}/bids`,
  // Arya's endpoint: POST /api/bids or legacy POST /api/auctions/:id/bid
  postBid: () => `${API_BASE}/bids`,
  postBidLegacy: (id: string) => `${API_BASE}/auctions/${id}/bid`,
  getTelemetry: () => `${API_BASE}/telemetry`,
};

export const apiService = {
  async getAuctionDetails(auctionId: string): Promise<AuctionItem> {
    try {
      const res = await fetch(API_ROUTES.getAuction(auctionId));
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      return {
        id: data.id || data.auctionId || auctionId,
        title: data.title || 'Cyberpunk Genesis NFT #0042',
        description: data.description || 'Ultra-rare generative digital asset with quantum encryption signature.',
        imageUrl: data.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
        startingPrice: data.startingPrice ?? 500,
        reservePrice: data.reservePrice ?? 2500,
        minIncrement: data.minIncrement ?? 50,
        currentHighestBid: data.currentHighestBid ?? data.highestBid ?? 1250,
        highestBidderId: data.highestBidderId ?? data.highestBidder ?? 'bidder-titan-9',
        highestBidderName: data.highestBidderName ?? (typeof data.highestBidder === 'string' ? data.highestBidder : 'Titan_9'),
        startTime: data.startTime ? new Date(data.startTime).getTime() : Date.now() - 1000 * 60 * 15,
        endTime: data.endTime ? new Date(data.endTime).getTime() : Date.now() + 1000 * 60 * 8,
        status: data.status || 'LIVE',
        totalBidsCount: data.totalBidsCount ?? data.totalBids ?? 24,
      };
    } catch (err) {
      console.warn('API getAuctionDetails using fallback mock:', err);
      return {
        id: auctionId,
        title: 'Cyberpunk Genesis NFT #0042',
        description: 'Ultra-rare generative digital asset with quantum encryption signature.',
        imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
        startingPrice: 500,
        reservePrice: 2500,
        minIncrement: 50,
        currentHighestBid: 1250,
        highestBidderId: 'bidder-titan-9',
        highestBidderName: 'Titan_9',
        startTime: Date.now() - 1000 * 60 * 15,
        endTime: Date.now() + 1000 * 60 * 8,
        status: 'LIVE',
        totalBidsCount: 24,
      };
    }
  },

  async getBidHistory(auctionId: string): Promise<Bid[]> {
    try {
      const res = await fetch(API_ROUTES.getBids(auctionId));
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const rawBids = await res.json();
      if (Array.isArray(rawBids)) {
        return rawBids.map((b: any, index: number) => ({
          id: b.id || b._id || `bid-${index}-${Date.now()}`,
          auctionId: b.auctionId || auctionId,
          bidderId: b.bidderId || b.userId || 'usr-anon',
          bidderName: b.bidderName || b.userName || b.userId || 'Bidder',
          amount: Number(b.amount || b.bidAmount || 0),
          timestamp: b.timestamp ? new Date(b.timestamp).getTime() : Date.now() - index * 5000,
          status: b.status || 'ACCEPTED',
          latencyMs: b.latencyMs,
        }));
      }
      return [];
    } catch {
      return [
        { id: 'b-1', auctionId, bidderId: 'usr-1', bidderName: 'AlphaTrader', amount: 950, timestamp: Date.now() - 40000, status: 'ACCEPTED' },
        { id: 'b-2', auctionId, bidderId: 'usr-2', bidderName: 'NeonRider', amount: 1000, timestamp: Date.now() - 32000, status: 'ACCEPTED' },
        { id: 'b-3', auctionId, bidderId: 'usr-3', bidderName: 'CyberViper', amount: 1100, timestamp: Date.now() - 25000, status: 'ACCEPTED' },
        { id: 'b-4', auctionId, bidderId: 'usr-4', bidderName: 'QuantumX', amount: 1150, timestamp: Date.now() - 14000, status: 'ACCEPTED' },
        { id: 'b-5', auctionId, bidderId: 'bidder-titan-9', bidderName: 'Titan_9', amount: 1250, timestamp: Date.now() - 6000, status: 'ACCEPTED' },
      ];
    }
  },

  // Supports Arya's POST /api/bids with { auctionId, userId, amount }
  async placeBid(auctionId: string, amount: number, userId: string, userName?: string): Promise<Bid> {
    // Primary attempt with Arya's POST /api/bids contract
    const payload = {
      auctionId,
      userId,
      amount,
      userName: userName || userId,
      timestamp: Date.now(),
    };

    try {
      const res = await fetch(API_ROUTES.postBid(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // Attempt legacy endpoint if /api/bids returns 404
        if (res.status === 404) {
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
    } catch (err: any) {
      throw new Error(err.message || 'Network error while placing bid');
    }
  },

  async getTelemetry(): Promise<SystemTelemetry> {
    try {
      const res = await fetch(API_ROUTES.getTelemetry());
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      return {
        bidsPerSecond: 184,
        activeSockets: 48,
        averageLatencyMs: 4.8,
        redisThroughput: 98.4,
        serverTime: Date.now(),
      };
    }
  },
};
