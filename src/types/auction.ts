export interface Bid {
  id: string;
  auctionId: string;
  bidderId: string;
  bidderName: string;
  amount: number;
  timestamp: number;
  status: 'ACCEPTED' | 'REJECTED' | 'PENDING';
  latencyMs?: number;
  reason?: string;
}

export interface AuctionItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  startingPrice: number;
  reservePrice: number;
  minIncrement: number;
  currentHighestBid: number;
  highestBidderId: string | null;
  highestBidderName: string | null;
  startTime: number;
  endTime: number;
  status: 'UPCOMING' | 'LIVE' | 'ENDED' | 'PAUSED';
  totalBidsCount: number;
  timeRemainingMs?: number;
  isEnded?: boolean;
}

export interface SystemTelemetry {
  bidsPerSecond: number;
  activeSockets: number;
  averageLatencyMs: number;
  redisThroughput: number;
  serverTime: number;
}

export interface UserProfile {
  id: string;
  name: string;
  walletBalance: number;
}

export interface BackendBidResponse {
  success: boolean;
  statusCode?: number;
  status: 'ACCEPTED' | 'REJECTED' | 'ERROR';
  auctionId?: string;
  highestBid?: number;
  highestBidder?: string | null;
  currentBid?: number;
  timestamp?: number;
  reason?: string;
  message?: string;
}

export interface BackendAuctionSummary {
  id: string;
  title: string;
  startingPrice: number;
  highestBid: number;
  highestBidder: string | null;
  endTime: number;
  createdAt: number;
  timeRemainingMs: number;
  isEnded: boolean;
}
