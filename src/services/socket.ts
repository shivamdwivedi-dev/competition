import { io, Socket } from 'socket.io-client';
import type { Bid, SystemTelemetry } from '../types/auction';

export interface ServerToClientEvents {
  highestBidUpdated: (payload: { auctionId: string; highestBid: number; highestBidderId: string; highestBidderName: string; totalBids: number; timestamp: number }) => void;
  bidAccepted: (bid: Bid) => void;
  bidRejected: (data: { reason: string; attemptedBid: number; currentHighest: number }) => void;
  auctionEnded: (data: { auctionId: string; winnerId: string; winnerName: string; winningBid: number; endedAt: number }) => void;
  systemMetrics: (telemetry: SystemTelemetry) => void;
  pong_server: (data: { clientTime: number; serverTime: number }) => void;
}

export interface ClientToServerEvents {
  joinAuction: (auctionId: string) => void;
  leaveAuction: (auctionId: string) => void;
  placeBid: (data: { auctionId: string; amount: number; bidderId: string; bidderName: string; timestamp: number }, callback?: (ack: { success: boolean; message?: string }) => void) => void;
  ping_server: (data: { clientTime: number }) => void;
}

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

class SocketService {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  private isConnecting: boolean = false;

  connect(): Socket<ServerToClientEvents, ClientToServerEvents> {
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
        console.log('⚡ Socket connected:', this.socket?.id);
      });

      this.socket.on('connect_error', (err) => {
        this.isConnecting = false;
        console.warn('Socket connection warning (backend starting):', err.message);
      });
    }

    return this.socket!;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnecting = false;
    }
  }

  getSocket() {
    return this.socket;
  }
}

export const socketService = new SocketService();
