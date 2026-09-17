import React from 'react';
import { History, ArrowUpRight, Zap, CheckCircle2, ShieldAlert } from 'lucide-react';
import type { Bid } from '../types/auction';

interface LiveBidFeedProps {
  bids: Bid[];
  currentUserId: string;
}

export const LiveBidFeed: React.FC<LiveBidFeedProps> = ({ bids, currentUserId }) => {
  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-xl flex flex-col h-[460px]">
      
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <History className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Live Bid Audit Stream
          </h2>
        </div>
        <div className="flex items-center space-x-1 text-[11px] font-mono text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Real-Time Stream</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto mt-3 space-y-2 pr-1 custom-scrollbar">
        {bids.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs font-mono space-y-2">
            <Zap className="w-8 h-8 text-slate-600 animate-pulse" />
            <span>Awaiting incoming bids...</span>
          </div>
        ) : (
          bids.map((bid, index) => {
            const isUser = bid.bidderId === currentUserId;
            const isTop = index === 0;

            return (
              <div
                key={bid.id || `${bid.amount}-${bid.timestamp}-${index}`}
                className={`p-3 rounded-xl border transition-all duration-300 flex items-center justify-between ${
                  isTop
                    ? 'bg-cyan-950/40 border-cyan-500/50 shadow-sm'
                    : isUser
                    ? 'bg-indigo-950/30 border-indigo-500/40'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-1.5 rounded-lg text-xs font-mono font-bold ${
                    isTop ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-400'
                  }`}>
                    #{index + 1}
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs font-bold font-mono ${
                        isUser ? 'text-indigo-400' : 'text-slate-200'
                      }`}>
                        {bid.bidderName} {isUser && '(You)'}
                      </span>
                      {isTop && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-950 text-cyan-400 border border-cyan-800 uppercase">
                          Highest
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(bid.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      {bid.latencyMs ? ` • ${bid.latencyMs}ms` : ''}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center space-x-1 justify-end font-mono font-bold text-sm text-white">
                    <span>${bid.amount.toLocaleString()}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <div className="flex items-center space-x-1 justify-end">
                    {bid.status === 'ACCEPTED' ? (
                      <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-0.5">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Settled
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-rose-400 flex items-center gap-0.5">
                        <ShieldAlert className="w-2.5 h-2.5" /> Rejected
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
