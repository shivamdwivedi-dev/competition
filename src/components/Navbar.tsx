import React from 'react';
import { Activity, Plus, Radio, User, RefreshCw, Layers } from 'lucide-react';
import type { UserProfile, BackendAuctionSummary } from '../types/auction';

interface NavbarProps {
  isConnected: boolean;
  user: UserProfile;
  availableAuctions: BackendAuctionSummary[];
  currentAuctionId: string;
  onSwitchAuction: (id: string) => void;
  onSwitchUser: (name: string) => void;
  onRefresh: () => void;
  onOpenHostModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  isConnected,
  user,
  availableAuctions,
  currentAuctionId,
  onSwitchAuction,
  onSwitchUser,
  onRefresh,
  onOpenHostModal,
}) => {
  return (
    <header className="sticky top-0 z-40 glass-strong shadow-2xl shadow-black/30 border-b border-white/8">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2.5">

        {/* Brand */}
        <div className="flex items-center space-x-2.5 min-w-0 flex-shrink-0">
          <div className="relative w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-cyan-400 via-indigo-500 to-purple-600 opacity-80 blur-sm" />
            <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-cyan-400 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Activity className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-sm sm:text-base tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-300 to-indigo-300 uppercase">
                SYNORA
              </span>
              <span className="hidden xs:inline px-1.5 py-0.5 text-[9px] font-bold rounded-full glass text-cyan-300 border border-cyan-500/30 uppercase tracking-wider">
                4-Warriors
              </span>
            </div>
            <p className="hidden md:block text-[10px] text-slate-400 font-mono tracking-wider">
              Real-Time Auction · Redis Lua Engine
            </p>
          </div>
        </div>

        {/* Center: Auction Selector (if multiple active) */}
        {availableAuctions.length > 0 && (
          <div className="flex items-center space-x-1.5 glass rounded-xl px-2.5 py-1.5 text-xs max-w-[170px] sm:max-w-[260px] truncate">
            <Layers className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 hidden sm:inline" />
            <span className="text-slate-500 font-mono text-[10px] uppercase hidden sm:inline">Room:</span>
            <select
              value={currentAuctionId}
              onChange={(e) => onSwitchAuction(e.target.value)}
              className="bg-transparent text-slate-200 font-mono text-xs font-semibold outline-none cursor-pointer w-full truncate"
              title="Select Active Auction"
            >
              {availableAuctions.map((a) => (
                <option key={a.id} value={a.id} className="bg-slate-950 text-white">
                  {a.title} ({a.isEnded ? 'Concluded' : `₹${a.highestBid || a.startingPrice}`})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">

          {/* + Host Auction Button */}
          {onOpenHostModal && (
            <button
              onClick={onOpenHostModal}
              title="Host / Create a New Auction"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/20 via-indigo-500/20 to-purple-500/20 hover:from-cyan-500/30 hover:via-indigo-500/30 hover:to-purple-500/30 border border-cyan-400/40 text-cyan-200 hover:text-white font-mono text-xs font-bold transition-all shadow-md shadow-cyan-500/10 hover:shadow-cyan-500/25 active:scale-95 cursor-pointer min-h-[36px]"
            >
              <Plus className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden xs:inline">Host Auction</span>
              <span className="xs:hidden">Host</span>
            </button>
          )}

          {/* Refresh */}
          <button
            onClick={onRefresh}
            title="Refresh from Backend"
            className="p-2 rounded-xl glass hover:bg-white/10 text-slate-400 hover:text-white transition-all duration-200 cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Socket Status */}
          <div className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-semibold border transition-all duration-300 min-h-[36px] ${
            isConnected
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-sm shadow-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
              isConnected ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-amber-400'
            }`} />
            <span className="font-mono hidden sm:inline">{isConnected ? 'LIVE (5001)' : 'RECONNECTING'}</span>
            <span className="font-mono sm:hidden">{isConnected ? 'LIVE' : 'WAIT'}</span>
          </div>

          {/* User Selector */}
          <div className="flex items-center gap-1.5 glass rounded-xl px-2.5 py-1.5 text-xs min-h-[36px]">
            <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <select
              value={user.name}
              onChange={(e) => onSwitchUser(e.target.value)}
              className="bg-transparent text-slate-200 font-medium outline-none cursor-pointer text-xs max-w-[85px] sm:max-w-[110px] truncate"
            >
              <option value="user_piyush" className="bg-slate-900 text-white">user_piyush</option>
              <option value="user_shivam" className="bg-slate-900 text-white">user_shivam</option>
              <option value="user_arya" className="bg-slate-900 text-white">user_arya</option>
              <option value="user_prince" className="bg-slate-900 text-white">user_prince</option>
            </select>
          </div>

        </div>
      </div>
    </header>
  );
};
