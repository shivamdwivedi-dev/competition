import React from 'react';
import { Award, CheckCircle2, RefreshCw, Trophy } from 'lucide-react';
import type { AuctionItem, UserProfile } from '../types/auction';

interface WinnerModalProps {
  auction: AuctionItem;
  user: UserProfile;
  onReset: () => void;
}

export const WinnerModal: React.FC<WinnerModalProps> = ({ auction, user, onReset }) => {
  if (auction.status !== 'ENDED') return null;
  const isUserWinner = auction.highestBidderId === user.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-3xl glass-strong p-6 sm:p-8 shadow-2xl shadow-black/60 text-center space-y-5 border border-white/10">
        {/* Decorative top glow */}
        {isUserWinner && (
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />
        )}

        {/* Icon */}
        <div className="relative mx-auto">
          <div className={`w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-3xl flex items-center justify-center shadow-2xl ${
            isUserWinner
              ? 'bg-gradient-to-br from-amber-400 to-yellow-500 shadow-amber-500/40'
              : 'bg-gradient-to-br from-slate-600 to-slate-700 shadow-slate-700/40'
          }`}>
            {isUserWinner
              ? <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-white animate-bounce" />
              : <Award className="w-8 h-8 sm:w-10 sm:h-10 text-slate-300" />
            }
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
            {isUserWinner ? '🏆 You Won!' : 'Auction Closed'}
          </h2>
          <p className="text-sm text-slate-400 font-medium break-words">
            {auction.title}
          </p>
        </div>

        {/* Result Card */}
        <div className="p-4 sm:p-5 rounded-2xl glass border border-white/8 space-y-3 text-left text-xs font-mono">
          {[
            { label: 'Winner', value: auction.highestBidderName || 'None', valueClass: 'text-cyan-300' },
            { label: 'Final Price', value: `₹${auction.currentHighestBid.toLocaleString()}`, valueClass: 'text-emerald-300 font-black' },
            { label: 'Total Bids', value: String(auction.totalBidsCount), valueClass: 'text-indigo-300' },
          ].map(({ label, value, valueClass }) => (
            <div key={label} className="flex justify-between items-center">
              <span className="text-slate-500">{label}</span>
              <span className={`${valueClass} font-bold truncate max-w-[180px] text-right`}>{value}</span>
            </div>
          ))}
        </div>

        {/* Settlement badge */}
        <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 font-mono">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
          <span>Settled via Redis Atomic Lua Script</span>
        </div>

        {/* CTA */}
        <button
          onClick={onReset}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2.5 transition-all hover:shadow-lg hover:shadow-indigo-500/30 active:scale-95 cursor-pointer min-h-[48px]"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh Auction State</span>
        </button>
      </div>
    </div>
  );
};
