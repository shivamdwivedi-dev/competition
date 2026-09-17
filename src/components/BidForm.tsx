import React, { useState, useEffect } from 'react';
import { Gavel, AlertCircle, Zap, ArrowUpRight, Loader2 } from 'lucide-react';
import type { AuctionItem, UserProfile } from '../types/auction';

interface BidFormProps {
  auction: AuctionItem;
  user: UserProfile;
  isSubmitting: boolean;
  lastError: string | null;
  onSubmitBid: (customAmount?: number) => void;
}

export const BidForm: React.FC<BidFormProps> = ({
  auction,
  user,
  isSubmitting,
  lastError,
  onSubmitBid,
}) => {
  const minNextBid = auction.currentHighestBid + auction.minIncrement;
  const [customAmount, setCustomAmount] = useState<string>(String(minNextBid));
  const quickIncrements = [auction.minIncrement, auction.minIncrement * 2, auction.minIncrement * 5, auction.minIncrement * 10];

  useEffect(() => {
    setCustomAmount(String(auction.currentHighestBid + auction.minIncrement));
  }, [auction.currentHighestBid, auction.minIncrement]);

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(customAmount);
    if (!isNaN(val)) {
      onSubmitBid(val);
    } else {
      onSubmitBid(minNextBid);
    }
  };

  const handleQuickAdd = (inc: number) => {
    const nextVal = auction.currentHighestBid + inc;
    setCustomAmount(String(nextVal));
    onSubmitBid(nextVal);
  };

  const isAuctionLive = auction.status === 'LIVE';

  return (
    <div className="relative overflow-hidden rounded-3xl glass-strong p-5 sm:p-6 space-y-5 shadow-2xl shadow-black/30">
      {/* Subtle background accent */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-400/20 to-purple-600/20 border border-indigo-400/20">
            <Gavel className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-300" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-white tracking-wide">Place Your Bid</h2>
            <p className="text-[10px] text-slate-500 font-mono hidden sm:block">Atomic Redis Lua Settlement</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-mono text-slate-500 uppercase block">Bidding as</span>
          <span className="text-xs font-mono font-bold text-indigo-300">{user.name}</span>
        </div>
      </div>

      {/* Error Banner */}
      {lastError && (
        <div className="relative p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 backdrop-blur-sm">
          <div className="p-1.5 rounded-xl bg-rose-500/20 flex-shrink-0 mt-0.5">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="flex-1 font-mono text-xs break-words">
            <span className="font-bold text-rose-300">BID REJECTED — </span>
            <span className="text-rose-400/80">{lastError}</span>
          </div>
        </div>
      )}

      {/* 1-Click Quick Bid */}
      <button
        type="button"
        disabled={!isAuctionLive || isSubmitting}
        onClick={() => onSubmitBid()}
        className={`relative w-full py-4 px-5 rounded-2xl font-extrabold text-sm sm:text-base tracking-wide flex items-center justify-center gap-3 transition-all duration-200 overflow-hidden min-h-[52px] cursor-pointer ${
          !isAuctionLive
            ? 'glass border border-white/5 text-slate-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 hover:from-cyan-400 hover:via-indigo-400 hover:to-purple-500 text-white shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.01] active:scale-[0.99] border border-white/10'
        }`}
      >
        {isAuctionLive && !isSubmitting && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        )}
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
            <span>Committing to Redis...</span>
          </>
        ) : (
          <>
            <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-300 fill-yellow-200 flex-shrink-0" />
            <span className="truncate">Quick Bid — ₹{minNextBid.toLocaleString()}</span>
            <ArrowUpRight className="w-4 h-4 flex-shrink-0 opacity-80" />
          </>
        )}
      </button>

      {/* Quick Increments */}
      <div>
        <span className="text-[10px] sm:text-[11px] font-mono text-slate-500 uppercase tracking-wider block mb-2.5">
          Quick Increments
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {quickIncrements.map((inc) => (
            <button
              key={inc}
              type="button"
              disabled={!isAuctionLive || isSubmitting}
              onClick={() => handleQuickAdd(inc)}
              className="py-2.5 px-2 rounded-xl glass hover:bg-white/10 text-slate-200 hover:text-white border border-white/8 hover:border-indigo-400/40 font-mono text-xs font-bold transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95 min-h-[44px]"
            >
              +₹{inc}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Bid Input */}
      <form onSubmit={handleCustomSubmit} className="space-y-2.5 pt-1 border-t border-white/5">
        <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-mono text-slate-500">
          <label className="uppercase tracking-wider">Custom Amount</label>
          <span>Min: <strong className="text-cyan-300">₹{minNextBid.toLocaleString()}</strong></span>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold text-sm">₹</span>
            <input
              type="number"
              min={minNextBid}
              step={auction.minIncrement}
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              disabled={!isAuctionLive || isSubmitting}
              className="w-full glass border border-white/10 rounded-xl pl-9 pr-3 py-3 text-white font-mono font-bold text-sm focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/30 disabled:opacity-40 min-h-[48px] placeholder:text-slate-600 transition-all"
              placeholder={String(minNextBid)}
            />
          </div>
          <button
            type="submit"
            disabled={!isAuctionLive || isSubmitting}
            className="px-6 py-3 rounded-xl glass hover:bg-white/10 border border-white/10 hover:border-cyan-400/40 text-white font-mono text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95 min-h-[48px]"
          >
            Place Bid
          </button>
        </div>
      </form>
    </div>
  );
};
