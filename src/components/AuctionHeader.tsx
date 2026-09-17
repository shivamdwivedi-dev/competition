import React from 'react';
import { Tag, Shield, Zap, Sparkles } from 'lucide-react';
import type { AuctionItem } from '../types/auction';
import { CountdownTimer } from './CountdownTimer';

interface AuctionHeaderProps {
  auction: AuctionItem;
}

export const AuctionHeader: React.FC<AuctionHeaderProps> = ({ auction }) => {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 p-5 sm:p-6 shadow-2xl">
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden border border-slate-700 bg-slate-800 flex-shrink-0 shadow-lg group">
            <img
              src={auction.imageUrl}
              alt={auction.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-slate-950/80 backdrop-blur-md text-[10px] font-bold text-cyan-400 border border-cyan-800/40">
              #SYN-01
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-950/80 text-indigo-400 border border-indigo-800/60 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Featured Asset
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Verified Seller
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono text-slate-400 bg-slate-800/60 border border-slate-700/60">
                Min. Increment: +${auction.minIncrement}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
              {auction.title}
            </h1>

            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl line-clamp-2">
              {auction.description}
            </p>
          </div>
        </div>

        <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-800 gap-3">
          <div className="text-left lg:text-right">
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Time Remaining</span>
            </div>
            <div className="mt-1">
              <CountdownTimer endTime={auction.endTime} status={auction.status} />
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono text-slate-400 bg-slate-950/60 px-3 py-1 rounded-lg border border-slate-800">
            <Tag className="w-3 h-3 text-cyan-400" />
            <span>Starting: <strong className="text-slate-200">${auction.startingPrice.toLocaleString()}</strong></span>
            <span>•</span>
            <span>Total Bids: <strong className="text-cyan-400">{auction.totalBidsCount}</strong></span>
          </div>
        </div>

      </div>
    </div>
  );
};
