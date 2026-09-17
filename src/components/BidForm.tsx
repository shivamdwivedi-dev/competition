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
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 sm:p-6 shadow-xl space-y-4 sm:space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-xl bg-indigo-950/80 border border-indigo-800/60 text-indigo-400">
            <Gavel className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-white tracking-wide uppercase">
              Instant Bidding Console
            </h2>
            <p className="text-[10px] text-slate-400 font-mono hidden sm:block">
              Atomic Redis Lua Lock Execution
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] font-mono text-slate-500 uppercase block">User Profile</span>
          <span className="text-xs font-mono font-bold text-cyan-400">{user.name}</span>
        </div>
      </div>

      {/* Error Banner */}
      {lastError && (
        <div className="p-3 rounded-xl bg-rose-950/90 border border-rose-600/90 text-rose-300 text-xs flex items-start space-x-2.5 shadow-lg shadow-rose-950/50">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 font-mono break-words">
            <span className="font-bold text-rose-200">BID REJECTED: </span>
            <span>{lastError}</span>
          </div>
        </div>
      )}

      {/* 1-Click Fast Bid Button */}
      <button
        type="button"
        disabled={!isAuctionLive || isSubmitting}
        onClick={() => onSubmitBid()}
        className={`w-full py-3.5 px-4 rounded-xl font-extrabold text-sm sm:text-base tracking-wide flex items-center justify-center space-x-2 sm:space-x-3 transition-all duration-200 ${
          !isAuctionLive
            ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            : 'bg-gradient-to-r from-cyan-500 via-indigo-500 to-fuchsia-600 hover:from-cyan-400 hover:via-indigo-400 hover:to-fuchsia-500 text-white shadow-xl shadow-cyan-500/25 active:scale-[0.98] border border-cyan-400/30 cursor-pointer min-h-[48px]'
        }`}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
            <span>COMMITTING TO REDIS LUA...</span>
          </>
        ) : (
          <>
            <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-300 fill-yellow-300 flex-shrink-0" />
            <span className="truncate">1-CLICK QUICK BID: ₹{minNextBid.toLocaleString()}</span>
            <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
          </>
        )}
      </button>

      {/* Quick Increment Shortcuts */}
      <div>
        <span className="text-[10px] sm:text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-2">
          Quick Increments
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {quickIncrements.map((inc) => (
            <button
              key={inc}
              type="button"
              disabled={!isAuctionLive || isSubmitting}
              onClick={() => handleQuickAdd(inc)}
              className="py-2.5 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 font-mono text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:border-cyan-500/50 cursor-pointer active:scale-95 min-h-[44px]"
            >
              +₹{inc}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Bid Input Form */}
      <form onSubmit={handleCustomSubmit} className="space-y-2 pt-2 border-t border-slate-800">
        <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-mono text-slate-400">
          <label className="uppercase tracking-wider">Custom Bid Amount</label>
          <span>Min: <strong className="text-cyan-400">₹{minNextBid.toLocaleString()}</strong></span>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold">₹</span>
            <input
              type="number"
              min={minNextBid}
              step={auction.minIncrement}
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              disabled={!isAuctionLive || isSubmitting}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-2.5 text-white font-mono font-bold text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 disabled:opacity-50 min-h-[44px]"
              placeholder={String(minNextBid)}
            />
          </div>
          <button
            type="submit"
            disabled={!isAuctionLive || isSubmitting}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-mono text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:border-cyan-400 cursor-pointer active:scale-95 min-h-[44px]"
          >
            Place Bid
          </button>
        </div>
      </form>

    </div>
  );
};
