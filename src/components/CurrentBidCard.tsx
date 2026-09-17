import React from 'react';
import { Trophy, TrendingUp, AlertTriangle, UserCheck, ShieldAlert } from 'lucide-react';
import type { AuctionItem, UserProfile } from '../types/auction';

interface CurrentBidCardProps {
  auction: AuctionItem;
  user: UserProfile;
  highBidFlash: boolean;
  outbidAlert: boolean;
  onDismissAlert: () => void;
  onOpenWinnerModal?: () => void;
}

export const CurrentBidCard: React.FC<CurrentBidCardProps> = ({
  auction,
  user,
  highBidFlash,
  outbidAlert,
  onDismissAlert,
  onOpenWinnerModal,
}) => {
  const isWinning = auction.highestBidderId === user.id;

  return (
    <div className={`relative overflow-hidden rounded-3xl p-5 sm:p-6 transition-all duration-500 ${
      highBidFlash
        ? 'glass-strong glow-cyan scale-[1.01]'
        : isWinning
        ? 'glass-strong glow-emerald'
        : 'glass-strong'
    }`}>
      {/* Background gradient accent */}
      <div className={`absolute inset-0 rounded-3xl pointer-events-none transition-opacity duration-500 ${
        isWinning
          ? 'bg-gradient-to-br from-emerald-500/8 via-transparent to-cyan-500/8'
          : highBidFlash
          ? 'bg-gradient-to-br from-cyan-500/12 via-transparent to-indigo-500/8'
          : 'bg-gradient-to-br from-white/2 to-transparent'
      }`} />

      {/* Outbid Alert */}
      {outbidAlert && !isWinning && (
        <div className="relative mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between backdrop-blur-sm shadow-lg shadow-rose-500/10">
          <div className="flex items-center gap-2.5 text-rose-300 text-xs font-medium min-w-0">
            <div className="p-1.5 rounded-xl bg-rose-500/20 flex-shrink-0">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <span className="truncate">You've been outbid! Strike back now.</span>
          </div>
          <button
            onClick={onDismissAlert}
            className="text-rose-400 hover:text-rose-200 text-xs font-bold px-2.5 py-1 ml-3 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/20 transition-all cursor-pointer flex-shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-cyan-400/20 to-indigo-600/20 border border-cyan-400/20">
            <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-300" />
          </div>
          <div>
            <span className="text-[11px] sm:text-xs font-mono text-slate-400 uppercase tracking-wider block">
              Highest Bid
            </span>
            <span className="text-[10px] text-slate-600 font-mono hidden sm:block">
              Lua-protected atomic state
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {auction.status === 'ENDED' ? (
            isWinning ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] sm:text-xs font-bold tracking-wide shadow-sm shadow-emerald-500/20">
                <Trophy className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-yellow-300" />
                <span>YOU WON!</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass border border-white/10 text-slate-300 text-[11px] sm:text-xs font-mono max-w-[180px]">
                <span className="text-slate-500">Winner:</span>
                <span className="text-cyan-300 font-bold truncate">{auction.highestBidderName || 'None'}</span>
              </div>
            )
          ) : isWinning ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[11px] sm:text-xs font-bold tracking-wide shadow-sm shadow-emerald-500/20">
              <UserCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>YOU'RE WINNING</span>
            </div>
          ) : auction.highestBidderName && auction.highestBidderName !== 'No bids yet' ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass border border-white/8 text-slate-300 text-[11px] sm:text-xs font-mono max-w-[180px]">
              <span className="text-slate-500">Leader:</span>
              <span className="text-indigo-300 font-bold truncate">{auction.highestBidderName}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass border border-white/8 text-slate-400 text-[11px] sm:text-xs font-mono">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>No Bids Yet</span>
            </div>
          )}

          {auction.status === 'ENDED' && onOpenWinnerModal && (
            <button
              type="button"
              onClick={onOpenWinnerModal}
              className="text-[10px] font-mono text-cyan-300 hover:text-white glass px-2.5 py-1 rounded-lg border border-cyan-500/20 hover:border-cyan-400/40 transition-all cursor-pointer"
            >
              Show Winner Popup
            </button>
          )}
        </div>
      </div>

      {/* Big Price */}
      <div className="relative mt-5 sm:mt-6 flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-4xl sm:text-6xl lg:text-7xl font-black font-mono tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-cyan-300 leading-none">
            ₹{auction.currentHighestBid.toLocaleString()}
          </span>
          <span className="text-xs sm:text-sm font-mono text-slate-500 uppercase pb-1">INR</span>
        </div>

        <div className="text-right">
          <div className="flex items-center gap-1 text-emerald-400 text-xs font-mono font-semibold justify-end">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+{Math.round(((auction.currentHighestBid - auction.startingPrice) / (auction.startingPrice || 1)) * 100)}%</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">vs starting price</span>
        </div>
      </div>

      {/* Stats Row */}
      <div className="relative mt-5 pt-4 border-t border-white/5 grid grid-cols-3 gap-2 sm:gap-3 text-center text-xs font-mono">
        {[
          { label: 'Start Price', value: `₹${auction.startingPrice.toLocaleString()}`, color: 'text-slate-300' },
          { label: 'Min Next Bid', value: `₹${(auction.currentHighestBid + auction.minIncrement).toLocaleString()}`, color: 'text-cyan-300' },
          { label: 'Total Bids', value: String(auction.totalBidsCount), color: 'text-indigo-300' },
        ].map(({ label, value, color }) => (
          <div key={label} className="p-2.5 sm:p-3 rounded-2xl glass border border-white/5">
            <span className="text-slate-500 block text-[9px] sm:text-[10px] uppercase tracking-wide">{label}</span>
            <span className={`${color} font-bold text-[11px] sm:text-sm mt-0.5 block`}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
