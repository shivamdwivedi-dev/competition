import React from 'react';
import { Play, Square, PlusCircle, RotateCcw, Shield } from 'lucide-react';

interface DemoToolbarProps {
  isSimulatingLoad: boolean;
  onToggleLoadSimulation: () => void;
  onExtendTime: (seconds: number) => void;
  onResetAuction: () => void;
}

export const DemoToolbar: React.FC<DemoToolbarProps> = ({
  isSimulatingLoad,
  onToggleLoadSimulation,
  onExtendTime,
  onResetAuction,
}) => {
  return (
    <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-900/40 p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
      
      <div className="flex items-center space-x-2">
        <div className="p-1.5 rounded-lg bg-indigo-950 border border-indigo-800 text-indigo-400">
          <Shield className="w-4 h-4" />
        </div>
        <div>
          <span className="text-xs font-bold text-white uppercase tracking-wider block">
            Hackathon Evaluator & Demo Controls
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            Simulate Concurrency, Stress Test, Anti-sniping
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={onToggleLoadSimulation}
          className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold flex items-center space-x-2 border transition-all ${
            isSimulatingLoad
              ? 'bg-rose-950 text-rose-300 border-rose-600 shadow-rose-950 shadow-sm animate-pulse'
              : 'bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border-indigo-700'
          }`}
        >
          {isSimulatingLoad ? (
            <>
              <Square className="w-3.5 h-3.5 text-rose-400" />
              <span>STOP LOAD SIMULATOR</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 text-indigo-400" />
              <span>START HIGH LOAD SIMULATOR</span>
            </>
          )}
        </button>

        <button
          onClick={() => onExtendTime(120)}
          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-mono text-xs font-medium flex items-center space-x-1.5 transition-colors"
        >
          <PlusCircle className="w-3.5 h-3.5 text-cyan-400" />
          <span>+2 Min (Anti-Sniping)</span>
        </button>

        <button
          onClick={onResetAuction}
          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-mono text-xs font-medium flex items-center space-x-1.5 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
          <span>Reset Demo</span>
        </button>
      </div>

    </div>
  );
};
