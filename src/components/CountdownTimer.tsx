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
      const now = Date.now();
      const diff = Math.max(0, endTime - now);
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

  const isUrgent = status === 'LIVE' && timeLeft.totalMs > 0 && timeLeft.totalMs < 1000 * 60 * 2;
  const isEnded = status === 'ENDED' || timeLeft.totalMs <= 0;

  if (isEnded) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass border border-rose-500/25 text-rose-300 font-mono text-xs font-bold tracking-wider">
        <Clock className="w-3.5 h-3.5 text-rose-400" />
        <span>Auction Closed</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 sm:gap-3 px-3 py-2 rounded-xl border font-mono font-bold transition-all duration-300 ${
      isUrgent
        ? 'glass border-rose-500/40 text-rose-300 ring-1 ring-rose-500/25 shadow-lg shadow-rose-500/15'
        : 'glass border-white/10 text-cyan-200'
    }`}>
      {isUrgent ? (
        <Flame className="w-4 h-4 text-rose-400 animate-bounce flex-shrink-0" />
      ) : (
        <Clock className="w-4 h-4 text-cyan-400 flex-shrink-0" />
      )}

      <div className="flex items-center tracking-tight space-x-0.5 sm:space-x-1 text-xs sm:text-sm">
        {timeLeft.hours > 0 && (
          <>
            <span className="glass border border-white/10 px-1.5 py-0.5 rounded-lg text-white">{String(timeLeft.hours).padStart(2, '0')}</span>
            <span className="text-slate-500 text-sm">:</span>
          </>
        )}
        <span className="glass border border-white/10 px-1.5 py-0.5 rounded-lg text-white">{String(timeLeft.minutes).padStart(2, '0')}</span>
        <span className="text-slate-500 text-sm">:</span>
        <span className="glass border border-white/10 px-1.5 py-0.5 rounded-lg text-white">{String(timeLeft.seconds).padStart(2, '0')}</span>
        <span className="text-slate-600 text-sm">.</span>
        <span className="text-xs text-cyan-400 w-3">{timeLeft.milliseconds}</span>
      </div>

      {isUrgent && (
        <span className="text-[9px] font-bold text-rose-400 uppercase tracking-widest hidden xs:inline">
          FINAL
        </span>
      )}
    </div>
  );
};
