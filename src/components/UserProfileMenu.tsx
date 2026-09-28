import React, { useState, useRef, useEffect } from 'react';
import { useTheme, THEMES, AppTheme } from '../lib/theme';
import {
  User,
  Settings,
  LogOut,
  Maximize2,
  Minimize2,
  Video,
  Check,
  ChevronDown,
  Monitor,
  Sparkles,
} from 'lucide-react';

interface UserProfileMenuProps {
  user: any;
  isWideLayout: boolean;
  onToggleWideLayout: () => void;
  isNativeFullscreen: boolean;
  onToggleNativeFullscreen: () => void;
  onOpenSettings: () => void;
  onOpenStaffModal?: () => void;
  onLogout: () => void;
  isCalendarConnected: boolean;
  onConnectCalendar: () => void;
}

export const UserProfileMenu: React.FC<UserProfileMenuProps> = ({
  user,
  isWideLayout,
  onToggleWideLayout,
  isNativeFullscreen,
  onToggleNativeFullscreen,
  onOpenSettings,
  onOpenStaffModal,
  onLogout,
  isCalendarConnected,
  onConnectCalendar,
}) => {
  const { theme, setTheme, colors } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const userInitial = user?.displayName
    ? user.displayName[0].toUpperCase()
    : user?.email
    ? user.email[0].toUpperCase()
    : 'R';

  const userDisplayName = user?.displayName || user?.name || user?.email?.split('@')[0] || 'Recruiter';
  const userEmail = user?.email || 'recruiter@mihora.tech';

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      {/* Sleek, minimal avatar button trigger */}
      <button
        id="user-profile-menu-button"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 p-1 sm:px-2 sm:py-1 rounded-full border transition-all cursor-pointer shadow-2xs hover:brightness-95 ${colors.subtleBg} ${colors.border}`}
        title={`Logged in as ${userEmail} • Click for settings & menu`}
      >
        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-600 to-orange-500 text-white flex items-center justify-center font-display font-extrabold text-xs shadow-2xs shrink-0 tracking-wider">
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt={userDisplayName}
              className="w-full h-full rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            userInitial
          )}
        </div>
        <span className={`hidden md:inline font-semibold text-xs max-w-[100px] truncate ${colors.textPrimary}`}>
          {userDisplayName}
        </span>
        <ChevronDown className="w-3.5 h-3.5 opacity-60 text-stone-500" />
      </button>

      {/* Profile & Controls Dropdown */}
      {isOpen && (
        <div
          className={`absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl p-3 border shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 ${colors.cardBg} ${colors.border}`}
        >
          {/* User Account Info */}
          <div className="flex items-center gap-3 p-2 rounded-xl bg-stone-500/5 border border-stone-200/50 dark:border-stone-800">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-500 text-white flex items-center justify-center font-display font-bold text-sm shadow-2xs shrink-0">
              {userInitial}
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-xs font-bold font-display truncate ${colors.textPrimary}`}>
                {userDisplayName}
              </p>
              <p className={`text-[11px] truncate ${colors.textMuted}`}>
                {userEmail}
              </p>
              <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/25">
                {user?.role === 'admin' ? 'Administrator' : user?.role === 'interviewer' ? 'Technical Interviewer' : 'Lead Recruiter'} · PKT
              </span>
            </div>
          </div>

          {/* Theme Selector Segmented Control */}
          <div className="mt-3 px-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block mb-1.5">
              Visual Theme
            </span>
            <div className={`grid grid-cols-3 gap-1 p-1 rounded-xl border ${colors.borderLight} ${colors.subtleBg}`}>
              {(['slate', 'dark', 'corporate'] as AppTheme[]).map((tKey) => {
                const tObj = THEMES[tKey];
                const active = theme === tKey;
                return (
                  <button
                    key={tKey}
                    type="button"
                    onClick={() => setTheme(tKey)}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      active
                        ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                    }`}
                  >
                    <span>{tObj?.icon}</span>
                    <span className="text-[11px]">{tKey === 'slate' ? 'Light' : tKey === 'dark' ? 'Dark' : 'Navy'}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Display & Layout Preferences */}
          <div className="mt-3 px-1 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
              Display &amp; Layout
            </span>

            {/* Width Toggle */}
            <button
              type="button"
              onClick={onToggleWideLayout}
              className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-medium transition-colors cursor-pointer hover:${colors.subtleBg} ${colors.textPrimary}`}
            >
              <div className="flex items-center gap-2">
                <Monitor className="w-3.5 h-3.5 text-stone-400" />
                <span>Screen Layout Width</span>
              </div>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${
                isWideLayout
                  ? 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30'
                  : 'bg-stone-200/60 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-300 dark:border-stone-700'
              }`}>
                {isWideLayout ? '100% Fluid' : 'Compact 1280px'}
              </span>
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={onToggleNativeFullscreen}
              className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-medium transition-colors cursor-pointer hover:${colors.subtleBg} ${colors.textPrimary}`}
            >
              <div className="flex items-center gap-2">
                {isNativeFullscreen ? (
                  <Minimize2 className="w-3.5 h-3.5 text-amber-500" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5 text-stone-400" />
                )}
                <span>Full Screen Mode</span>
              </div>
              <span className="text-[11px] text-stone-400">
                {isNativeFullscreen ? 'Exit' : 'Enter'}
              </span>
            </button>
          </div>

          {/* Tools & Settings */}
          <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-zinc-800 px-1 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block mb-1">
              Preferences &amp; Team
            </span>

            {onOpenStaffModal && (
              <button
                type="button"
                onClick={() => {
                  onOpenStaffModal();
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer hover:${colors.subtleBg} ${colors.textPrimary}`}
              >
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-blue-500" />
                  <span>Team &amp; Staff Accounts</span>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  Register
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onOpenSettings();
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-2 p-2 rounded-xl text-xs font-medium transition-colors cursor-pointer hover:${colors.subtleBg} ${colors.textPrimary}`}
            >
              <Settings className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
              <span>Email Templates &amp; SMTP Settings</span>
            </button>

            {!isCalendarConnected && (
              <button
                type="button"
                onClick={() => {
                  onConnectCalendar();
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-medium transition-colors cursor-pointer hover:${colors.subtleBg} text-amber-700 dark:text-amber-300`}
              >
                <div className="flex items-center gap-2">
                  <Video className="w-3.5 h-3.5 text-amber-600" />
                  <span>Connect Google Calendar</span>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30">
                  Auth
                </span>
              </button>
            )}
          </div>

          {/* Sign Out */}
          <div className="mt-2 pt-2 border-t border-stone-200/60 dark:border-stone-800 px-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onLogout();
              }}
              className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-500/10 dark:hover:bg-rose-500/20 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
