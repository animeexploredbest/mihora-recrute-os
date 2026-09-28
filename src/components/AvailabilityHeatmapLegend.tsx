import React, { useState } from 'react';
import {
  Flame,
  Sparkles,
  BarChart2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CalendarPlus,
  Layers,
  Info,
} from 'lucide-react';
import {
  HeatmapAnalysis,
  HeatmapViewMode,
  RecommendedWindow,
} from '../lib/availability-heatmap';
import { useTheme } from '../lib/theme';

interface AvailabilityHeatmapLegendProps {
  analysis: HeatmapAnalysis;
  viewMode: HeatmapViewMode;
  onViewModeChange: (mode: HeatmapViewMode) => void;
  onSelectRecommendedSlot: (slotIso: string) => void;
  maxCapacity: number;
}

export const AvailabilityHeatmapLegend: React.FC<AvailabilityHeatmapLegendProps> = ({
  analysis,
  viewMode,
  onViewModeChange,
  onSelectRecommendedSlot,
  maxCapacity,
}) => {
  const { colors } = useTheme();
  const [showDetailedInsights, setShowDetailedInsights] = useState(false);

  return (
    <div className={`rounded-2xl border ${colors.border} ${colors.cardBg} shadow-xs overflow-hidden transition-all duration-200`}>
      {/* Top Bar: Heatmap Status, Mode Switcher & Quick Stats */}
      <div className="p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 border-b border-stone-200/70 dark:border-stone-800/80 bg-stone-50/70 dark:bg-stone-800/40">
        {/* Left: Indicator title and Legend */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>Availability Heatmap Active</span>
            </span>
          </div>

          <div className="hidden sm:block h-4 w-px bg-stone-200 dark:bg-stone-700" />

          {/* Color scale legend */}
          <div className="flex items-center gap-2 text-[11px] font-medium flex-wrap">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Prime Open</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 text-sky-800 dark:text-sky-300">
              <span className="w-2 h-2 rounded-full bg-sky-500" />
              <span>Light (1 Active)</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Moderate (2 Active)</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Peak / Saturated (3-4)</span>
            </div>
          </div>
        </div>

        {/* Right: Mode Switcher & Expand Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode Tabs */}
          <div className={`flex ${colors.subtleBg} p-0.5 rounded-xl border ${colors.border}`}>
            <button
              type="button"
              onClick={() => onViewModeChange('balanced')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                viewMode === 'balanced'
                  ? `${colors.cardBg} ${colors.textPrimary} shadow-2xs`
                  : `${colors.textSecondary} hover:${colors.textPrimary}`
              }`}
              title="Combined live concurrency + historical booking probability"
            >
              Balanced
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('live_capacity')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                viewMode === 'live_capacity'
                  ? `${colors.cardBg} ${colors.textPrimary} shadow-2xs`
                  : `${colors.textSecondary} hover:${colors.textPrimary}`
              }`}
              title="Displays exact live multi-track concurrent load (0-4)"
            >
              Live Capacity
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('historical_patterns')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                viewMode === 'historical_patterns'
                  ? `${colors.cardBg} ${colors.textPrimary} shadow-2xs`
                  : `${colors.textSecondary} hover:${colors.textPrimary}`
              }`}
              title="Displays historical booking density and recurring peak windows"
            >
              Historical Patterns
            </button>
          </div>

          {/* Toggle Detailed Analytics */}
          <button
            type="button"
            onClick={() => setShowDetailedInsights(!showDetailedInsights)}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors cursor-pointer"
          >
            <BarChart2 className="w-3.5 h-3.5 text-indigo-500" />
            <span>{showDetailedInsights ? 'Hide Patterns' : 'Historical Intelligence'}</span>
            {showDetailedInsights ? (
              <ChevronUp className="w-3.5 h-3.5 ml-0.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
            )}
          </button>
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="px-4 py-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs border-b border-stone-100 dark:border-stone-800/80 bg-white dark:bg-stone-900/60">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          <span className="text-stone-500 dark:text-stone-400">Team Capacity Booked:</span>
          <span className="font-mono font-bold text-stone-800 dark:text-stone-200">
            {analysis.averageCapacityUtilization}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-stone-500 dark:text-stone-400">Open Slots:</span>
          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
            {analysis.openSlotsCount}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          <span className="text-stone-500 dark:text-stone-400">Peak Congestion Slots:</span>
          <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
            {analysis.peakSlotsCount}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          <span className="text-stone-500 dark:text-stone-400">Historical Peak:</span>
          <span className="font-mono font-bold text-amber-700 dark:text-amber-300 truncate">
            {analysis.overallBusiestDay} @ {analysis.overallBusiestHour}
          </span>
        </div>
      </div>

      {/* Expandable Historical Intelligence Drawer */}
      {showDetailedInsights && (
        <div className="p-4 sm:p-5 bg-stone-50/80 dark:bg-stone-900 border-t border-stone-200/70 dark:border-stone-800 space-y-5 animate-in fade-in duration-200">
          {/* Section 1: Smart Scheduling Recommendations */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>AI Scheduling Optimization: Top Open Windows</span>
              </h4>
              <span className="text-[11px] text-stone-500 dark:text-stone-400">
                Calculated from historical attendance & team interviewer availability
              </span>
            </div>

            {analysis.topRecommendedWindows.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {analysis.topRecommendedWindows.map((rw: RecommendedWindow, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20 hover:border-emerald-400 dark:hover:border-emerald-700 transition-all flex flex-col justify-between gap-2 shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                          {rw.dayLabel} {rw.dateNumber} • {rw.hourLabel} PKT
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                          {rw.openTracks}/{maxCapacity} Free
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-snug">
                        {rw.reason}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectRecommendedSlot(rw.suggestedIso)}
                      className="w-full py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    >
                      <CalendarPlus className="w-3.5 h-3.5" />
                      <span>Book Recommended Slot</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 text-xs text-stone-500">
                All business hour slots in this period are currently booked. Browse subsequent weeks or add parallel tracks.
              </div>
            )}
          </div>

          {/* Section 2: Hourly Velocity Chart (08:00 - 22:00 PKT) */}
          <div className="pt-2 border-t border-stone-200/60 dark:border-stone-800/80">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                <span>Historical Interview Volume by Hour (PKT / UTC+5)</span>
              </h4>
              <div className="flex items-center gap-3 text-[11px] text-stone-500 dark:text-stone-400">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
                  Peak Volume
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" />
                  Standard Flow
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                  High Open Availability
                </span>
              </div>
            </div>

            {/* Micro-bar histogram */}
            <div className="grid grid-cols-15 gap-1 pt-2 pb-1 overflow-x-auto">
              {analysis.hourlyHistoricalProfile.map((h) => {
                const heightPercent = Math.max(12, Math.min(100, h.avgLoadPercentage || 12));
                const barColor = h.isPeak
                  ? 'bg-rose-500 dark:bg-rose-600'
                  : h.avgLoadPercentage > 40
                  ? 'bg-indigo-500 dark:bg-indigo-600'
                  : 'bg-emerald-500 dark:bg-emerald-600';

                return (
                  <div
                    key={h.hour}
                    className="flex flex-col items-center gap-1 group/bar relative min-w-[28px]"
                  >
                    {/* Hover tooltip */}
                    <div className="opacity-0 group-hover/bar:opacity-100 transition-opacity absolute bottom-full mb-1 z-20 pointer-events-none bg-stone-900 text-white text-[10px] py-1 px-1.5 rounded shadow-lg whitespace-nowrap">
                      {h.hourLabel} PKT: {h.historicalCount} historical sessions ({h.avgLoadPercentage}% load)
                    </div>

                    <div className="h-16 w-full bg-stone-200/50 dark:bg-stone-800 rounded-md flex items-end p-0.5">
                      <div
                        className={`w-full rounded-xs transition-all duration-300 ${barColor}`}
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                    <span className="text-[9px] font-mono font-medium text-stone-500 dark:text-stone-400 truncate">
                      {h.hour}h
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Day of Week Velocity */}
          <div className="pt-2 border-t border-stone-200/60 dark:border-stone-800/80">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                <span>Weekly Velocity Breakdown</span>
              </h4>
              <span className="text-[11px] text-stone-500">
                Helps schedule technical rounds on high-attendance days
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-7 gap-2">
              {analysis.dayOfWeekProfile.map((d) => (
                <div
                  key={d.dayIndex}
                  className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-800/60 text-xs flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-stone-800 dark:text-stone-200">
                      {d.dayName}
                    </span>
                    <span className="font-mono text-[10px] text-stone-500">
                      {d.totalHistoricalInterviews} total
                    </span>
                  </div>
                  <div className="text-[10px] text-stone-500 dark:text-stone-400 mt-1">
                    Peak: <span className="font-semibold text-stone-700 dark:text-stone-300">{d.peakHourLabel}</span>
                  </div>
                  <div className="w-full bg-stone-100 dark:bg-stone-700/50 h-1.5 rounded-full overflow-hidden mt-2">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all"
                      style={{ width: `${Math.max(5, d.utilizationRate)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
