import React from 'react';
import { Trophy, TrendingUp, AlertTriangle, UserCheck, ShieldAlert } from 'lucide-react';
import type { AuctionItem, UserProfile } from '../types/auction';

interface CurrentBidCardProps {
  auction: AuctionItem;
  user: UserProfile;
  highBidFlash: boolean;
  outbidAlert: boolean;
  onDismissAlert: () => void;
}

export const CurrentBidCard: React.FC<CurrentBidCardProps> = ({
  auction,
  user,
  highBidFlash,
  outbidAlert,
  onDismissAlert,
}) => {
  const isWinning = auction.highestBidderId === user.id;

  return (
    <div className={`relative overflow-hidden rounded-2xl p-6 transition-all duration-300 border ${
      highBidFlash
        ? 'bg-cyan-950/70 border-cyan-400 shadow-2xl shadow-cyan-500/20 ring-2 ring-cyan-400/50 scale-[1.01]'
        : isWinning
        ? 'bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border-emerald-500/50 shadow-emerald-950/50 shadow-xl'
        : 'bg-slate-900/90 border-slate-800 shadow-xl'
    }`}>

      {outbidAlert && !isWinning && (
        <div className="mb-4 p-3 rounded-xl bg-rose-950/80 border border-rose-600/80 flex items-center justify-between animate-bounce">
          <div className="flex items-center space-x-2 text-rose-300 text-xs font-semibold">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>You have been outbid! Place a higher bid now to regain top position.</span>
          </div>
          <button
            onClick={onDismissAlert}
            className="text-rose-400 hover:text-rose-200 text-xs font-bold px-2 py-0.5 ml-2 rounded bg-rose-900/60"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-800/60 text-cyan-400">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block">
              Current Highest Bid
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              Synchronized via Redis Memory State
            </span>
          </div>
        </div>

        {isWinning ? (
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/60 text-emerald-400 text-xs font-bold tracking-wide shadow-emerald-900 shadow-sm animate-pulse">
            <UserCheck className="w-3.5 h-3.5" />
            <span>YOU ARE WINNING</span>
          </div>
        ) : auction.highestBidderName ? (
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono">
            <span>Leader:</span>
            <span className="text-indigo-400 font-bold">{auction.highestBidderName}</span>
          </div>
        ) : (
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-xs font-mono">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>No Bids Placed Yet</span>
          </div>
        )}
      </div>

      <div className="mt-5 flex items-baseline justify-between">
        <div className="flex items-baseline space-x-2">
          <span className="text-4xl sm:text-5xl lg:text-6xl font-black font-mono tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-cyan-300">
            ${auction.currentHighestBid.toLocaleString()}
          </span>
          <span className="text-sm font-mono text-slate-400 uppercase">USD</span>
        </div>

        <div className="text-right">
          <div className="flex items-center space-x-1 text-emerald-400 text-xs font-mono font-medium justify-end">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+{Math.round(((auction.currentHighestBid - auction.startingPrice) / (auction.startingPrice || 1)) * 100)}%</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">from start price</span>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center text-xs font-mono">
        <div className="p-2 rounded-lg bg-slate-950/50 border border-slate-800/50">
          <span className="text-slate-500 block text-[10px]">RESERVE PRICE</span>
          <span className="text-slate-300 font-bold">${auction.reservePrice.toLocaleString()}</span>
        </div>
        <div className="p-2 rounded-lg bg-slate-950/50 border border-slate-800/50">
          <span className="text-slate-500 block text-[10px]">MIN. NEXT BID</span>
          <span className="text-cyan-400 font-bold">${(auction.currentHighestBid + auction.minIncrement).toLocaleString()}</span>
        </div>
        <div className="p-2 rounded-lg bg-slate-950/50 border border-slate-800/50">
          <span className="text-slate-500 block text-[10px]">TOTAL BIDS</span>
          <span className="text-indigo-400 font-bold">{auction.totalBidsCount}</span>
        </div>
      </div>

    </div>
  );
};
