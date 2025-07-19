import React, { useEffect, useState } from 'react';
import { RateLimiter } from '@/services/rateLimiter';

interface Stats {
  tokensUsedLastMinute: number;
  requestsLastMinute: number;
  tokenCapacityPercent: number;
}

/**
 * Polls the global RateLimiter singleton every `intervalMs`
 * and displays current request / token consumption.
 */
export const RateLimitIndicator: React.FC<{ intervalMs?: number }> = ({
  intervalMs = 5000
}) => {
  const [stats, setStats] = useState<Stats>({
    tokensUsedLastMinute: 0,
    requestsLastMinute: 0,
    tokenCapacityPercent: 100
  });

  useEffect(() => {
    const rateLimiter = RateLimiter.getInstance();

    const update = () => {
      try {
        setStats(rateLimiter.getUsageStats());
      } catch {
        /* no-op if rate-limiter unavailable */
      }
    };

    // Initial fetch
    update();
    const id = setInterval(update, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  const barWidth = Math.min(100, Math.max(0, 100 - stats.tokenCapacityPercent));

  return (
    <div className="mt-4 flex flex-col items-center text-sm text-westworld-darkbrown">
      <div className="flex gap-4">
        <span>Req/min: {stats.requestsLastMinute}</span>
        <span>Tokens/min: {stats.tokensUsedLastMinute}</span>
      </div>
      <div className="relative w-64 h-2 bg-gray-200 rounded mt-1">
        <div
          className="absolute inset-0 bg-westworld-rust rounded transition-all"
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  );
};
