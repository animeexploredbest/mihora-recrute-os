import React, { useState, useEffect } from 'react';
import { Clock, Globe, Sun, Moon } from 'lucide-react';
import { useTheme } from '../lib/theme';

interface TimezoneConfig {
  flag: string;
  code: string;
  name: string;
  tz: string;
  isPrimary?: boolean;
}

const MAJOR_TIMEZONES: TimezoneConfig[] = [
  { flag: '🇵🇰', code: 'PKT', name: 'Pakistan (Karachi/Islamabad)', tz: 'Asia/Karachi', isPrimary: true },
  { flag: '🇦🇪', code: 'GST', name: 'UAE (Dubai)', tz: 'Asia/Dubai' },
  { flag: '🇬🇧', code: 'GMT/BST', name: 'UK (London)', tz: 'Europe/London' },
  { flag: '🇺🇸', code: 'EST', name: 'US East (New York)', tz: 'America/New_York' },
  { flag: '🇺🇸', code: 'PST', name: 'US West (California)', tz: 'America/Los_Angeles' },
  { flag: '🇸🇬', code: 'SGT', name: 'Singapore / Asia', tz: 'Asia/Singapore' },
];

export const WorldClockBar: React.FC = () => {
  const { colors } = useTheme();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTzTime = (tz: string) => {
    try {
      const timeStr = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(now);

      const hour24 = parseInt(
        new Intl.DateTimeFormat('en-US', {
          timeZone: tz,
          hour: 'numeric',
          hour12: false,
        }).format(now),
        10
      );

      const isBusinessHours = hour24 >= 9 && hour24 < 18;
      return { timeStr, isBusinessHours, hour24 };
    } catch {
      return { timeStr: '--:--', isBusinessHours: true, hour24: 12 };
    }
  };

  return (
    <div className={`w-full border-b ${colors.border} bg-amber-500/[0.03] dark:bg-amber-500/[0.02] backdrop-blur-xs py-1.5 px-3 sm:px-6 overflow-x-auto no-scrollbar`}>
      <div className="flex items-center justify-between gap-3 min-w-max text-xs">
        <div className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400 font-medium">
          <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
            Global Clocks
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {MAJOR_TIMEZONES.map((tz) => {
            const { timeStr, isBusinessHours } = formatTzTime(tz.tz);
            return (
              <div
                key={tz.code}
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border transition-all ${
                  tz.isPrimary
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-950 dark:text-amber-200 font-bold shadow-xs'
                    : 'bg-white/60 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700/80 text-stone-700 dark:text-stone-300'
                }`}
                title={`${tz.name} - ${isBusinessHours ? 'Business Hours (9 AM - 6 PM)' : 'Off Hours / Night'}`}
              >
                <span className="text-xs">{tz.flag}</span>
                <span className="text-[10px] font-mono font-semibold opacity-75">{tz.code}</span>
                <span className="text-xs font-mono font-bold tracking-tight">{timeStr}</span>
                {isBusinessHours ? (
                  <Sun className="w-3 h-3 text-amber-500 animate-pulse shrink-0" />
                ) : (
                  <Moon className="w-3 h-3 text-indigo-400 opacity-60 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
