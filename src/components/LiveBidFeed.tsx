import React from 'react';
import { History, ArrowUpRight, Zap, CheckCircle2, XCircle } from 'lucide-react';
import type { Bid } from '../types/auction';

interface LiveBidFeedProps {
  bids: Bid[];
  currentUserId: string;
}

export const LiveBidFeed: React.FC<LiveBidFeedProps> = ({ bids, currentUserId }) => {
  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 sm:p-5 shadow-xl flex flex-col h-[380px] sm:h-[460px]">
      
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <History className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <h2 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider truncate">
            Live Bid Audit Stream
          </h2>
        </div>
        <div className="flex items-center space-x-2 text-[10px] sm:text-[11px] font-mono text-slate-400 flex-shrink-0">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Feed</span>
          </span>
          <span className="text-slate-600">•</span>
          <span>{bids.length}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto mt-3 space-y-2 pr-1 custom-scrollbar">
        {bids.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs font-mono space-y-2 text-center p-4">
            <Zap className="w-8 h-8 text-slate-600 animate-pulse" />
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
                className={`p-2.5 sm:p-3 rounded-xl border transition-all duration-300 flex items-center justify-between gap-2 ${
                  isRejected
                    ? 'bg-rose-950/20 border-rose-900/50'
                    : isTop
                    ? 'bg-cyan-950/40 border-cyan-500/50 shadow-sm ring-1 ring-cyan-500/20'
                    : isUser
                    ? 'bg-indigo-950/30 border-indigo-500/40'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className={`p-1 rounded-lg text-xs font-mono font-bold flex-shrink-0 ${
                    isRejected
                      ? 'bg-rose-950/80 text-rose-400 border border-rose-800/50'
                      : isTop
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {isRejected ? '✕' : `#${index + 1}`}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center space-x-1.5">
                      <span className={`text-xs font-bold font-mono truncate max-w-[100px] sm:max-w-[160px] ${
                        isRejected
                          ? 'text-rose-300 line-through opacity-80'
                          : isUser
                          ? 'text-indigo-400'
                          : 'text-slate-200'
                      }`}>
                        {bid.bidderName}
                      </span>
                      {isUser && (
                        <span className="text-[9px] font-mono text-cyan-400 font-bold flex-shrink-0">
                          (You)
                        </span>
                      )}
                      {isTop && (
                        <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-cyan-950 text-cyan-400 border border-cyan-800 uppercase flex-shrink-0">
                          Leader
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[9px] sm:text-[10px] font-mono text-slate-500 truncate">
                      <span>
                        {(!isNaN(bid.timestamp) && bid.timestamp > 0 ? new Date(bid.timestamp) : new Date()).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                      {bid.latencyMs !== undefined && (
                        <>
                          <span>•</span>
                          <span>{bid.latencyMs}ms</span>
                        </>
                      )}
                      {isRejected && bid.reason && (
                        <>
                          <span>•</span>
                          <span className="text-rose-400 truncate max-w-[90px] sm:max-w-[140px]">{bid.reason}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className={`flex items-center space-x-1 justify-end font-mono font-bold text-xs sm:text-sm ${
                    isRejected ? 'text-rose-400 line-through opacity-75' : 'text-white'
                  }`}>
                    <span>₹{(bid.amount || 0).toLocaleString()}</span>
                    {!isRejected && <ArrowUpRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-400" />}
                  </div>
                  <div className="flex items-center space-x-1 justify-end">
                    {bid.status === 'ACCEPTED' ? (
                      <span className="text-[9px] sm:text-[10px] font-mono text-emerald-400 flex items-center gap-0.5">
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" /> Settled
                      </span>
                    ) : (
                      <span className="text-[9px] sm:text-[10px] font-mono text-rose-400 flex items-center gap-0.5">
                        <XCircle className="w-2.5 h-2.5 text-rose-400" /> Rejected
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
