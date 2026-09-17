import React, { useState } from 'react';
import { Award, CheckCircle2, RefreshCw, Trophy, X, Eye } from 'lucide-react';
import type { AuctionItem, UserProfile } from '../types/auction';
import { formatCurrency, formatCurrencyFull } from '../utils/format';

interface WinnerModalProps {
  auction: AuctionItem;
  user: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onReset: () => void | Promise<any>;
}

export const WinnerModal: React.FC<WinnerModalProps> = ({
  auction,
  user,
  isOpen,
  onClose,
  onReset,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!isOpen || auction.status !== 'ENDED') return null;
  const isUserWinner = auction.highestBidderId === user.id;

  const handleRefreshClick = async () => {
    setIsRefreshing(true);
    try {
      await onReset();
    } finally {
      setIsRefreshing(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md transition-opacity cursor-pointer"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md rounded-3xl glass-strong p-6 sm:p-8 shadow-2xl shadow-black/80 text-center space-y-5 border border-white/10 z-10">
        
        {/* Close button */}
        <button
          onClick={onClose}
          title="Close and return to auction page"
          className="absolute top-5 right-5 p-2 rounded-xl glass hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

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
            { label: 'Winner', value: auction.highestBidderName || 'None', valueClass: 'text-cyan-300 font-bold' },
            { label: 'Final Price', value: formatCurrency(auction.currentHighestBid), valueClass: 'text-emerald-300 font-black text-sm' },
            { label: 'Total Bids', value: String(auction.totalBidsCount), valueClass: 'text-indigo-300 font-bold' },
          ].map(({ label, value, valueClass }) => (
            <div key={label} className="flex justify-between items-center">
              <span className="text-slate-500">{label}</span>
              <span className={`${valueClass} truncate max-w-[180px] text-right`}>{value}</span>
            </div>
          ))}
        </div>

        {/* Settlement badge */}
        <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 font-mono">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
          <span>Settled via Redis Atomic Lua Script</span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3.5 rounded-2xl glass hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-mono text-xs font-bold transition-all cursor-pointer min-h-[48px] flex items-center justify-center gap-2"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View Auction UI</span>
          </button>

          <button
            type="button"
            disabled={isRefreshing}
            onClick={handleRefreshClick}
            className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-indigo-500/30 active:scale-95 cursor-pointer min-h-[48px] disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Auction State'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
