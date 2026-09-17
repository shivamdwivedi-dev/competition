import React, { useState, useEffect } from 'react';
import { Clock, Flame } from 'lucide-react';

interface CountdownTimerProps {
  endTime: number;
  status: 'UPCOMING' | 'LIVE' | 'ENDED' | 'PAUSED';
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({ endTime, status }) => {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    milliseconds: number;
    totalMs: number;
  }>({ hours: 0, minutes: 0, seconds: 0, milliseconds: 0, totalMs: 0 });

  useEffect(() => {
    const calculateTime = () => {
      const diff = Math.max(0, endTime - Date.now());
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      const milliseconds = Math.floor((diff % 1000) / 100);

      setTimeLeft({ hours, minutes, seconds, milliseconds, totalMs: diff });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 100);
    return () => clearInterval(interval);
  }, [endTime]);

  const isUrgent = timeLeft.totalMs > 0 && timeLeft.totalMs < 1000 * 60 * 2;
  const isEnded = status === 'ENDED' || timeLeft.totalMs <= 0;

  if (isEnded) {
    return (
      <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 font-mono text-xs uppercase font-bold tracking-wider shadow-rose-950 shadow-sm">
        <Clock className="w-3.5 h-3.5 text-rose-400" />
        <span>Auction Closed</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-3 px-3.5 py-1.5 rounded-xl border transition-all ${
      isUrgent
        ? 'bg-rose-950/70 border-rose-600/80 text-rose-300 animate-pulse shadow-lg shadow-rose-900/30 ring-1 ring-rose-500/50'
        : 'bg-slate-900/90 border-slate-700/80 text-cyan-300'
    }`}>
      {isUrgent ? (
        <Flame className="w-4 h-4 text-rose-400 animate-bounce" />
      ) : (
        <Clock className="w-4 h-4 text-cyan-400" />
      )}

      <div className="flex items-center font-mono font-bold tracking-tight space-x-1 text-sm sm:text-base">
        {timeLeft.hours > 0 && (
          <>
            <span className="bg-slate-800/90 px-1.5 py-0.5 rounded text-white">{String(timeLeft.hours).padStart(2, '0')}</span>
            <span className="text-slate-500">:</span>
          </>
        )}
        <span className="bg-slate-800/90 px-1.5 py-0.5 rounded text-white">{String(timeLeft.minutes).padStart(2, '0')}</span>
        <span className="text-slate-500">:</span>
        <span className="bg-slate-800/90 px-1.5 py-0.5 rounded text-white">{String(timeLeft.seconds).padStart(2, '0')}</span>
        <span className="text-slate-500">.</span>
        <span className="text-xs text-cyan-400 w-3">{timeLeft.milliseconds}</span>
      </div>

      {isUrgent && (
        <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest hidden sm:inline">
          FINAL CALL
        </span>
      )}
    </div>
  );
};
