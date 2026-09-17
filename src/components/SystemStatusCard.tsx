import React from 'react';
import { Cpu, Gauge, Zap, Network, Server } from 'lucide-react';
import type { SystemTelemetry } from '../types/auction';

interface SystemStatusCardProps {
  telemetry: SystemTelemetry;
}

export const SystemStatusCard: React.FC<SystemStatusCardProps> = ({ telemetry }) => {
  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-xl">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Cpu className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Engine Concurrency & Telemetry
          </h2>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-800/60">
          Redis Lua Lock
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center space-x-1.5 text-slate-400 text-xs font-mono">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Throughput</span>
          </div>
          <div className="mt-2 flex items-baseline space-x-1">
            <span className="text-xl font-bold font-mono text-white">{telemetry.bidsPerSecond}</span>
            <span className="text-[10px] text-slate-500 font-mono">ops/sec</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center space-x-1.5 text-slate-400 text-xs font-mono">
            <Gauge className="w-3.5 h-3.5 text-emerald-400" />
            <span>Avg Latency</span>
          </div>
          <div className="mt-2 flex items-baseline space-x-1">
            <span className="text-xl font-bold font-mono text-emerald-400">{telemetry.averageLatencyMs}</span>
            <span className="text-[10px] text-slate-500 font-mono">ms</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center space-x-1.5 text-slate-400 text-xs font-mono">
            <Network className="w-3.5 h-3.5 text-cyan-400" />
            <span>Active Sockets</span>
          </div>
          <div className="mt-2 flex items-baseline space-x-1">
            <span className="text-xl font-bold font-mono text-cyan-400">{telemetry.activeSockets}</span>
            <span className="text-[10px] text-slate-500 font-mono">nodes</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center space-x-1.5 text-slate-400 text-xs font-mono">
            <Server className="w-3.5 h-3.5 text-purple-400" />
            <span>Lock Efficiency</span>
          </div>
          <div className="mt-2 flex items-baseline space-x-1">
            <span className="text-xl font-bold font-mono text-purple-400">{telemetry.redisThroughput}%</span>
            <span className="text-[10px] text-slate-500 font-mono">atomic</span>
          </div>
        </div>

      </div>
    </div>
  );
};
