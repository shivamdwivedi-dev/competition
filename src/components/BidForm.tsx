import React, { useState } from 'react';
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

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(customAmount);
    if (!isNaN(val)) {
      onSubmitBid(val);
    }
  };

  const handleQuickAdd = (inc: number) => {
    const nextVal = auction.currentHighestBid + inc;
    setCustomAmount(String(nextVal));
    onSubmitBid(nextVal);
  };

  const isAuctionLive = auction.status === 'LIVE';

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-xl bg-indigo-950/80 border border-indigo-800/60 text-indigo-400">
            <Gavel className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide uppercase">
              Instant Bidding Console
            </h2>
            <p className="text-[11px] text-slate-400 font-mono">
              Optimistic Execution with Millisecond Redis Rollback
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] font-mono text-slate-500 uppercase block">Available Balance</span>
          <span className="text-xs font-mono font-bold text-emerald-400">${user.walletBalance.toLocaleString()}</span>
        </div>
      </div>

      {lastError && (
        <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-600/80 text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{lastError}</span>
        </div>
      )}

      <button
        type="button"
        disabled={!isAuctionLive || isSubmitting}
        onClick={() => onSubmitBid()}
        className={`w-full py-4 px-6 rounded-xl font-extrabold text-base tracking-wide flex items-center justify-center space-x-3 transition-all duration-200 ${
          !isAuctionLive
            ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            : 'bg-gradient-to-r from-cyan-500 via-indigo-500 to-fuchsia-600 hover:from-cyan-400 hover:via-indigo-400 hover:to-fuchsia-500 text-white shadow-xl shadow-cyan-500/25 active:scale-[0.98] border border-cyan-400/30'
        }`}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>LOCKING BID ON REDIS...</span>
          </>
        ) : (
          <>
            <Zap className="w-5 h-5 text-yellow-300 fill-yellow-300" />
            <span>1-CLICK QUICK BID: ${minNextBid.toLocaleString()}</span>
            <ArrowUpRight className="w-5 h-5" />
          </>
        )}
      </button>

      <div>
        <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-2">
          Quick Jump Increments
        </span>
        <div className="grid grid-cols-4 gap-2">
          {quickIncrements.map((inc) => (
            <button
              key={inc}
              type="button"
              disabled={!isAuctionLive || isSubmitting}
              onClick={() => handleQuickAdd(inc)}
              className="py-2 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 font-mono text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:border-cyan-500/50"
            >
              +${inc}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleCustomSubmit} className="space-y-3 pt-2 border-t border-slate-800">
        <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
          Custom Bid Amount
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold">$</span>
            <input
              type="number"
              min={minNextBid}
              step={auction.minIncrement}
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              disabled={!isAuctionLive || isSubmitting}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-2.5 text-white font-mono font-bold text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 disabled:opacity-50"
              placeholder={String(minNextBid)}
            />
          </div>
          <button
            type="submit"
            disabled={!isAuctionLive || isSubmitting}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-mono text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:border-cyan-400"
          >
            Place Bid
          </button>
        </div>
      </form>

    </div>
  );
};
