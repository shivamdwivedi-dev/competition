import React from 'react';
import { Cpu, Gauge, Zap, Network, Server } from 'lucide-react';
import type { SystemTelemetry } from '../types/auction';

interface SystemStatusCardProps {
  telemetry: SystemTelemetry;
}

export const SystemStatusCard: React.FC<SystemStatusCardProps> = ({ telemetry }) => {
  const stats = [
    { icon: Zap, iconColor: 'text-amber-400', label: 'Throughput', value: telemetry.bidsPerSecond, unit: 'ops/sec', valueColor: 'text-white' },
    { icon: Gauge, iconColor: 'text-emerald-400', label: 'Avg Latency', value: telemetry.averageLatencyMs, unit: 'ms', valueColor: 'text-emerald-300' },
    { icon: Network, iconColor: 'text-cyan-400', label: 'Active Sockets', value: telemetry.activeSockets, unit: 'nodes', valueColor: 'text-cyan-300' },
    { icon: Server, iconColor: 'text-purple-400', label: 'Lock Efficiency', value: `${telemetry.redisThroughput}%`, unit: 'atomic', valueColor: 'text-purple-300' },
  ];

  return (
    <div className="relative overflow-hidden rounded-3xl glass-strong p-5 sm:p-6 shadow-2xl shadow-black/30">
      <div className="absolute -top-8 -right-8 w-32 h-32 bg-indigo-500/8 rounded-full blur-2xl pointer-events-none" />

      <div className="relative flex items-center justify-between pb-4 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-400/20 to-purple-600/20 border border-indigo-400/15">
            <Cpu className="w-4 h-4 text-indigo-300" />
          </div>
          <h2 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
            System Telemetry
          </h2>
        </div>
        <span className="text-[10px] font-mono px-2.5 py-1 rounded-full glass border border-indigo-400/20 text-indigo-300">
          Redis Lua Engine
        </span>
      </div>

      <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        {stats.map(({ icon: Icon, iconColor, label, value, unit, valueColor }) => (
          <div key={label} className="p-3.5 rounded-2xl glass border border-white/5 hover:border-white/10 transition-all group">
            <div className="flex items-center gap-1.5 text-slate-500 text-xs font-mono">
              <Icon className={`w-3.5 h-3.5 ${iconColor} group-hover:scale-110 transition-transform`} />
              <span>{label}</span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className={`text-xl sm:text-2xl font-black font-mono ${valueColor}`}>{value}</span>
              <span className="text-[10px] text-slate-600 font-mono">{unit}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
