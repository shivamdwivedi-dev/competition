import { useState, useEffect, useCallback, useRef } from 'react';
import type { AuctionItem, Bid, SystemTelemetry, UserProfile } from '../types/auction';
import { apiService } from '../services/api';
import { socketService, SOCKET_EVENTS, type RawBidUpdatePayload } from '../services/socket';
import { soundFX } from '../utils/audio';

const INITIAL_AUCTION: AuctionItem = {
  id: 'auction-synora-01',
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

const INITIAL_USER: UserProfile = {
  id: 'usr-warrior-' + Math.floor(1000 + Math.random() * 9000),
  name: 'WarriorPiyush',
  walletBalance: 25000,
};

export function useAuction(auctionId: string = 'auction-synora-01') {
  const [auction, setAuction] = useState<AuctionItem>(INITIAL_AUCTION);
  const [bids, setBids] = useState<Bid[]>([]);
  const [user, setUser] = useState<UserProfile>(INITIAL_USER);
  const [telemetry, setTelemetry] = useState<SystemTelemetry>({
    bidsPerSecond: 0,
    activeSockets: 1,
    averageLatencyMs: 0,
    redisThroughput: 99.8,
    serverTime: Date.now(),
  });
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [lastBidError, setLastBidError] = useState<string | null>(null);
  const [outbidAlert, setOutbidAlert] = useState<boolean>(false);
  const [highBidFlash, setHighBidFlash] = useState<boolean>(false);
  const [isSimulatingLoad, setIsSimulatingLoad] = useState<boolean>(false);
  const simulationIntervalRef = useRef<number | null>(null);
  const roundtripStartRef = useRef<number>(0);

  // Initial Load from REST
  useEffect(() => {
    let mounted = true;
    apiService.getAuctionDetails(auctionId).then((data) => {
      if (mounted && data) setAuction(data);
    });
    apiService.getBidHistory(auctionId).then((history) => {
      if (mounted && history) setBids(history);
    });
    return () => {
      mounted = false;
    };
  }, [auctionId]);

  // Socket setup with multi-event normalization
  useEffect(() => {
    const socket = socketService.connect();

    const onConnect = () => {
      setIsConnected(true);
      socketService.joinAuctionRoom(auctionId);
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    // Unified handler for Arya's `bid:update` and legacy `highestBidUpdated` / `bidUpdated`
    const handleNormalizedBidUpdate = (raw: RawBidUpdatePayload) => {
      const eventAuctionId = raw.auctionId || auctionId;
      if (eventAuctionId !== auctionId) return;

      const highestBid = raw.highestBid ?? raw.amount ?? 0;
      let bidderId: string = raw.highestBidderId || '';
      let bidderName: string = raw.highestBidderName || '';

      if (typeof raw.highestBidder === 'string') {
        bidderId = raw.highestBidder;
        bidderName = raw.highestBidder;
      } else if (raw.highestBidder && typeof raw.highestBidder === 'object') {
        bidderId = raw.highestBidder.id || bidderId;
        bidderName = raw.highestBidder.name || bidderName || bidderId;
      }

      setAuction((prev) => {
        const finalBid = highestBid > 0 ? highestBid : prev.currentHighestBid;
        const finalBidderId = bidderId || prev.highestBidderId;
        const finalBidderName = bidderName || prev.highestBidderName;

        if (prev.highestBidderId === user.id && finalBidderId !== user.id) {
          setOutbidAlert(true);
          soundFX.playBidOutbid();
        } else if (finalBidderId === user.id) {
          soundFX.playBidAccepted();
        }

        return {
          ...prev,
          currentHighestBid: finalBid,
          highestBidderId: finalBidderId,
          highestBidderName: finalBidderName,
          totalBidsCount: raw.totalBids || prev.totalBidsCount + 1,
        };
      });

      // Also append to live bid audit trail
      const newBidEntry: Bid = {
        id: `bid-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        auctionId,
        bidderId: bidderId || 'bidder',
        bidderName: bidderName || 'Bidder',
        amount: highestBid,
        timestamp: raw.timestamp ? new Date(raw.timestamp).getTime() : Date.now(),
        status: 'ACCEPTED',
      };
      setBids((prev) => [newBidEntry, ...prev.slice(0, 49)]);

      setHighBidFlash(true);
      setTimeout(() => setHighBidFlash(false), 800);
    };

    const onBidAccepted = (bid: Bid) => {
      if (bid.auctionId === auctionId) {
        setBids((prev) => [bid, ...prev.slice(0, 49)]);
      }
    };

    const onBidRejected = (data: { reason: string }) => {
      setLastBidError(data.reason || 'Bid was outpaced by another transaction');
      setTimeout(() => setLastBidError(null), 4000);
    };

    const onAuctionEnded = (data: any) => {
      setAuction((prev) => ({
        ...prev,
        status: 'ENDED',
        highestBidderId: data.winnerId || data.winner || prev.highestBidderId,
        highestBidderName: data.winnerName || data.winner || prev.highestBidderName,
        currentHighestBid: data.winningBid || data.amount || prev.currentHighestBid,
      }));
      soundFX.playHammer();
    };

    const onSystemMetrics = (metrics: SystemTelemetry) => {
      setTelemetry(metrics);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // Register listeners for Arya's `bid:update` and aliases
    socket.on(SOCKET_EVENTS.SERVER_BID_UPDATE, handleNormalizedBidUpdate);
    socket.on(SOCKET_EVENTS.SERVER_HIGHEST_BID_UPDATED, handleNormalizedBidUpdate);
    socket.on(SOCKET_EVENTS.SERVER_BID_UPDATED, handleNormalizedBidUpdate);

    socket.on(SOCKET_EVENTS.SERVER_BID_ACCEPTED, onBidAccepted);
    socket.on(SOCKET_EVENTS.SERVER_BID_REJECTED, onBidRejected);
    socket.on(SOCKET_EVENTS.SERVER_AUCTION_ENDED, onAuctionEnded);
    socket.on(SOCKET_EVENTS.SERVER_SYSTEM_METRICS, onSystemMetrics);
    socket.on(SOCKET_EVENTS.SERVER_TELEMETRY, onSystemMetrics);

    if (socket.connected) {
      setIsConnected(true);
      socketService.joinAuctionRoom(auctionId);
    }

    const pingInterval = setInterval(() => {
      if (socket.connected) {
        roundtripStartRef.current = performance.now();
        socket.emit(SOCKET_EVENTS.CLIENT_PING, { clientTime: Date.now() });
      }
    }, 4000);

    return () => {
      clearInterval(pingInterval);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off(SOCKET_EVENTS.SERVER_BID_UPDATE, handleNormalizedBidUpdate);
      socket.off(SOCKET_EVENTS.SERVER_HIGHEST_BID_UPDATED, handleNormalizedBidUpdate);
      socket.off(SOCKET_EVENTS.SERVER_BID_UPDATED, handleNormalizedBidUpdate);
      socket.off(SOCKET_EVENTS.SERVER_BID_ACCEPTED, onBidAccepted);
      socket.off(SOCKET_EVENTS.SERVER_BID_REJECTED, onBidRejected);
      socket.off(SOCKET_EVENTS.SERVER_AUCTION_ENDED, onAuctionEnded);
      socket.off(SOCKET_EVENTS.SERVER_SYSTEM_METRICS, onSystemMetrics);
      socket.off(SOCKET_EVENTS.SERVER_TELEMETRY, onSystemMetrics);
    };
  }, [auctionId, user.id]);

  // Place Bid Action (via Socket or REST fallback)
  const submitBid = useCallback(
    async (customAmount?: number) => {
      if (auction.status !== 'LIVE') return;
      const targetAmount = customAmount ?? auction.currentHighestBid + auction.minIncrement;

      if (targetAmount <= auction.currentHighestBid) {
        setLastBidError('Bid must exceed current highest bid');
        setTimeout(() => setLastBidError(null), 3000);
        return;
      }

      if (targetAmount > user.walletBalance) {
        setLastBidError('Insufficient wallet balance!');
        setTimeout(() => setLastBidError(null), 3000);
        return;
      }

      setIsSubmitting(true);
      setLastBidError(null);
      const start = performance.now();

      const socket = socketService.getSocket();
      if (socket?.connected) {
        socketService.emitBid(
          auctionId,
          targetAmount,
          user.id,
          user.name,
          (ack) => {
            setIsSubmitting(false);
            const latency = Math.round(performance.now() - start);
            if (ack && !ack.success) {
              setLastBidError(ack.message || 'Bid rejected by concurrency lock');
              setTimeout(() => setLastBidError(null), 3000);
            } else {
              setTelemetry((prev) => ({ ...prev, averageLatencyMs: latency }));
            }
          }
        );
      } else {
        // Fallback optimistic simulation mode
        try {
          const newBid: Bid = {
            id: 'bid-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            auctionId,
            bidderId: user.id,
            bidderName: user.name,
            amount: targetAmount,
            timestamp: Date.now(),
            status: 'ACCEPTED',
            latencyMs: Math.round(performance.now() - start),
          };

          setAuction((prev) => ({
            ...prev,
            currentHighestBid: targetAmount,
            highestBidderId: user.id,
            highestBidderName: user.name,
            totalBidsCount: prev.totalBidsCount + 1,
          }));

          setBids((prev) => [newBid, ...prev.slice(0, 49)]);
          soundFX.playBidAccepted();
          setHighBidFlash(true);
          setTimeout(() => setHighBidFlash(false), 800);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Bid failed';
          setLastBidError(msg);
        } finally {
          setIsSubmitting(false);
        }
      }
    },
    [auction, auctionId, user]
  );

  // High-frequency Stress Demo Load Generator
  const toggleLoadSimulation = useCallback(() => {
    if (isSimulatingLoad) {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
        simulationIntervalRef.current = null;
      }
      setIsSimulatingLoad(false);
    } else {
      setIsSimulatingLoad(true);
      const botNames = ['ApexHFT', 'CyberViper_v2', 'ArbitrageBot_9', 'Falcon_Quant', 'Hyperion_88', 'GlitchGhost'];

      simulationIntervalRef.current = window.setInterval(() => {
        const randomBot = botNames[Math.floor(Math.random() * botNames.length)];
        const botId = 'bot-' + randomBot.toLowerCase();

        setAuction((prev) => {
          if (prev.status !== 'LIVE') return prev;
          const nextBid = prev.currentHighestBid + prev.minIncrement;
          const newBidObj: Bid = {
            id: 'sim-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            auctionId: prev.id,
            bidderId: botId,
            bidderName: randomBot,
            amount: nextBid,
            timestamp: Date.now(),
            status: 'ACCEPTED',
            latencyMs: Math.floor(2 + Math.random() * 8),
          };

          setBids((bPrev) => [newBidObj, ...bPrev.slice(0, 49)]);

          if (prev.highestBidderId === user.id) {
            setOutbidAlert(true);
            soundFX.playBidOutbid();
          }

          return {
            ...prev,
            currentHighestBid: nextBid,
            highestBidderId: botId,
            highestBidderName: randomBot,
            totalBidsCount: prev.totalBidsCount + 1,
          };
        });

        setTelemetry((prev) => ({
          ...prev,
          bidsPerSecond: Math.floor(120 + Math.random() * 80),
          averageLatencyMs: Math.round(2.5 + Math.random() * 3),
        }));

        setHighBidFlash(true);
        setTimeout(() => setHighBidFlash(false), 200);
      }, 750);
    }
  }, [isSimulatingLoad, user.id]);

  const extendAuctionTime = useCallback((seconds: number) => {
    setAuction((prev) => ({
      ...prev,
      endTime: Math.max(Date.now(), prev.endTime) + seconds * 1000,
      status: 'LIVE',
    }));
  }, []);

  const resetAuction = useCallback(() => {
    setAuction({
      ...INITIAL_AUCTION,
      endTime: Date.now() + 1000 * 60 * 5,
      status: 'LIVE',
      currentHighestBid: 5000,
      highestBidderId: null,
      highestBidderName: null,
      totalBidsCount: 0,
    });
    setBids([]);
    setOutbidAlert(false);
  }, []);

  const switchUser = useCallback((name: string) => {
    setUser({
      id: 'usr-' + name.toLowerCase().replace(/\s+/g, '-'),
      name,
      walletBalance: 30000,
    });
    setOutbidAlert(false);
  }, []);

  return {
    auction,
    bids,
    user,
    telemetry,
    isConnected,
    isSubmitting,
    lastBidError,
    outbidAlert,
    highBidFlash,
    isSimulatingLoad,
    setOutbidAlert,
    submitBid,
    toggleLoadSimulation,
    extendAuctionTime,
    resetAuction,
    switchUser,
  };
}
