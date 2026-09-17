import React from 'react';
import { History, ArrowUpRight, Zap, CheckCircle2, XCircle } from 'lucide-react';
import type { Bid } from '../types/auction';

interface LiveBidFeedProps {
  bids: Bid[];
  currentUserId: string;
}

export const LiveBidFeed: React.FC<LiveBidFeedProps> = ({ bids, currentUserId }) => {
  return (
    <div className="relative overflow-hidden rounded-3xl glass-strong p-4 sm:p-5 shadow-2xl shadow-black/30 flex flex-col h-[380px] sm:h-[460px]">
      {/* Background glow */}
      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative flex items-center justify-between pb-3.5 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-400/20 to-blue-600/20 border border-cyan-400/15">
            <History className="w-3.5 h-3.5 text-cyan-300 flex-shrink-0" />
          </div>
          <h2 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
            Live Bid Stream
          </h2>
        </div>
        <div className="flex items-center gap-2 text-[10px] sm:text-[11px] font-mono text-slate-400 flex-shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="relative flex">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-emerald-400 font-semibold">LIVE</span>
          </span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-400">{bids.length} bids</span>
        </div>
      </div>

      {/* Feed */}
      <div className="relative flex-1 overflow-y-auto mt-3 space-y-2 pr-1 custom-scrollbar">
        {bids.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 text-xs font-mono space-y-3 text-center p-4">
            <div className="p-4 rounded-2xl glass border border-white/5">
              <Zap className="w-6 h-6 text-slate-600 animate-pulse mx-auto" />
            </div>
            <span>Awaiting incoming bids...</span>
          </div>
        ) : (
          bids.map((bid, index) => {
            const isUser = bid.bidderId === currentUserId;
            const isTop = index === 0 && bid.status === 'ACCEPTED';
            const isRejected = bid.status === 'REJECTED';

            return (
              <div
                key={bid.id || `${bid.amount}-${bid.timestamp}-${index}`}
                className={`p-3 rounded-2xl border transition-all duration-300 flex items-center justify-between gap-2.5 ${
                  isRejected
                    ? 'bg-rose-500/5 border-rose-500/20'
                    : isTop
                    ? 'bg-gradient-to-r from-cyan-500/10 to-indigo-500/8 border-cyan-400/30 shadow-sm shadow-cyan-500/10'
                    : isUser
                    ? 'bg-indigo-500/8 border-indigo-400/25'
                    : 'glass border-white/5 hover:border-white/10'
                }`}
              >
                {/* Left: Rank + Bidder info */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-black font-mono flex-shrink-0 border ${
                    isRejected
                      ? 'bg-rose-500/15 text-rose-400 border-rose-500/25'
                      : isTop
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30'
                      : 'bg-white/5 text-slate-500 border-white/8'
                  }`}>
                    {isRejected ? '✕' : `${index + 1}`}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-xs font-bold font-mono truncate max-w-[100px] sm:max-w-[140px] ${
                        isRejected
                          ? 'text-rose-300 line-through opacity-70'
                          : isUser
                          ? 'text-indigo-300'
                          : 'text-slate-200'
                      }`}>
                        {bid.bidderName}
                      </span>
                      {isUser && (
                        <span className="text-[9px] font-mono text-cyan-400 font-bold px-1 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 flex-shrink-0">
                          You
                        </span>
                      )}
                      {isTop && (
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-400/20 uppercase tracking-wide flex-shrink-0">
                          Leader
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[9px] sm:text-[10px] font-mono text-slate-600 mt-0.5">
                      <span>
                        {(!isNaN(bid.timestamp) && bid.timestamp > 0 ? new Date(bid.timestamp) : new Date()).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                      {bid.latencyMs !== undefined && (
                        <>
                          <span>·</span>
                          <span className="text-emerald-600">{bid.latencyMs}ms</span>
                        </>
                      )}
                      {isRejected && bid.reason && (
                        <>
                          <span>·</span>
                          <span className="text-rose-500 truncate max-w-[80px]">{bid.reason}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Amount + Status */}
                <div className="text-right flex-shrink-0">
                  <div className={`flex items-center gap-1 justify-end font-mono font-bold text-xs sm:text-sm ${
                    isRejected ? 'text-rose-400 line-through opacity-60' : 'text-white'
                  }`}>
                    <span>₹{(bid.amount || 0).toLocaleString()}</span>
                    {!isRejected && <ArrowUpRight className="w-3 h-3 text-cyan-400" />}
                  </div>
                  <div className="flex items-center gap-0.5 justify-end mt-0.5">
                    {bid.status === 'ACCEPTED' ? (
                      <span className="text-[9px] font-mono text-emerald-500 flex items-center gap-0.5">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Settled
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono text-rose-500 flex items-center gap-0.5">
                        <XCircle className="w-2.5 h-2.5" /> Rejected
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
