import React, { createContext, useContext, useState, useEffect } from 'react';

export type AppTheme = 'slate' | 'dark' | 'corporate';

export interface ThemeColors {
  id: AppTheme;
  name: string;
  icon: string;
  pageBg: string;
  cardBg: string;
  cardHeader: string;
  cardBorder: string;
  headerBg: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderLight: string;
  accentBg: string;
  accentHover: string;
  accentText: string;
  accentRing: string;
  accentSoft: string;
  subtleBg: string;
  inputBg: string;
  globeTheme: {
    bgGradient: string;
    landFill: string;
    landStroke: string;
    waterFill: string;
    graticuleColor: string;
    glowOuter: string;
    glowInner: string;
    flightLineColor: string;
  };
}

export const THEMES: Record<AppTheme, ThemeColors> = {
  slate: {
    id: 'slate',
    name: 'Studio Light',
    icon: '☀️',
    pageBg: 'bg-slate-100/90 text-slate-900',
    cardBg: 'bg-white border-slate-200/90 shadow-xs hover:border-slate-300 transition-all',
    cardHeader: 'bg-slate-50 border-slate-200',
    cardBorder: 'border-slate-200',
    headerBg: 'bg-white/95 backdrop-blur-md border-slate-200 shadow-xs',
    textPrimary: 'text-slate-900',
    textSecondary: 'text-slate-700',
    textMuted: 'text-slate-500',
    border: 'border-slate-200',
    borderLight: 'border-slate-100',
    accentBg: 'bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs',
    accentHover: 'hover:bg-blue-700',
    accentText: 'text-blue-600',
    accentRing: 'focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600',
    accentSoft: 'bg-blue-50 text-blue-700 border-blue-200',
    subtleBg: 'bg-slate-100',
    inputBg: 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20',
    globeTheme: {
      bgGradient: 'from-[#0a1128] via-[#050b1a] to-[#02050e]',
      landFill: '#1e293b',
      landStroke: '#334155',
      waterFill: '#050a18',
      graticuleColor: 'rgba(59, 130, 246, 0.15)',
      glowOuter: '#3b82f6',
      glowInner: '#1e3a8a',
      flightLineColor: '#60a5fa',
    },
  },
  dark: {
    id: 'dark',
    name: 'Obsidian Dark',
    icon: '🌙',
    pageBg: 'bg-[#090d16] text-slate-100',
    cardBg: 'bg-[#111827] border-slate-800 shadow-md hover:border-slate-700 transition-all',
    cardHeader: 'bg-[#0f172a] border-slate-800',
    cardBorder: 'border-slate-800',
    headerBg: 'bg-[#090d16]/95 backdrop-blur-md border-slate-800 shadow-xs',
    textPrimary: 'text-white',
    textSecondary: 'text-slate-200',
    textMuted: 'text-slate-400',
    border: 'border-slate-800',
    borderLight: 'border-slate-800/80',
    accentBg: 'bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-xs',
    accentHover: 'hover:bg-blue-500',
    accentText: 'text-blue-400',
    accentRing: 'focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500',
    accentSoft: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    subtleBg: 'bg-slate-800/70',
    inputBg: 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
    globeTheme: {
      bgGradient: 'from-[#09090b] via-[#050507] to-[#000000]',
      landFill: '#27272a',
      landStroke: '#3f3f46',
      waterFill: '#09090b',
      graticuleColor: 'rgba(59, 130, 246, 0.15)',
      glowOuter: '#3b82f6',
      glowInner: '#1e3a8a',
      flightLineColor: '#60a5fa',
    },
  },
  corporate: {
    id: 'corporate',
    name: 'Executive Navy',
    icon: '💎',
    pageBg: 'bg-[#070d1d] text-slate-100',
    cardBg: 'bg-[#0e1935] border-[#1d2f5d] shadow-md hover:border-[#2b427e] transition-all',
    cardHeader: 'bg-[#0a1329] border-[#1d2f5d]',
    cardBorder: 'border-[#1d2f5d]',
    headerBg: 'bg-[#070d1d]/95 backdrop-blur-md border-[#1d2f5d] shadow-xs',
    textPrimary: 'text-white',
    textSecondary: 'text-slate-200',
    textMuted: 'text-slate-400',
    border: 'border-[#1d2f5d]',
    borderLight: 'border-[#162447]',
    accentBg: 'bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-xs',
    accentHover: 'hover:bg-indigo-500',
    accentText: 'text-indigo-400',
    accentRing: 'focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500',
    accentSoft: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    subtleBg: 'bg-[#152347]',
    inputBg: 'bg-[#0a1329] border-[#223563] text-white placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20',
    globeTheme: {
      bgGradient: 'from-[#070d1d] via-[#050b18] to-[#02050e]',
      landFill: '#1e293b',
      landStroke: '#38bdf8',
      waterFill: '#050a18',
      graticuleColor: 'rgba(56, 189, 248, 0.15)',
      glowOuter: '#38bdf8',
      glowInner: '#0369a1',
      flightLineColor: '#38bdf8',
    },
  },
};

interface ThemeContextType {
  theme: AppTheme;
  colors: ThemeColors;
  setTheme: (theme: AppTheme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'slate',
  colors: THEMES.slate,
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    const saved = localStorage.getItem('recruitsync_app_theme_v4') as string | null;
    if (saved && (saved === 'slate' || saved === 'dark' || saved === 'corporate')) {
      return saved as AppTheme;
    }
    // Backward compatibility for old saved themes
    if (saved === 'desertNight') return 'dark';
    if (saved === 'desert') return 'slate';
    return 'slate'; // Clean, crisp, high-contrast Studio Light as default!
  });

  const setTheme = (newTheme: AppTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('recruitsync_app_theme_v4', newTheme);
  };

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (theme === 'dark' || theme === 'corporate') {
      document.documentElement.classList.add('dark');
      document.body.style.backgroundColor = theme === 'dark' ? '#090d16' : '#070d1d';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = '#f1f5f9';
    }
  }, [theme]);

  const value = {
    theme,
    colors: THEMES[theme],
    setTheme,
  };

  return React.createElement(ThemeContext.Provider, { value }, children);
}

export function useTheme() {
  return useContext(ThemeContext);
}
