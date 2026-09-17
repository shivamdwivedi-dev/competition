import { useState, useEffect, useCallback, useRef } from 'react';
import type { AuctionItem, Bid, SystemTelemetry, UserProfile, BackendAuctionSummary } from '../types/auction';
import { apiService, BackendError } from '../services/api';
import { socketService, SOCKET_EVENTS, type BidUpdatePayload } from '../services/socket';
import { soundFX } from '../utils/audio';

const INITIAL_USER: UserProfile = {
  id: 'user_piyush',
  name: 'user_piyush',
  walletBalance: 25000,
};

function mapBackendRejection(reason?: string, message?: string): string {
  if (message && message.trim() !== '' && !message.includes('HTTP error')) {
    return message;
  }
  switch (reason) {
    case 'BID_TOO_LOW':
      return 'Bid rejected: Amount too low. Must be strictly higher than the current highest bid.';
    case 'AUCTION_ENDED':
      return 'Bid rejected: Auction has already ended.';
    case 'AUCTION_NOT_FOUND':
      return 'Bid rejected: Auction not found in Redis state.';
    case 'INVALID_BID':
      return 'Bid rejected: Invalid or non-positive bid amount.';
    case 'INVALID_USER_ID':
      return 'Bid rejected: User ID is required.';
    default:
      return reason || 'Bid rejected by server';
  }
}

const DEFAULT_AUCTION_ID = '8281326b-58ca-4f4a-9bb2-845927b0667a';

export function useAuction() {
  const [currentAuctionId, setCurrentAuctionId] = useState<string>(() => {
    // Check URL query param first: ?auctionId=...
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlId = params.get('auctionId');
      if (urlId && urlId.trim() !== '') return urlId.trim();
    }
    return import.meta.env.VITE_DEFAULT_AUCTION_ID || DEFAULT_AUCTION_ID;
  });

  const [availableAuctions, setAvailableAuctions] = useState<BackendAuctionSummary[]>([]);
  const [auction, setAuction] = useState<AuctionItem | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [user, setUser] = useState<UserProfile>(INITIAL_USER);
  const [telemetry, setTelemetry] = useState<SystemTelemetry>({
    bidsPerSecond: 0,
    activeSockets: 1,
    averageLatencyMs: 0,
    redisThroughput: 100,
    serverTime: Date.now(),
  });

  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [lastBidError, setLastBidError] = useState<string | null>(null);
  const [outbidAlert, setOutbidAlert] = useState<boolean>(false);
  const [highBidFlash, setHighBidFlash] = useState<boolean>(false);

  // Set of recently received bid signatures to prevent duplication
  const seenBidsRef = useRef<Set<string>>(new Set());

  // Function to refresh authoritative auction details from backend
  const refreshAuthoritativeAuction = useCallback(async (targetId?: string): Promise<boolean> => {
    const idToFetch = targetId || currentAuctionId || import.meta.env.VITE_DEFAULT_AUCTION_ID || DEFAULT_AUCTION_ID;
    if (!idToFetch) return false;
    try {
      const data = await apiService.getAuctionDetails(idToFetch);
      setAuction(data);
      setServerError(null);

      const history = await apiService.getBidHistory(idToFetch);
      setBids(history);
      // Populate seen signatures
      history.forEach((b) => {
        seenBidsRef.current.add(`${b.amount}-${b.bidderId}-${b.timestamp}`);
      });
      return true;
    } catch (err: any) {
      console.warn('[useAuction] Could not load auction details:', err.message);
      setServerError(err.message || 'Could not connect to backend');
      return false;
    }
  }, [currentAuctionId]);

  // Full connection & sync routine with authoritative backend
  const retryConnection = useCallback(async () => {
    setIsLoading(true);
    setServerError(null);

    try {
      const list = await apiService.listActiveAuctions();
      setAvailableAuctions(list);

      let targetId = currentAuctionId;
      if (!targetId || !list.some((a) => a.id === targetId)) {
        if (list.length > 0) {
          const firstActive = list.find((a) => !a.isEnded) || list[0];
          targetId = firstActive.id;
        } else {
          targetId = import.meta.env.VITE_DEFAULT_AUCTION_ID || DEFAULT_AUCTION_ID;
        }
        setCurrentAuctionId(targetId);
      }

      const success = await refreshAuthoritativeAuction(targetId);
      if (success) {
        socketService.joinAuctionRoom(targetId);
      }
    } catch (err: any) {
      // Fallback: try fetching target auction directly
      const fallbackId = currentAuctionId || import.meta.env.VITE_DEFAULT_AUCTION_ID || DEFAULT_AUCTION_ID;
      const directSuccess = await refreshAuthoritativeAuction(fallbackId);
      if (!directSuccess) {
        setServerError(`Backend unavailable on http://localhost:5001 (${err.message || 'Connection refused'}).`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentAuctionId, refreshAuthoritativeAuction]);

  // 1. Discover Active Auctions on mount
  useEffect(() => {
    retryConnection();
  }, [retryConnection]);

  // Auto-retry polling until auction is successfully loaded
  useEffect(() => {
    if (auction) return;
    const interval = setInterval(() => {
      retryConnection();
    }, 3500);
    return () => clearInterval(interval);
  }, [auction, retryConnection]);

  // 2. Real-Time Socket.IO Synchronization (Port 5001)
  useEffect(() => {
    const socket = socketService.connect();

    const onConnect = () => {
      setIsConnected(true);
      const targetId = currentAuctionId || import.meta.env.VITE_DEFAULT_AUCTION_ID || DEFAULT_AUCTION_ID;
      if (targetId) {
        socketService.joinAuctionRoom(targetId);
        refreshAuthoritativeAuction(targetId);
      }
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    // Actual Backend Broadcast Event: 'bid:update' { auctionId, highestBid, highestBidder, timestamp }
    const onBidUpdate = (payload: BidUpdatePayload) => {
      if (!payload || payload.auctionId !== currentAuctionId) return;

      const numBid = Number(payload.highestBid);
      const bidder = payload.highestBidder;
      const ts = Number(payload.timestamp) || Date.now();
      const signature = `${numBid}-${bidder}-${ts}`;

      // Update current highest bid in state
      setAuction((prev) => {
        if (!prev) return prev;
        if (prev.highestBidderId === user.id && bidder !== user.id) {
          setOutbidAlert(true);
          soundFX.playBidOutbid();
        } else if (bidder === user.id) {
          soundFX.playBidAccepted();
        }

        return {
          ...prev,
          currentHighestBid: numBid > 0 ? numBid : prev.currentHighestBid,
          highestBidderId: bidder,
          highestBidderName: bidder || 'No bids yet',
          totalBidsCount: prev.totalBidsCount + 1,
        };
      });

      // Deduplicate before appending to audit stream
      if (!seenBidsRef.current.has(signature)) {
        seenBidsRef.current.add(signature);
        const newBid: Bid = {
          id: `live-${ts}-${Math.floor(Math.random() * 1000)}`,
          auctionId: payload.auctionId,
          bidderId: bidder || 'anonymous',
          bidderName: bidder || 'Bidder',
          amount: numBid,
          timestamp: ts,
          status: 'ACCEPTED',
        };
        setBids((prev) => [newBid, ...prev.slice(0, 49)]);
      }

      setHighBidFlash(true);
      setTimeout(() => setHighBidFlash(false), 800);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on(SOCKET_EVENTS.SERVER_BID_UPDATE, onBidUpdate);
    socket.on(SOCKET_EVENTS.SERVER_AUCTION_FEED, onBidUpdate);

    if (socket.connected && currentAuctionId) {
      setIsConnected(true);
      socketService.joinAuctionRoom(currentAuctionId);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off(SOCKET_EVENTS.SERVER_BID_UPDATE, onBidUpdate);
      socket.off(SOCKET_EVENTS.SERVER_AUCTION_FEED, onBidUpdate);
    };
  }, [currentAuctionId, user.id, refreshAuthoritativeAuction]);

  // 3. Countdown Watcher - Authoritative endTime
  useEffect(() => {
    if (!auction || auction.status !== 'LIVE') return;

    const timer = setInterval(() => {
      const now = Date.now();
      if (now >= auction.endTime) {
        setAuction((prev) => {
          if (!prev || prev.status !== 'LIVE') return prev;
          soundFX.playHammer();
          return { ...prev, status: 'ENDED', isEnded: true, timeRemainingMs: 0 };
        });
      }
    }, 250);

    return () => clearInterval(timer);
  }, [auction?.endTime, auction?.status]);

  // 4. Place Bid Action - Hot Path: POST /api/bids -> Redis Lua
  const submitBid = useCallback(
    async (customAmount?: number) => {
      if (!auction || auction.status !== 'LIVE') return;

      const minRequired = auction.currentHighestBid + auction.minIncrement;
      const targetAmount = customAmount !== undefined ? customAmount : minRequired;

      // Quick client-side check
      if (targetAmount <= auction.currentHighestBid) {
        const errorMsg = `Bid of ₹${targetAmount.toLocaleString()} rejected: Must strictly exceed current highest bid of ₹${auction.currentHighestBid.toLocaleString()}`;
        setLastBidError(errorMsg);
        soundFX.playBidOutbid();

        const rejectedBid: Bid = {
          id: `rej-${Date.now()}`,
          auctionId: currentAuctionId,
          bidderId: user.id,
          bidderName: user.name,
          amount: targetAmount,
          timestamp: Date.now(),
          status: 'REJECTED',
          reason: 'BID_TOO_LOW',
        };
        setBids((prev) => [rejectedBid, ...prev.slice(0, 49)]);
        setTimeout(() => setLastBidError(null), 3500);
        return;
      }

      setIsSubmitting(true);
      setLastBidError(null);
      const start = performance.now();

      try {
        // Send directly to backend atomic Lua endpoint POST /api/bids
        const res = await apiService.placeBid(currentAuctionId, targetAmount, user.id);
        const latency = Math.round(Math.max(1, performance.now() - start));

        if (res.status === 'ACCEPTED') {
          const acceptedAmount = res.highestBid || targetAmount;
          const acceptedBidder = res.highestBidder || user.id;
          const ts = res.timestamp || Date.now();
          const signature = `${acceptedAmount}-${acceptedBidder}-${ts}`;

          setAuction((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              currentHighestBid: acceptedAmount,
              highestBidderId: acceptedBidder,
              highestBidderName: acceptedBidder,
              totalBidsCount: prev.totalBidsCount + 1,
            };
          });

          if (!seenBidsRef.current.has(signature)) {
            seenBidsRef.current.add(signature);
            const acceptedBid: Bid = {
              id: `bid-${ts}`,
              auctionId: currentAuctionId,
              bidderId: acceptedBidder,
              bidderName: acceptedBidder,
              amount: acceptedAmount,
              timestamp: ts,
              status: 'ACCEPTED',
              latencyMs: latency,
            };
            setBids((prev) => [acceptedBid, ...prev.slice(0, 49)]);
          }

          soundFX.playBidAccepted();
          setHighBidFlash(true);
          setTimeout(() => setHighBidFlash(false), 800);
          setTelemetry((prev) => ({ ...prev, averageLatencyMs: latency }));
        }
      } catch (err: any) {
        const latency = Math.round(Math.max(1, performance.now() - start));
        soundFX.playBidOutbid();

        if (err instanceof BackendError && err.backendData) {
          const backendData = err.backendData;
          const friendlyMessage = mapBackendRejection(backendData.reason, backendData.message);
          setLastBidError(friendlyMessage);

          const rejectedBid: Bid = {
            id: `rej-${Date.now()}`,
            auctionId: currentAuctionId,
            bidderId: user.id,
            bidderName: user.name,
            amount: targetAmount,
            timestamp: backendData.timestamp || Date.now(),
            status: 'REJECTED',
            reason: backendData.reason || 'REJECTED',
            latencyMs: latency,
          };
          setBids((prev) => [rejectedBid, ...prev.slice(0, 49)]);
        } else {
          // Network failure or backend offline - DO NOT fake an acceptance
          setLastBidError(err.message || 'Failed to communicate with backend server.');
        }

        setTimeout(() => setLastBidError(null), 4000);
      } finally {
        setIsSubmitting(false);
      }
    },
    [auction, currentAuctionId, user]
  );

  // Switch to another active auction
  const switchAuction = useCallback((newAuctionId: string) => {
    if (!newAuctionId || newAuctionId === currentAuctionId) return;
    socketService.leaveAuctionRoom(currentAuctionId);
    setCurrentAuctionId(newAuctionId);
    seenBidsRef.current.clear();
    setOutbidAlert(false);
    setLastBidError(null);
    socketService.joinAuctionRoom(newAuctionId);
    refreshAuthoritativeAuction(newAuctionId);
  }, [currentAuctionId, refreshAuthoritativeAuction]);

  // Switch simulated user profile
  const switchUser = useCallback((name: string) => {
    setUser({
      id: name,
      name,
      walletBalance: 30000,
    });
    setOutbidAlert(false);
    setLastBidError(null);
  }, []);

  return {
    auction,
    bids,
    user,
    telemetry,
    availableAuctions,
    currentAuctionId,
    isConnected,
    isLoading,
    serverError,
    isSubmitting,
    lastBidError,
    outbidAlert,
    highBidFlash,
    setOutbidAlert,
    submitBid,
    switchAuction,
    switchUser,
    refreshAuthoritativeAuction,
    retryConnection,
  };
}
