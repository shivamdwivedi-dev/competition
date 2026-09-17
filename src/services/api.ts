import type { AuctionItem, Bid, SystemTelemetry } from '../types/auction';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const apiService = {
  async getAuctionDetails(auctionId: string): Promise<AuctionItem> {
    try {
      const res = await fetch(`${API_BASE}/auctions/${auctionId}`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('API getAuctionDetails fallback mock:', err);
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
      const res = await fetch(`${API_BASE}/auctions/${auctionId}/bids`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return await res.json();
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

  async placeBid(auctionId: string, amount: number, bidderId: string, bidderName: string): Promise<Bid> {
    const res = await fetch(`${API_BASE}/auctions/${auctionId}/bid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, bidderId, bidderName, timestamp: Date.now() }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Bid rejected by server');
    }
    return await res.json();
  },

  async getTelemetry(): Promise<SystemTelemetry> {
    try {
      const res = await fetch(`${API_BASE}/telemetry`);
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
