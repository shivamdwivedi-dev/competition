import { io, Socket } from 'socket.io-client';
import type { Bid, SystemTelemetry } from '../types/auction';

// Socket Event Names Configuration - easily updated once backend confirms
export const SOCKET_EVENTS = {
  // Client -> Server
  CLIENT_JOIN_AUCTION: 'join:auction',
  CLIENT_JOIN_AUCTION_LEGACY: 'joinAuction',
  CLIENT_PLACE_BID: 'bid:place',
  CLIENT_PLACE_BID_LEGACY: 'placeBid',
  CLIENT_PING: 'ping_server',

  // Server -> Client
  SERVER_BID_UPDATE: 'bid:update',
  SERVER_HIGHEST_BID_UPDATED: 'highestBidUpdated',
  SERVER_BID_UPDATED: 'bidUpdated',
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
        reconnectionDelay: 2000,
        reconnectionDelayMax: 5000,
        timeout: 8000,
        autoConnect: true,
      });

      this.socket.on('connect', () => {
        this.isConnecting = false;
      });

      this.socket.on('connect_error', () => {
        this.isConnecting = false;
        // Quiet offline handling - avoids crashing or console spamming
      });
    }

    return this.socket!;
  }

  joinAuctionRoom(auctionId: string) {
    if (!this.socket) return;
    this.socket.emit(SOCKET_EVENTS.CLIENT_JOIN_AUCTION, { auctionId });
    this.socket.emit(SOCKET_EVENTS.CLIENT_JOIN_AUCTION_LEGACY, auctionId);
  }

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
