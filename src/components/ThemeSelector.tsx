import React, { useState, useRef, useEffect } from 'react';
import { useTheme, THEMES, AppTheme } from '../lib/theme';
import { Palette, ChevronDown, Check } from 'lucide-react';

export function ThemeSelector() {
  const { theme, setTheme, colors } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentThemeObj = THEMES[theme] || THEMES.slate;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        id="theme-selector-button"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-xs bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-100 border-slate-300 dark:border-zinc-700"
        title="Change App Theme (Studio Light, Obsidian Dark, Executive Navy)"
      >
        <span className="text-sm leading-none">{currentThemeObj.icon}</span>
        <span className="hidden sm:inline font-medium">{currentThemeObj.name}</span>
        <ChevronDown className="w-3.5 h-3.5 opacity-70" />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-56 rounded-2xl p-1.5 border shadow-xl z-50 transition-all bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white"
        >
          <div className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
            Select Visual Theme
          </div>

          {(Object.keys(THEMES) as AppTheme[]).map((tKey) => {
            const t = THEMES[tKey];
            const isSelected = theme === tKey;
            return (
              <button
                key={tKey}
                onClick={() => {
                  setTheme(tKey);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50 text-blue-700 dark:bg-zinc-800 dark:text-blue-400 font-bold'
                    : 'hover:bg-slate-100 dark:hover:bg-zinc-800/60 text-slate-700 dark:text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{t.icon}</span>
                  <div className="text-left">
                    <div>{t.name}</div>
                    <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-normal">
                      {tKey === 'slate'
                        ? 'Clean High-Contrast Light'
                        : tKey === 'dark'
                        ? 'Deep Obsidian Dark'
                        : 'Midnight Navy Enterprise'}
                    </div>
                  </div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-emerald-500" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
