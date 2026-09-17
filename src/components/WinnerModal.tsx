import React from 'react';
import { Award, CheckCircle2, RefreshCw } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-md rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-5 sm:p-6 shadow-2xl text-center space-y-4 sm:space-y-5">
        
        <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-600 p-0.5 flex items-center justify-center shadow-lg shadow-amber-500/20">
          <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
            <Award className="w-7 h-7 sm:w-8 sm:h-8 text-amber-400 animate-bounce" />
          </div>
        </div>

        <div className="space-y-1">
          <h2 className="text-lg sm:text-xl font-extrabold text-white">
            {isUserWinner ? '🎉 VICTORY! YOU WON THE AUCTION!' : 'AUCTION CONCLUDED'}
          </h2>
          <p className="text-xs text-slate-400 font-mono break-words">
            {auction.title}
          </p>
        </div>

        <div className="p-3.5 sm:p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-left text-xs font-mono">
          <div className="flex justify-between">
            <span className="text-slate-500">Winning Bidder:</span>
            <span className="text-cyan-400 font-bold truncate max-w-[180px]">{auction.highestBidderName || 'None'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Final Price:</span>
            <span className="text-emerald-400 font-bold">₹{auction.currentHighestBid.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Total Bids Processed:</span>
            <span className="text-indigo-400 font-bold">{auction.totalBidsCount}</span>
          </div>
        </div>

        <div className="flex items-center justify-center space-x-2 text-[11px] text-slate-400">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>Settlement committed via Redis Lua Script</span>
        </div>

        <button
          onClick={onReset}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-mono font-bold text-xs flex items-center justify-center space-x-2 hover:opacity-90 shadow-lg cursor-pointer min-h-[44px]"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh Auction State</span>
        </button>

      </div>
    </div>
  );
};
