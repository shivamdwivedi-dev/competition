import React from 'react';
import { Tag, Shield, Zap, Flame } from 'lucide-react';
import type { AuctionItem } from '../types/auction';
import { CountdownTimer } from './CountdownTimer';
import { formatCurrency, formatCurrencyFull } from '../utils/format';

interface AuctionHeaderProps {
  auction: AuctionItem;
}

export const AuctionHeader: React.FC<AuctionHeaderProps> = ({ auction }) => {
  return (
    <div className="relative overflow-hidden rounded-3xl glass-strong p-5 sm:p-7 shadow-2xl shadow-black/40">
      {/* Decorative gradient blobs */}
      <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-gradient-to-br from-cyan-500/20 to-indigo-600/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-gradient-to-tr from-purple-600/15 to-pink-500/15 blur-3xl pointer-events-none" />

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 relative z-10">

        {/* Left: Item Info */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 min-w-0">
          {/* Item image with glow frame */}
          <div className="relative flex-shrink-0">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-400/40 to-indigo-600/40 blur-md scale-105 pointer-events-none" />
            <div className="relative w-20 h-20 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
              <img
                src={auction.imageUrl}
                alt={auction.title}
                className="w-full h-full object-cover hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-lg glass text-[9px] font-mono font-bold text-cyan-300 border border-cyan-500/30">
                #{auction.id.slice(0, 6)}
              </div>
            </div>
          </div>

          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold glass border border-indigo-400/30 text-indigo-300 flex items-center gap-1.5">
                <Flame className="w-3 h-3 text-orange-400" />
                Live Auction
              </span>
              <span className="px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold glass border border-emerald-400/30 text-emerald-300 flex items-center gap-1.5">
                <Shield className="w-3 h-3" />
                Redis Locked
              </span>
              <span className="px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-mono glass border border-slate-400/20 text-slate-400">
                Min +₹{auction.minIncrement}
              </span>
            </div>

            <h1 className="text-xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight break-words leading-tight">
              {auction.title}
            </h1>

            <p className="text-xs sm:text-sm text-slate-400 max-w-xl line-clamp-2 leading-relaxed">
              {auction.description}
            </p>
          </div>
        </div>

        {/* Right: Countdown & Meta */}
        <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between border-t lg:border-t-0 pt-4 lg:pt-0 border-white/5 gap-4">
          <div className="space-y-1">
            <div className="text-[10px] sm:text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Time Remaining</span>
            </div>
            <CountdownTimer endTime={auction.endTime} status={auction.status} />
          </div>

          <div className="flex items-center gap-3 text-[11px] sm:text-xs font-mono glass border border-white/5 text-slate-400 px-3 py-2 rounded-xl">
            <div className="flex items-center gap-1.5">
              <Tag className="w-3 h-3 text-cyan-400" />
              <span>Start: <strong className="text-white" title={formatCurrencyFull(auction.startingPrice)}>{formatCurrency(auction.startingPrice)}</strong></span>
            </div>
            <div className="w-px h-4 bg-white/10" />
            <span>Bids: <strong className="text-cyan-400">{auction.totalBidsCount}</strong></span>
          </div>
        </div>

      </div>
    </div>
  );
};
