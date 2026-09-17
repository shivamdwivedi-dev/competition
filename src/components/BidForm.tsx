import React, { useState, useEffect } from 'react';
import { Gavel, AlertCircle, Zap, CheckCircle2, ArrowUpRight, Loader2, Sparkles } from 'lucide-react';
import type { AuctionItem, UserProfile } from '../types/auction';

interface BidFormProps {
  auction: AuctionItem;
  user: UserProfile;
  isSubmitting: boolean;
  lastError: string | null;
  lastSuccess?: string | null;
  onSubmitBid: (customAmount?: number) => void;
}

export const BidForm: React.FC<BidFormProps> = ({
  auction,
  user,
  isSubmitting,
  lastError,
  lastSuccess,
  onSubmitBid,
}) => {
  const hasPreviousBids = Boolean(auction.totalBidsCount > 0 && auction.highestBidderId);
  const minNextBid = hasPreviousBids
    ? auction.currentHighestBid + auction.minIncrement
    : auction.startingPrice;

  const [inputVal, setInputVal] = useState<string>(String(minNextBid));
  const [validationError, setValidationError] = useState<string | null>(null);

  // Update input placeholder/default when auction bid updates
  useEffect(() => {
    setInputVal(String(minNextBid));
    setValidationError(null);
  }, [auction.currentHighestBid, auction.minIncrement, auction.id, minNextBid]);

  const numericInput = parseFloat(inputVal);
  const isInputValidNumber = !isNaN(numericInput) && numericInput > 0;
  const isExceedingCurrent = hasPreviousBids
    ? numericInput > auction.currentHighestBid
    : numericInput >= auction.startingPrice;

  // Live client validation check
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputVal(val);

    if (!val || val.trim() === '') {
      setValidationError('Please enter a bid amount.');
      return;
    }

    const num = parseFloat(val);
    if (isNaN(num) || num <= 0) {
      setValidationError('Bid amount must be a positive number.');
      return;
    }

    if (hasPreviousBids && num <= auction.currentHighestBid) {
      setValidationError(`Must be strictly greater than current highest bid of ₹${auction.currentHighestBid.toLocaleString()}`);
      return;
    }

    if (!hasPreviousBids && num < auction.startingPrice) {
      setValidationError(`Must be at least the starting price of ₹${auction.startingPrice.toLocaleString()}`);
      return;
    }

    setValidationError(null);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuctionLive) return;

    if (!inputVal || inputVal.trim() === '') {
      setValidationError('Please enter a bid amount.');
      return;
    }

    const val = parseFloat(inputVal);
    if (isNaN(val) || val <= 0) {
      setValidationError('Please enter a valid positive number.');
      return;
    }

    if (hasPreviousBids && val <= auction.currentHighestBid) {
      setValidationError(`Bid must strictly exceed ₹${auction.currentHighestBid.toLocaleString()}`);
      return;
    }

    if (!hasPreviousBids && val < auction.startingPrice) {
      setValidationError(`Bid must be at least ₹${auction.startingPrice.toLocaleString()}`);
      return;
    }

    setValidationError(null);
    onSubmitBid(val);
  };

  const handleQuickIncrement = (inc: number) => {
    const nextVal = (hasPreviousBids ? auction.currentHighestBid : auction.startingPrice) + inc;
    setInputVal(String(nextVal));
    setValidationError(null);
    onSubmitBid(nextVal);
  };

  const isAuctionLive = auction.status === 'LIVE';
  const quickIncrements = [50, 100, 250, 500];

  return (
    <div className="relative overflow-hidden rounded-3xl glass-strong p-5 sm:p-7 space-y-5 shadow-2xl shadow-black/40 border border-white/10">
      
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="relative flex items-center justify-between pb-3 border-b border-white/8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-cyan-400/20 to-indigo-600/20 border border-cyan-400/20">
            <Gavel className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-300" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-white tracking-wide">
              Custom Bidding Console
            </h2>
            <p className="text-[10px] text-slate-400 font-mono hidden sm:block">
              Atomic Redis Lua Engine · Ultra-Low Latency Execution
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] font-mono text-slate-500 uppercase block">Active Bidder</span>
          <span className="text-xs font-mono font-bold text-cyan-300">{user.name}</span>
        </div>
      </div>

      {/* Benchmark summary banner */}
      <div className="relative p-3.5 rounded-2xl glass border border-white/8 flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-mono">
          <span className="text-slate-400">Current highest bid: </span>
          <strong className="text-white text-sm">
            {hasPreviousBids ? `₹${auction.currentHighestBid.toLocaleString()}` : `₹${auction.startingPrice.toLocaleString()} (Start)`}
          </strong>
        </div>
        <div className="text-[11px] font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-400/25 px-2.5 py-1 rounded-full">
          <span>Min next bid: <strong>₹{minNextBid.toLocaleString()}</strong></span>
        </div>
      </div>

      {/* Feedback Banners */}
      {lastError && (
        <div className="relative p-4 rounded-2xl bg-rose-500/15 border border-rose-500/35 flex items-start gap-3 backdrop-blur-md shadow-lg shadow-rose-500/10 animate-shake">
          <div className="p-1.5 rounded-xl bg-rose-500/20 flex-shrink-0 mt-0.5">
            <AlertCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="flex-1 font-mono text-xs break-words">
            <span className="font-bold text-rose-300">BID REJECTED — </span>
            <span className="text-rose-200">{lastError}</span>
          </div>
        </div>
      )}

      {lastSuccess && (
        <div className="relative p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/35 flex items-start gap-3 backdrop-blur-md shadow-lg shadow-emerald-500/10">
          <div className="p-1.5 rounded-xl bg-emerald-500/20 flex-shrink-0 mt-0.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex-1 font-mono text-xs break-words">
            <span className="font-bold text-emerald-300">BID ACCEPTED — </span>
            <span className="text-emerald-100">{lastSuccess}</span>
          </div>
        </div>
      )}

      {/* PRIMARY FEATURE: Custom Bid Amount Form */}
      <form onSubmit={handleCustomSubmit} className="space-y-3">
        <div className="flex items-center justify-between text-xs font-mono text-slate-300">
          <label className="font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Enter Your Custom Bid Amount</span>
          </label>
          <span className="text-slate-500 text-[11px]">
            {isInputValidNumber && isExceedingCurrent ? (
              <span className="text-emerald-400 flex items-center gap-1">
                ✓ +₹{(numericInput - (hasPreviousBids ? auction.currentHighestBid : auction.startingPrice)).toLocaleString()} over current
              </span>
            ) : null}
          </span>
        </div>

        {/* Input + Place Bid Button Group */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-400 font-mono font-black text-base">
              ₹
            </span>
            <input
              type="number"
              min={minNextBid}
              step={auction.minIncrement || 1}
              value={inputVal}
              onChange={handleInputChange}
              disabled={!isAuctionLive || isSubmitting}
              placeholder={`Enter your bid amount... (e.g. ₹${minNextBid})`}
              className={`w-full glass border rounded-2xl pl-10 pr-4 py-3.5 text-white font-mono font-extrabold text-base focus:outline-none focus:ring-2 disabled:opacity-40 min-h-[52px] placeholder:text-slate-600 transition-all ${
                validationError
                  ? 'border-rose-500/60 focus:border-rose-400 focus:ring-rose-400/30'
                  : 'border-white/15 focus:border-cyan-400/70 focus:ring-cyan-400/30'
              }`}
            />
          </div>

          <button
            type="submit"
            disabled={!isAuctionLive || isSubmitting || Boolean(validationError)}
            className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 hover:from-cyan-400 hover:via-indigo-400 hover:to-purple-500 text-white font-mono font-black text-sm tracking-wider uppercase flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] active:scale-[0.98] border border-white/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 min-h-[52px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Committing...</span>
              </>
            ) : (
              <>
                <ArrowUpRight className="w-4 h-4" />
                <span>PLACE BID</span>
              </>
            )}
          </button>
        </div>

        {/* Validation Error Message */}
        {validationError && (
          <p className="text-xs text-rose-400 font-mono flex items-center gap-1.5 pt-0.5">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{validationError}</span>
          </p>
        )}
      </form>

      {/* QUICK ACTIONS: 1-Click Fast Bid & Quick Increments */}
      <div className="pt-2 border-t border-white/8 space-y-3">
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 uppercase tracking-wider">
          <span>Or Quick Increments</span>
          <span className="text-[10px] text-slate-500">1-Click atomic submission</span>
        </div>

        {/* 1-Click Fast Bid Button */}
        <button
          type="button"
          disabled={!isAuctionLive || isSubmitting}
          onClick={() => onSubmitBid(minNextBid)}
          className={`w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm font-mono tracking-wide flex items-center justify-center gap-2.5 transition-all cursor-pointer border ${
            !isAuctionLive
              ? 'glass border-white/5 text-slate-500 cursor-not-allowed'
              : 'glass hover:bg-white/10 text-cyan-200 hover:text-white border-cyan-500/30 hover:border-cyan-400 shadow-md shadow-cyan-500/10 active:scale-[0.99]'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
          <span>1-Click Minimum Next Bid: <strong>₹{minNextBid.toLocaleString()}</strong></span>
        </button>

        {/* Quick Increment Shortcut Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {quickIncrements.map((inc) => (
            <button
              key={inc}
              type="button"
              disabled={!isAuctionLive || isSubmitting}
              onClick={() => handleQuickIncrement(inc)}
              className="py-2.5 px-2 rounded-xl glass hover:bg-white/10 text-slate-200 hover:text-white border border-white/8 hover:border-indigo-400/40 font-mono text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95 min-h-[42px]"
            >
              +₹{inc}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
};
