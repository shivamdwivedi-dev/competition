import React from 'react';
import { Activity, Radio, User, RefreshCw } from 'lucide-react';
import type { UserProfile, BackendAuctionSummary } from '../types/auction';

interface NavbarProps {
  isConnected: boolean;
  user: UserProfile;
  availableAuctions: BackendAuctionSummary[];
  currentAuctionId: string;
  onSwitchAuction: (id: string) => void;
  onSwitchUser: (name: string) => void;
  onRefresh: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  isConnected,
  user,
  availableAuctions,
  currentAuctionId,
  onSwitchAuction,
  onSwitchUser,
  onRefresh,
}) => {
  return (
    <header className="sticky top-0 z-50 glass-strong shadow-2xl shadow-black/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">

        {/* Brand */}
        <div className="flex items-center space-x-3 min-w-0 flex-shrink-0">
          <div className="relative w-9 h-9 flex-shrink-0">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-cyan-400 via-indigo-500 to-purple-600 opacity-80 blur-sm" />
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-400 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Activity className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
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

        {/* Center: Auction Switcher */}
        {availableAuctions.length > 1 && (
          <div className="hidden lg:flex items-center space-x-2 glass rounded-xl px-3 py-1.5 text-xs">
            <span className="text-slate-500 font-mono text-[10px] uppercase">Auction:</span>
            <select
              value={currentAuctionId}
              onChange={(e) => onSwitchAuction(e.target.value)}
              className="bg-transparent text-slate-200 font-medium outline-none cursor-pointer text-xs max-w-[180px] truncate"
            >
              {availableAuctions.map((a) => (
                <option key={a.id} value={a.id} className="bg-slate-900 text-white">
                  {a.title} ({a.isEnded ? 'Ended' : `₹${a.highestBid}`})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">

          {/* Refresh */}
          <button
            onClick={onRefresh}
            title="Refresh from Backend"
            className="p-2 rounded-xl glass hover:bg-white/10 text-slate-400 hover:text-white transition-all duration-200 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Socket Status */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-semibold border transition-all duration-300 ${
            isConnected
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-sm shadow-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
              isConnected ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-amber-400'
            }`} />
            <span className="font-mono hidden sm:inline">{isConnected ? 'LIVE' : 'RECONNECTING'}</span>
            <span className="font-mono sm:hidden">{isConnected ? '●' : '○'}</span>
          </div>

          {/* User Selector */}
          <div className="flex items-center gap-1.5 glass rounded-xl px-2.5 py-1.5 text-xs">
            <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <select
              value={user.name}
              onChange={(e) => onSwitchUser(e.target.value)}
              className="bg-transparent text-slate-200 font-medium outline-none cursor-pointer text-xs max-w-[90px] sm:max-w-[120px] truncate"
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
