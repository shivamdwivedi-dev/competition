import { io, Socket } from 'socket.io-client';
import type { Bid, SystemTelemetry } from '../types/auction';

// Socket Event Names Configuration - easily adaptable to Arya's backend changes
export const SOCKET_EVENTS = {
  // Client -> Server
  CLIENT_JOIN_AUCTION: 'join:auction',       // Arya's format
  CLIENT_JOIN_AUCTION_LEGACY: 'joinAuction', // Legacy alias
  CLIENT_PLACE_BID: 'bid:place',             // Modern format
  CLIENT_PLACE_BID_LEGACY: 'placeBid',       // Legacy alias
  CLIENT_PING: 'ping_server',

  // Server -> Client
  SERVER_BID_UPDATE: 'bid:update',           // Arya's format: { auctionId, highestBid, highestBidder, timestamp }
  SERVER_HIGHEST_BID_UPDATED: 'highestBidUpdated', // Legacy alias
  SERVER_BID_UPDATED: 'bidUpdated',          // Legacy alias
  SERVER_BID_ACCEPTED: 'bidAccepted',
  SERVER_BID_REJECTED: 'bidRejected',
  SERVER_AUCTION_ENDED: 'auctionEnded',
  SERVER_SYSTEM_METRICS: 'systemMetrics',
  SERVER_TELEMETRY: 'telemetry',
  SERVER_PONG: 'pong_server',
};

export interface RawBidUpdatePayload {
  auctionId?: string;
  highestBid?: number;
  amount?: number;
  highestBidder?: string | { id?: string; name?: string };
  highestBidderId?: string;
  highestBidderName?: string;
  totalBids?: number;
  timestamp?: number | string;
}

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

class SocketService {
  private socket: Socket | null = null;
  private isConnecting: boolean = false;

  connect(): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    if (!this.socket && !this.isConnecting) {
      this.isConnecting = true;
      this.socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
      });

      this.socket.on('connect', () => {
        this.isConnecting = false;
        console.log('⚡ Socket connected to backend:', this.socket?.id);
      });

      this.socket.on('connect_error', (err) => {
        this.isConnecting = false;
        console.warn('Socket connection retry (backend starting):', err.message);
      });
    }

    return this.socket!;
  }

  // Join auction room emitting both Arya's format { auctionId } and legacy string
  joinAuctionRoom(auctionId: string) {
    if (!this.socket) return;
    // Arya's contract: join:auction with { auctionId }
    this.socket.emit(SOCKET_EVENTS.CLIENT_JOIN_AUCTION, { auctionId });
    // Legacy support
    this.socket.emit(SOCKET_EVENTS.CLIENT_JOIN_AUCTION_LEGACY, auctionId);
  }

  // Submit bid via socket emitting Arya's format { auctionId, userId, amount }
  emitBid(
    auctionId: string,
    amount: number,
    userId: string,
    userName: string,
    callback?: (ack: { success: boolean; message?: string }) => void
  ) {
    if (!this.socket) return;
    const payload = {
      auctionId,
      userId,
      amount,
      bidderId: userId,
      bidderName: userName,
      timestamp: Date.now(),
    };

    // Emit on both channels for maximum compatibility
    this.socket.emit(SOCKET_EVENTS.CLIENT_PLACE_BID, payload, callback);
    this.socket.emit(SOCKET_EVENTS.CLIENT_PLACE_BID_LEGACY, payload, callback);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnecting = false;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export const socketService = new SocketService();
