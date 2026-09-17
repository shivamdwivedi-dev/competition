import { io, Socket } from 'socket.io-client';

export const SOCKET_EVENTS = {
  CLIENT_JOIN_AUCTION: 'join:auction',   // socket.emit('join:auction', auctionIdString)
  CLIENT_LEAVE_AUCTION: 'leave:auction', // socket.emit('leave:auction', auctionIdString)
  SERVER_BID_UPDATE: 'bid:update',       // { auctionId, highestBid, highestBidder, timestamp }
  SERVER_AUCTION_FEED: 'auction:feed',   // { auctionId, highestBid, highestBidder, timestamp }
  SERVER_JOINED: 'joined',               // { room, success: true }
};

export interface BidUpdatePayload {
  auctionId: string;
  highestBid: number;
  highestBidder: string | null;
  timestamp: number;
}

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';

class SocketService {
  private socket: Socket | null = null;
  private currentRoom: string | null = null;

  connect(): Socket {
    if (this.socket) {
      if (!this.socket.connected) {
        this.socket.connect();
      }
      return this.socket;
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1500,
      reconnectionDelayMax: 5000,
      timeout: 8000,
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      console.log('⚡ [Socket.IO] Connected to backend on', SOCKET_URL, 'Socket ID:', this.socket?.id);
      // Auto rejoin room on reconnect if room was active
      if (this.currentRoom) {
        console.log('⚡ [Socket.IO] Re-joining auction room:', this.currentRoom);
        this.socket?.emit(SOCKET_EVENTS.CLIENT_JOIN_AUCTION, this.currentRoom);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('⚠️ [Socket.IO] Disconnected:', reason);
    });

    this.socket.on('connect_error', (err) => {
      // Quiet offline logging
      console.warn('⏳ [Socket.IO] Connection waiting for backend on', SOCKET_URL, ':', err.message);
    });

    return this.socket;
  }

  joinAuctionRoom(auctionId: string) {
    if (!auctionId || typeof auctionId !== 'string') return;
    this.currentRoom = auctionId;
    if (this.socket && this.socket.connected) {
      this.socket.emit(SOCKET_EVENTS.CLIENT_JOIN_AUCTION, auctionId);
    }
  }

  leaveAuctionRoom(auctionId: string) {
    if (!auctionId) return;
    if (this.currentRoom === auctionId) {
      this.currentRoom = null;
    }
    if (this.socket && this.socket.connected) {
      this.socket.emit(SOCKET_EVENTS.CLIENT_LEAVE_AUCTION, auctionId);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.currentRoom = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export const socketService = new SocketService();
