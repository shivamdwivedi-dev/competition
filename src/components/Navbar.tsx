import React from 'react';
import { Activity, Radio, User, Wallet, RefreshCw } from 'lucide-react';
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
    <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-900/90 border-b border-slate-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        
        {/* Brand */}
        <div className="flex items-center space-x-2.5 min-w-0 flex-shrink-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-fuchsia-500 p-0.5 shadow-cyan-500/20 shadow-lg flex-shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 animate-pulse" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 text-sm sm:text-base tracking-wider truncate">
                SYNORA PULSE
              </span>
              <span className="hidden xs:inline px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/60 uppercase">
                4-Warriors
              </span>
            </div>
            <p className="hidden md:block text-[10px] text-slate-400 font-mono truncate">
              Atomic Redis Lua Engine • Port 5001
            </p>
          </div>
        </div>

        {/* Center: Active Auction Switcher (if backend has multiple auctions) */}
        {availableAuctions.length > 1 && (
          <div className="hidden lg:flex items-center space-x-2 bg-slate-950/80 border border-slate-800 rounded-xl px-2.5 py-1 text-xs">
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

        {/* Right Info Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
          
          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            title="Refresh from Backend"
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Socket Connection Badge */}
          <div className={`flex items-center space-x-1.5 px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-medium border transition-colors ${
            isConnected
              ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60 shadow-emerald-950 shadow-sm'
              : 'bg-amber-950/60 text-amber-400 border-amber-800/60 animate-pulse'
          }`}>
            <Radio className={`w-3 h-3 ${isConnected ? 'text-emerald-400' : 'text-amber-400 animate-spin'}`} />
            <span className="font-mono hidden sm:inline">{isConnected ? 'LIVE WEBSOCKET (5001)' : 'RECONNECTING...'}</span>
            <span className="font-mono sm:hidden">{isConnected ? 'LIVE' : 'OFFLINE'}</span>
          </div>

          {/* User Profile Selector */}
          <div className="flex items-center space-x-1.5 bg-slate-800/80 border border-slate-700/80 rounded-xl px-2 sm:px-3 py-1 text-xs">
            <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <select
              value={user.name}
              onChange={(e) => onSwitchUser(e.target.value)}
              className="bg-transparent text-slate-200 font-medium outline-none cursor-pointer text-xs max-w-[90px] sm:max-w-[130px] truncate"
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
