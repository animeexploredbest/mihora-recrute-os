import React, { useState } from 'react';
import { UserPresence } from '../types';
import { Users, Radio, Check, Clock, Eye, Sparkles, ChevronDown, Activity } from 'lucide-react';
import { useTheme } from '../lib/theme';

interface LiveTeamPresenceProps {
  presences: UserPresence[];
  currentUserId?: string;
  variant?: 'compact' | 'full';
}

export const LiveTeamPresence: React.FC<LiveTeamPresenceProps> = ({
  presences,
  currentUserId,
  variant = 'compact',
}) => {
  const { colors } = useTheme();
  const [showDropdown, setShowDropdown] = useState(false);

  const getInitials = (name: string, email: string) => {
    if (name && name.trim()) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (email ? email[0] : 'U').toUpperCase();
  };

  const getAvatarGradient = (id: string) => {
    const gradients = [
      'from-emerald-500 to-teal-600 text-white',
      'from-amber-500 to-orange-600 text-white',
      'from-blue-500 to-indigo-600 text-white',
      'from-violet-500 to-purple-600 text-white',
      'from-rose-500 to-pink-600 text-white',
    ];
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash += id.charCodeAt(i);
    return gradients[Math.abs(hash) % gradients.length];
  };

  const formatLastActive = (isoString: string) => {
    try {
      const diffSec = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
      if (diffSec < 15) return 'Just now';
      if (diffSec < 60) return `${diffSec}s ago`;
      const diffMin = Math.floor(diffSec / 60);
      return `${diffMin}m ago`;
    } catch {
      return 'Active';
    }
  };

  const onlineCount = presences.filter((p) => p.status !== 'offline').length;

  if (variant === 'compact') {
    return (
      <div className="relative inline-block">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className={`flex items-center gap-2 px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
            onlineCount > 0
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200 hover:bg-emerald-500/15'
              : `${colors.subtleBg} ${colors.border} ${colors.textSecondary}`
          }`}
          title="Click to view live team members working now"
        >
          {/* Live pulsing radar dot */}
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>

          <span className="text-[11px] font-bold tracking-tight">
            {onlineCount} Live
          </span>

          {/* Overlapping Avatar Stack */}
          <div className="flex -space-x-1.5 overflow-hidden py-0.5">
            {presences.slice(0, 3).map((p) => (
              <div
                key={p.userId}
                className={`inline-block h-5 w-5 rounded-full ring-2 ring-white dark:ring-stone-900 overflow-hidden bg-gradient-to-tr ${getAvatarGradient(
                  p.userId
                )} text-[9px] font-bold flex items-center justify-center shrink-0`}
                title={`${p.displayName || p.email} (${p.status})`}
              >
                {p.photoURL ? (
                  <img
                    src={p.photoURL}
                    alt={p.displayName}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span>{getInitials(p.displayName, p.email)}</span>
                )}
              </div>
            ))}
            {presences.length > 3 && (
              <div className="inline-block h-5 w-5 rounded-full ring-2 ring-white dark:ring-stone-900 bg-stone-700 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                +{presences.length - 3}
              </div>
            )}
          </div>

          <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
        </button>

        {/* Dropdown Panel */}
        {showDropdown && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowDropdown(false)}
            />
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl shadow-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                    Active Team Members ({onlineCount})
                  </h4>
                </div>
                <span className="text-[10px] text-stone-400 font-mono">Live Firestore</span>
              </div>

              <div className="mt-3 space-y-2 max-h-72 overflow-y-auto">
                {presences.length === 0 ? (
                  <p className="text-xs text-stone-500 text-center py-4">
                    No other team members currently active.
                  </p>
                ) : (
                  presences.map((p) => {
                    const isMe = p.userId === currentUserId;
                    return (
                      <div
                        key={p.userId}
                        className={`p-2.5 rounded-xl border flex items-start gap-3 transition-colors ${
                          isMe
                            ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40'
                            : 'bg-stone-50/60 dark:bg-stone-800/40 border-stone-200/80 dark:border-stone-700/60'
                        }`}
                      >
                        <div className="relative shrink-0 mt-0.5">
                          <div
                            className={`w-8 h-8 rounded-full overflow-hidden bg-gradient-to-tr ${getAvatarGradient(
                              p.userId
                            )} flex items-center justify-center text-xs font-bold shadow-xs`}
                          >
                            {p.photoURL ? (
                              <img
                                src={p.photoURL}
                                alt={p.displayName}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <span>{getInitials(p.displayName, p.email)}</span>
                            )}
                          </div>
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-stone-900 ${
                              p.status === 'online' ? 'bg-emerald-500' : 'bg-amber-400'
                            }`}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                              {p.displayName || p.email}
                              {isMe && (
                                <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[9px] font-bold">
                                  YOU
                                </span>
                              )}
                            </p>
                            <span className="text-[10px] text-stone-400 font-mono shrink-0">
                              {formatLastActive(p.lastActiveAt)}
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                            {p.email}
                          </p>
                          <div className="mt-1 flex items-center gap-1.5 text-[10px] text-stone-600 dark:text-stone-300">
                            <Activity className="w-3 h-3 text-indigo-500" />
                            <span className="truncate">
                              {p.currentView || 'Active on Dashboard'}
                              {p.activeCandidateName && ` • Reviewing: ${p.activeCandidateName}`}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // Full ribbon variant
  return (
    <div
      className={`p-3 sm:p-4 rounded-2xl border transition-all ${colors.cardBg} ${colors.border}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100">
                Live Recruiters in Workspace
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {onlineCount} Online
              </span>
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
              Real-time collaboration across Pakistan &amp; global hiring teams
            </p>
          </div>
        </div>

        {/* Avatars and live presence pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {presences.map((p) => {
            const isMe = p.userId === currentUserId;
            return (
              <div
                key={p.userId}
                className={`flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full border text-xs transition-all ${
                  isMe
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-200'
                    : 'bg-white dark:bg-stone-800/80 border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200'
                }`}
                title={`${p.displayName || p.email} (${p.currentView || 'Active'}) - ${formatLastActive(
                  p.lastActiveAt
                )}`}
              >
                <div className="relative">
                  <div
                    className={`w-6 h-6 rounded-full overflow-hidden bg-gradient-to-tr ${getAvatarGradient(
                      p.userId
                    )} flex items-center justify-center text-[10px] font-bold shadow-xs`}
                  >
                    {p.photoURL ? (
                      <img
                        src={p.photoURL}
                        alt={p.displayName}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span>{getInitials(p.displayName, p.email)}</span>
                    )}
                  </div>
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-1 ring-white dark:ring-stone-900 ${
                      p.status === 'online' ? 'bg-emerald-500' : 'bg-amber-400'
                    }`}
                  />
                </div>
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-1">
                    <span className="font-bold truncate max-w-[120px] text-[11px]">
                      {p.displayName || p.email.split('@')[0]}
                    </span>
                    {isMe && (
                      <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 font-mono">
                        (You)
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] text-stone-400 truncate max-w-[120px]">
                    {p.currentView || 'Active'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
