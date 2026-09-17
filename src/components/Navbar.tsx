import React from 'react';
import { Activity, Radio, ShieldCheck, User, Wallet } from 'lucide-react';
import type { UserProfile } from '../types/auction';

interface NavbarProps {
  isConnected: boolean;
  user: UserProfile;
  onSwitchUser: (name: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ isConnected, user, onSwitchUser }) => {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-900/80 border-b border-slate-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-fuchsia-500 p-0.5 shadow-cyan-500/20 shadow-lg">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Activity className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 text-lg tracking-wider">
                SYNORA PULSE
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800/50 uppercase tracking-widest">
                Team 4-Warriors
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
              <span>Real-Time Concurrency Engine</span>
              <span className="text-slate-600">•</span>
              <span className="text-indigo-400 font-medium">Sub-ms Redis Lua Sync</span>
            </p>
          </div>
        </div>

        {/* Right Info Controls */}
        <div className="flex items-center space-x-4">
          {/* Socket Connection Badge */}
          <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            isConnected
              ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60 shadow-emerald-950 shadow-sm'
              : 'bg-amber-950/60 text-amber-400 border-amber-800/60 animate-pulse'
          }`}>
            <Radio className={`w-3.5 h-3.5 ${isConnected ? 'text-emerald-400' : 'text-amber-400 animate-spin'}`} />
            <span className="font-mono">{isConnected ? 'LIVE WEBSOCKET' : 'FALLBACK SYNC'}</span>
          </div>

          {/* User Profile / Balance */}
          <div className="hidden sm:flex items-center space-x-3 bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-1.5 shadow-inner">
            <div className="flex items-center space-x-1.5 text-slate-300 text-xs">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={user.name}
                onChange={(e) => onSwitchUser(e.target.value)}
                className="bg-transparent text-slate-200 font-medium outline-none cursor-pointer text-xs"
              >
                <option value="WarriorPiyush" className="bg-slate-900 text-white">WarriorPiyush (You)</option>
                <option value="Shivam_Lead" className="bg-slate-900 text-white">Shivam_Lead</option>
                <option value="Arya_Backend" className="bg-slate-900 text-white">Arya_Backend</option>
                <option value="ArbitrageWhale" className="bg-slate-900 text-white">ArbitrageWhale</option>
              </select>
            </div>
            <div className="h-4 w-px bg-slate-700" />
            <div className="flex items-center space-x-1 text-emerald-400 font-mono text-xs font-semibold">
              <Wallet className="w-3.5 h-3.5" />
              <span>${user.walletBalance.toLocaleString()}</span>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-indigo-950/40 border border-indigo-800/40 text-indigo-300 text-xs font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Anti-Sniping Enabled</span>
          </div>
        </div>

      </div>
    </header>
  );
};
