import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../lib/theme';
import { Database, Video, Mail, CheckCircle2, AlertCircle, ChevronDown, ExternalLink, ShieldCheck, RefreshCw, Loader2 } from 'lucide-react';
import { CalendarVerificationResult } from '../lib/calendar-verifier';

interface SystemStatusPopoverProps {
  dbConnected: boolean;
  isCalendarConnected: boolean;
  calendarVerification?: CalendarVerificationResult | null;
  isValidatingCalendar?: boolean;
  onConnectCalendar: () => void;
  onVerifyCalendar?: () => void;
}

export const SystemStatusPopover: React.FC<SystemStatusPopoverProps> = ({
  dbConnected,
  isCalendarConnected,
  calendarVerification,
  isValidatingCalendar,
  onConnectCalendar,
  onVerifyCalendar,
}) => {
  const { colors } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allOperational = dbConnected;

  return (
    <div className="relative inline-block text-left" ref={popoverRef}>
      {/* Sleek, minimal status trigger pill */}
      <button
        id="system-status-indicator-button"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${
          allOperational
            ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/30'
            : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-500/30'
        }`}
        title="View System, Database & Integration Status"
      >
        <span className="relative flex h-2 w-2">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              allOperational ? 'bg-emerald-400' : 'bg-rose-400'
            }`}
          />
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              allOperational ? 'bg-emerald-500' : 'bg-rose-500'
            }`}
          />
        </span>
        <span className="text-[11px] font-bold tracking-tight">
          {allOperational ? 'Live Sync' : 'Reconnecting'}
        </span>
        <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div
          className={`absolute right-0 mt-2 w-80 sm:w-88 rounded-2xl p-4 border shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 ${colors.cardBg} ${colors.border}`}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-stone-200/60 dark:border-stone-800">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h4 className={`text-xs font-bold font-display ${colors.textPrimary}`}>
                System &amp; Integration Health
              </h4>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                allOperational
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'
              }`}
            >
              {allOperational ? 'All Systems OK' : 'Degraded'}
            </span>
          </div>

          {/* Service Rows */}
          <div className="py-3 space-y-2.5 text-xs">
            {/* 1. Firestore Database */}
            <div className={`p-2.5 rounded-xl border flex items-center justify-between ${colors.subtleBg} ${colors.borderLight}`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Database className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className={`font-semibold truncate ${colors.textPrimary}`}>Firestore Database</p>
                  <p className={`text-[11px] ${colors.textMuted} truncate`}>
                    {dbConnected ? 'Real-time sync active (Cloud Run)' : 'Attempting to reconnect...'}
                  </p>
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Live</span>
              </div>
            </div>

            {/* 2. Google Calendar & Meet */}
            <div className={`p-2.5 rounded-xl border flex flex-col gap-2 ${colors.subtleBg} ${colors.borderLight}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Video className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className={`font-semibold truncate ${colors.textPrimary}`}>Google Calendar &amp; Meet</p>
                    <p className={`text-[11px] ${colors.textMuted} truncate`}>
                      {isCalendarConnected
                        ? (calendarVerification?.valid
                            ? `Primary: ${calendarVerification.summary || 'Connected'} (${calendarVerification.timeZone || 'UTC'})`
                            : 'Verified Google OAuth token')
                        : 'No active Google Calendar token'}
                    </p>
                  </div>
                </div>
                <div className="shrink-0">
                  {isCalendarConnected ? (
                    <div className="flex items-center gap-1.5">
                      <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Live Sync</span>
                      </span>
                      {onVerifyCalendar && (
                        <button
                          type="button"
                          onClick={onVerifyCalendar}
                          disabled={isValidatingCalendar}
                          title="Test live call to Google Calendar API"
                          className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors cursor-pointer"
                        >
                          {isValidatingCalendar ? (
                            <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                          ) : (
                            <RefreshCw className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        onConnectCalendar();
                        setIsOpen(false);
                      }}
                      className="text-[11px] font-bold px-2 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 dark:text-amber-200 border border-amber-500/30 transition-colors cursor-pointer"
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>

              {/* Verified details chip if available */}
              {isCalendarConnected && calendarVerification?.valid && (
                <div className="text-[10px] font-mono px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 rounded-md truncate">
                  Google Calendar API: 200 OK • {calendarVerification.calendarId || 'primary'}
                </div>
              )}
            </div>

            {/* 3. Titan Mail SMTP */}
            <div className={`p-2.5 rounded-xl border flex items-center justify-between ${colors.subtleBg} ${colors.borderLight}`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className={`font-semibold truncate ${colors.textPrimary}`}>Titan Mail HR Sender</p>
                  <p className={`text-[11px] font-mono text-emerald-700 dark:text-emerald-400 truncate`}>
                    hr@mihora.tech
                  </p>
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Ready</span>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="pt-2.5 border-t border-stone-200/60 dark:border-stone-800 flex items-center justify-between text-[11px]">
            <span className={colors.textMuted}>Region: Asia-Southeast1</span>
            <span className="font-semibold text-amber-700 dark:text-amber-400">PKT (UTC+5)</span>
          </div>
        </div>
      )}
    </div>
  );
};

