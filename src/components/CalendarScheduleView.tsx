import React, { useState, useMemo, useEffect } from 'react';
import { Candidate, HiringRound } from '../types';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Video,
  ExternalLink,
  MessageCircle,
  Bell,
  Award,
  AlertTriangle,
  Plus,
  Users,
  CheckCircle2,
  X,
  CalendarPlus,
  CalendarCheck,
  UserPlus,
  Flame,
  Sparkles,
  Zap,
  Check,
  Loader2,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { formatPktDateTime, formatLocalDateTime, getPktDateComponents, createPktIso } from '../lib/date-utils';
import { detectCandidateGeo } from '../lib/geo-utils';
import { isCandidateScheduled, findSlotConflicts, findNextFreeSlotAndTrack } from '../lib/conflict-detector';
import { DEFAULT_INTERVIEW_TRACKS, getTrackById, InterviewTrack } from '../lib/track-constants';
import { useTheme } from '../lib/theme';
import { AvailabilityHeatmapLegend } from './AvailabilityHeatmapLegend';
import {
  computeHistoricalMatrix,
  evaluateHeatmapSlot,
  computeHeatmapAnalysis,
  getHeatmapColorStyles,
  HeatmapViewMode,
} from '../lib/availability-heatmap';

interface CalendarScheduleViewProps {
  candidates: Candidate[];
  onScheduleCandidate: (candidate: Candidate) => void;
  onOpenScorecard: (candidate: Candidate) => void;
  onOpenReminder: (candidate: Candidate) => void;
  onOpenWhatsApp: (candidate: Candidate) => void;
  onAddNewCandidateAtSlot?: (slotTimeIso: string, trackId?: string) => void;
  onDirectBookSlot?: (candidateId: string, slotIso: string, trackId: string) => Promise<void>;
  onStatusChange?: (candidateId: string, newStatus: Candidate['status']) => void;
  onOpenAutoScheduler?: () => void;
  maxConcurrentSlots?: number;
  initialAnchorDate?: Date;
  highlightCandidateId?: string;
}

export const CalendarScheduleView: React.FC<CalendarScheduleViewProps> = ({
  candidates,
  onScheduleCandidate,
  onOpenScorecard,
  onOpenReminder,
  onOpenWhatsApp,
  onAddNewCandidateAtSlot,
  onDirectBookSlot,
  onStatusChange,
  onOpenAutoScheduler,
  maxConcurrentSlots = 4,
  initialAnchorDate,
  highlightCandidateId,
}) => {
  const { colors } = useTheme();

  // Current anchor date (defaults to initialAnchorDate or current date)
  const [anchorDate, setAnchorDate] = useState<Date>(() => initialAnchorDate || new Date());
  useEffect(() => {
    if (initialAnchorDate) {
      setAnchorDate(initialAnchorDate);
    }
  }, [initialAnchorDate]);

  const [calendarMode, setCalendarMode] = useState<'week' | 'day'>('week');
  const [slotToBook, setSlotToBook] = useState<Date | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('');
  const [selectedTrackId, setSelectedTrackId] = useState<string>('track-alpha');
  const [isBookingDirect, setIsBookingDirect] = useState<boolean>(false);
  const [candidateFilterScope, setCandidateFilterScope] = useState<'awaiting' | 'all'>('awaiting');
  const [showTentativePending, setShowTentativePending] = useState<boolean>(true);

  // Availability Heatmap state
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [heatmapMode, setHeatmapMode] = useState<HeatmapViewMode>('balanced');
  const [showPipelineDrawer, setShowPipelineDrawer] = useState<boolean>(true);
  const [dragOverSlotIso, setDragOverSlotIso] = useState<string | null>(null);

  const maxCapacity = maxConcurrentSlots || 4;

  // Pipeline candidates awaiting calendar slots
  const pipelineAwaitingCandidates = useMemo(() => {
    return candidates.filter(
      (c) =>
        c.status !== 'Rejected' &&
        (!c.suggestedPktTime || c.status === 'Pending' || c.status === 'Rescheduled')
    );
  }, [candidates]);

  // Auto-scroll to highlighted candidate if specified
  useEffect(() => {
    if (highlightCandidateId) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`calendar-candidate-${highlightCandidateId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [highlightCandidateId]);

  // Compute strictly in PKT (UTC+5) to eliminate local browser timezone distortion
  const anchorPkt = getPktDateComponents(anchorDate) || getPktDateComponents(new Date())!;
  // Day of week: 0=Sun, 1=Mon, ..., 6=Sat
  const diffToMonday = anchorPkt.dayOfWeek === 0 ? -6 : 1 - anchorPkt.dayOfWeek;

  // Generate 7 days strictly centered at 12:00 PM PKT (safe from midnight timezone shifts)
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const dayIso = createPktIso(anchorPkt.year, anchorPkt.month, anchorPkt.date + diffToMonday + i, 12, 0);
      return new Date(dayIso);
    });
  }, [anchorPkt.year, anchorPkt.month, anchorPkt.date, diffToMonday]);

  const displayedDays = useMemo(() => {
    if (calendarMode === 'week') return weekDays;
    const dayIso = createPktIso(anchorPkt.year, anchorPkt.month, anchorPkt.date, 12, 0);
    return [new Date(dayIso)];
  }, [calendarMode, weekDays, anchorPkt.year, anchorPkt.month, anchorPkt.date]);

  // Hours to show: 08:00 to 22:00 PKT
  const hours = useMemo(() => Array.from({ length: 15 }).map((_, i) => i + 8), []);

  const prevPeriod = () => {
    const next = new Date(anchorDate);
    if (calendarMode === 'week') {
      next.setDate(next.getDate() - 7);
    } else {
      next.setDate(next.getDate() - 1);
    }
    setAnchorDate(next);
  };

  const nextPeriod = () => {
    const next = new Date(anchorDate);
    if (calendarMode === 'week') {
      next.setDate(next.getDate() + 7);
    } else {
      next.setDate(next.getDate() + 1);
    }
    setAnchorDate(next);
  };

  const goToToday = () => {
    setAnchorDate(new Date());
  };

  // Filter scheduled candidates (including tentative if enabled)
  const scheduledCandidates = useMemo(() => {
    return candidates.filter((c) => {
      if (!c.suggestedPktTime || c.status === 'Rejected') return false;
      if (isCandidateScheduled(c)) return true;
      if (showTentativePending && c.status === 'Pending') return true;
      return false;
    });
  }, [candidates, showTentativePending]);

  const openSlotBooking = (date: Date) => {
    setSlotToBook(date);
    const dayPkt = getPktDateComponents(date)!;
    // Find active candidates in this slot to identify occupied tracks
    const inSlot = scheduledCandidates.filter((c) => {
      if (!c.suggestedPktTime) return false;
      const cPkt = getPktDateComponents(c.suggestedPktTime);
      return (
        cPkt &&
        cPkt.year === dayPkt.year &&
        cPkt.month === dayPkt.month &&
        cPkt.date === dayPkt.date &&
        cPkt.hour === dayPkt.hour
      );
    });
    const occupiedTrackIds = new Set(inSlot.map((c) => c.trackId || 'track-alpha'));
    const freeTrack = DEFAULT_INTERVIEW_TRACKS.find((t) => !occupiedTrackIds.has(t.id));
    setSelectedTrackId(freeTrack ? freeTrack.id : 'track-alpha');

    const firstAwaiting = candidates.find(
      (c) => c.status === 'Pending' || c.status === 'Rescheduled'
    );
    if (firstAwaiting?.id) {
      setSelectedCandidateId(firstAwaiting.id);
    } else if (candidates.length > 0 && candidates[0].id) {
      setSelectedCandidateId(candidates[0].id);
    }
  };

  // Compute historical matrix and heatmap metrics (memoized)
  const { matrix: historicalMatrix, maxInAnySlot } = useMemo(
    () => computeHistoricalMatrix(candidates),
    [candidates]
  );

  const heatmapAnalysis = useMemo(
    () =>
      computeHeatmapAnalysis(
        displayedDays,
        hours,
        candidates,
        maxCapacity,
        heatmapMode
      ),
    [displayedDays, hours, candidates, maxCapacity, heatmapMode]
  );

  // Format month title
  const monthYearTitle = (weekDays[0] || anchorDate).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-4">
      {/* Calendar Navigation & Mode Switcher Bar */}
      <div className={`p-4 rounded-2xl border ${colors.border} ${colors.cardBg} flex flex-wrap items-center justify-between gap-3 shadow-xs`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className={`text-base font-bold ${colors.textPrimary} flex items-center gap-2`}>
              <span>{monthYearTitle}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-mono font-semibold border border-indigo-500/20">
                PKT (UTC+5)
              </span>
            </h2>
            <p className={`text-xs ${colors.textSecondary}`}>
              {scheduledCandidates.length} interviews scheduled across {maxCapacity} parallel tracks
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Availability Heatmap Toggle */}
          <button
            type="button"
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
              showHeatmap
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-800 dark:text-amber-300 ring-1 ring-amber-500/30'
                : `${colors.border} ${colors.cardBg} ${colors.textSecondary} hover:${colors.textPrimary}`
            }`}
            title="Toggle Availability Heatmap (Displays peak vs. open interview slots)"
          >
            <Flame
              className={`w-3.5 h-3.5 ${
                showHeatmap ? 'text-amber-500 fill-amber-500 animate-pulse' : 'text-stone-400'
              }`}
            />
            <span>Heatmap: {showHeatmap ? 'ON' : 'OFF'}</span>
          </button>

          {/* Tentative Slots Toggle */}
          <button
            type="button"
            onClick={() => setShowTentativePending(!showTentativePending)}
            className={`px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
              showTentativePending
                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-700 dark:text-indigo-300'
                : `${colors.border} ${colors.cardBg} ${colors.textSecondary} hover:${colors.textPrimary}`
            }`}
            title="Toggle displaying pending candidates who have a tentative slot set"
          >
            <Clock className="w-3.5 h-3.5 text-indigo-500" />
            <span className="hidden sm:inline">Tentative Slots:</span>
            <span>{showTentativePending ? 'ON' : 'OFF'}</span>
          </button>

          {/* Week / Day Toggle */}
          <div className={`flex ${colors.subtleBg} p-1 rounded-xl border ${colors.border}`}>
            <button
              type="button"
              onClick={() => setCalendarMode('week')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                calendarMode === 'week'
                  ? `${colors.cardBg} ${colors.textPrimary} shadow-2xs`
                  : `${colors.textSecondary} hover:${colors.textPrimary}`
              }`}
            >
              Week
            </button>
            <button
              type="button"
              onClick={() => setCalendarMode('day')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                calendarMode === 'day'
                  ? `${colors.cardBg} ${colors.textPrimary} shadow-2xs`
                  : `${colors.textSecondary} hover:${colors.textPrimary}`
              }`}
            >
              Day
            </button>
          </div>

          <button
            type="button"
            onClick={goToToday}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl border ${colors.border} ${colors.cardBg} ${colors.textPrimary} hover:opacity-90 transition-all cursor-pointer`}
          >
            Today
          </button>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={prevPeriod}
              className={`p-1.5 rounded-lg border ${colors.border} hover:${colors.subtleBg} ${colors.textSecondary} cursor-pointer`}
              title="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={nextPeriod}
              className={`p-1.5 rounded-lg border ${colors.border} hover:${colors.subtleBg} ${colors.textSecondary} cursor-pointer`}
              title="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Availability Heatmap Legend & Historical Pattern Analytics */}
      {showHeatmap && (
        <AvailabilityHeatmapLegend
          analysis={heatmapAnalysis}
          viewMode={heatmapMode}
          onViewModeChange={setHeatmapMode}
          onSelectRecommendedSlot={(slotIso) => openSlotBooking(new Date(slotIso))}
          maxCapacity={maxCapacity}
        />
      )}

      {/* 🚀 Interactive Pipeline Candidates Drawer directly linked to Calendar Slots */}
      <div className={`rounded-2xl border ${colors.border} ${colors.cardBg} shadow-xs overflow-hidden transition-all`}>
        <div className="p-3.5 sm:px-4 flex items-center justify-between border-b border-stone-150 dark:border-stone-800 bg-gradient-to-r from-indigo-50/70 via-stone-50 to-amber-50/50 dark:from-indigo-950/30 dark:via-stone-900 dark:to-amber-950/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-2xs">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className={`text-xs font-bold uppercase tracking-wider ${colors.textPrimary} flex items-center gap-2`}>
                <span>Pipeline Candidates Awaiting Calendar Slots</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                  pipelineAwaitingCandidates.length > 0
                    ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200 border border-amber-300'
                    : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-200 border border-emerald-300'
                }`}>
                  {pipelineAwaitingCandidates.length} Pending Assignment
                </span>
              </h3>
              <p className={`text-[11px] ${colors.textSecondary}`}>
                Directly book unassigned pipeline candidates into optimal concurrent tracks without leaving the calendar
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenAutoScheduler && pipelineAwaitingCandidates.length > 0 && (
              <button
                type="button"
                onClick={onOpenAutoScheduler}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                title="Automatically schedule awaiting pipeline candidates using AI multi-track matrix"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Auto-Schedule All ({pipelineAwaitingCandidates.length})</span>
              </button>
            )}
            {onAddNewCandidateAtSlot && (
              <button
                type="button"
                onClick={() => onAddNewCandidateAtSlot(anchorDate.toISOString(), selectedTrackId)}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                title="Add candidate profile directly for this date"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add to Calendar</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowPipelineDrawer(!showPipelineDrawer)}
              className={`p-1.5 rounded-lg border ${colors.border} hover:${colors.subtleBg} ${colors.textSecondary} cursor-pointer text-xs flex items-center gap-1 font-semibold`}
            >
              <span>{showPipelineDrawer ? 'Hide' : 'Show Pipeline'}</span>
            </button>
          </div>
        </div>

        {showPipelineDrawer && (
          <div className="p-3.5 space-y-2.5">
            {pipelineAwaitingCandidates.length === 0 ? (
              <div className="p-4 text-center rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>All pipeline candidates currently have assigned calendar slots! Click any empty grid cell to add or reserve more slots.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 max-h-60 overflow-y-auto pr-1">
                {pipelineAwaitingCandidates.map((cand) => {
                  const geo = detectCandidateGeo(cand);
                  return (
                    <div
                      key={cand.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('candidateId', cand.id!);
                        e.dataTransfer.setData('text/plain', cand.id!);
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      className={`p-2.5 rounded-xl border ${colors.border} ${colors.subtleBg} hover:border-indigo-400 transition-all flex flex-col justify-between space-y-2 cursor-grab active:cursor-grabbing hover:shadow-xs group`}
                      title="Drag to any slot below or click 1-Click Prime Slot"
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className={`text-xs font-bold ${colors.textPrimary} truncate`}>
                              {cand.name}
                            </h4>
                            <span className="text-[8px] font-semibold text-stone-400 group-hover:text-indigo-600 transition-colors">
                              ⠿ Drag to Slot
                            </span>
                          </div>
                          <p className={`text-[10px] ${colors.textSecondary} truncate`}>
                            {cand.position || 'Applicant'}
                          </p>
                          <div className="flex items-center gap-1 text-[10px] text-amber-800 dark:text-amber-300 pt-0.5">
                            <span>{geo.flag}</span>
                            <span className="truncate">{cand.country || geo.country}</span>
                            {cand.hiringRound && (
                              <>
                                <span>•</span>
                                <span className="font-semibold">{cand.hiringRound}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 shrink-0">
                          {cand.status}
                        </span>
                      </div>

                      {/* Fast Action Buttons */}
                      <div className="flex items-center gap-1.5 pt-1 border-t border-stone-200/50 dark:border-stone-700/50">
                        {onDirectBookSlot && cand.id && (
                          <button
                            type="button"
                            onClick={async () => {
                              const suggestion = findNextFreeSlotAndTrack(
                                anchorDate.toISOString(),
                                cand.durationMinutes || 45,
                                candidates,
                                cand.id,
                                cand.trackId,
                                maxCapacity
                              );
                              await onDirectBookSlot(cand.id!, suggestion.slotIso, suggestion.trackId);
                            }}
                            className="flex-1 py-1 px-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-2xs"
                            title="Auto-detect next open parallel slot and book instantly"
                          >
                            <Zap className="w-3 h-3 fill-current" />
                            <span>1-Click Prime Slot</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            onScheduleCandidate(cand);
                          }}
                          className="py-1 px-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-2xs"
                          title="Open Schedule & Google Meet Dispatcher"
                        >
                          <Video className="w-3 h-3" />
                          <span>Meet</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Calendar Grid Container */}
      <div className={`border ${colors.border} ${colors.cardBg} rounded-2xl overflow-hidden shadow-xs`}>
        {/* Days Header */}
        <div
          className="grid border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60"
          style={{
            gridTemplateColumns: `60px repeat(${displayedDays.length}, minmax(140px, 1fr))`,
          }}
        >
          {/* Time axis header placeholder */}
          <div className="p-3 text-[10px] font-mono font-bold text-stone-400 text-center border-r border-stone-200 dark:border-stone-800">
            PKT
          </div>

          {/* Day columns headers */}
          {displayedDays.map((day, idx) => {
            const isToday =
              day.toDateString() === new Date().toDateString();
            const dayNum = day.getDate();
            const dayName = day.toLocaleDateString('en-US', { weekday: 'short' });

            return (
              <div
                key={idx}
                className={`p-3 text-center border-r border-stone-200 dark:border-stone-800 last:border-r-0 ${
                  isToday ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : ''
                }`}
              >
                <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 block">
                  {dayName}
                </span>
                <span
                  className={`inline-flex items-center justify-center w-7 h-7 text-sm font-bold rounded-full mt-0.5 ${
                    isToday
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-stone-800 dark:text-stone-200'
                  }`}
                >
                  {dayNum}
                </span>
              </div>
            );
          })}
        </div>

        {/* Hourly Grid Rows */}
        <div className="overflow-x-auto max-h-[680px] overflow-y-auto">
          <div
            className="grid relative"
            style={{
              gridTemplateColumns: `60px repeat(${displayedDays.length}, minmax(140px, 1fr))`,
            }}
          >
            {hours.map((hour) => {
              const hourLabel = `${hour < 10 ? '0' + hour : hour}:00`;

              return (
                <React.Fragment key={hour}>
                  {/* Time Label on Y-axis */}
                  <div className="h-24 p-2 text-right pr-2.5 text-[11px] font-mono text-stone-400 border-b border-r border-stone-100 dark:border-stone-800/60 select-none">
                    {hourLabel}
                  </div>

                  {/* Day Slots for this hour */}
                  {displayedDays.map((day, dIdx) => {
                    const dayPkt = getPktDateComponents(day)!;
                    // Match candidates whose scheduled time falls on this day & hour in PKT
                    const slotCandidates = scheduledCandidates.filter((c) => {
                      if (!c.suggestedPktTime) return false;
                      const cPkt = getPktDateComponents(c.suggestedPktTime);
                      if (!cPkt) return false;
                      return (
                        cPkt.year === dayPkt.year &&
                        cPkt.month === dayPkt.month &&
                        cPkt.date === dayPkt.date &&
                        cPkt.hour === hour
                      );
                    });

                    // Construct exact ISO timestamp for this PKT slot (UTC+5)
                    const slotIso = createPktIso(dayPkt.year, dayPkt.month, dayPkt.date, hour, 0);
                    const slotDate = new Date(slotIso);

                    // Heatmap evaluation for this specific slot
                    const slotEval = evaluateHeatmapSlot(
                      day,
                      hour,
                      candidates,
                      historicalMatrix,
                      maxInAnySlot,
                      maxCapacity,
                      heatmapMode
                    );
                    const heatStyles = getHeatmapColorStyles(slotEval.intensity, slotEval.isOpen);

                    const isSlotFull = slotCandidates.length >= maxCapacity;
                    const isDragOver = dragOverSlotIso === slotIso;

                    return (
                      <div
                        key={dIdx}
                        onDragOver={(e) => {
                          if (!isSlotFull) {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'copy';
                          }
                        }}
                        onDragEnter={() => {
                          if (!isSlotFull) setDragOverSlotIso(slotIso);
                        }}
                        onDragLeave={() => {
                          if (dragOverSlotIso === slotIso) setDragOverSlotIso(null);
                        }}
                        onDrop={async (e) => {
                          e.preventDefault();
                          setDragOverSlotIso(null);
                          if (isSlotFull) return;
                          const candidateId = e.dataTransfer.getData('candidateId') || e.dataTransfer.getData('text/plain');
                          if (candidateId && onDirectBookSlot) {
                            const occupiedTracks = new Set(slotCandidates.map((c) => c.trackId || 'track-alpha'));
                            const freeTrack = DEFAULT_INTERVIEW_TRACKS.find((t) => !occupiedTracks.has(t.id)) || DEFAULT_INTERVIEW_TRACKS[0];
                            await onDirectBookSlot(candidateId, slotIso, freeTrack.id);
                          }
                        }}
                        className={`min-h-[110px] h-auto p-1.5 border-b border-r border-stone-100 dark:border-stone-800/60 relative group transition-all flex flex-col justify-start gap-1.5 ${
                          isDragOver
                            ? 'ring-2 ring-indigo-500 bg-indigo-50/90 dark:bg-indigo-950/90 z-10 scale-[1.01]'
                            : showHeatmap
                            ? `${heatStyles.cellBg} hover:opacity-95`
                            : 'hover:bg-stone-50/50 dark:hover:bg-stone-800/20'
                        }`}
                        title={
                          showHeatmap
                            ? `[${hourLabel} PKT - ${slotEval.dayName}] ${slotEval.statusLabel} • ${slotCandidates.length}/${maxCapacity} active tracks. ${slotEval.recommendationReason}`
                            : undefined
                        }
                      >
                        {isDragOver && (
                          <div className="p-1.5 rounded-lg bg-indigo-600 text-white text-[10px] font-bold text-center shadow-xs animate-pulse">
                            Drop to Book Slot in {(() => {
                              const occupied = new Set(slotCandidates.map((c) => c.trackId || 'track-alpha'));
                              const freeTrack = DEFAULT_INTERVIEW_TRACKS.find((t) => !occupied.has(t.id)) || DEFAULT_INTERVIEW_TRACKS[0];
                              return freeTrack.shortCode;
                            })()}
                          </div>
                        )}
                        {slotCandidates.length === 0 ? (
                          <div className="w-full h-full min-h-[96px] flex flex-col justify-between">
                            {/* Heatmap Empty Slot Indicator */}
                            {showHeatmap && (
                              <div className="flex items-center justify-between text-[9px] font-bold px-1.5 py-0.5 rounded border mb-1 bg-white/70 dark:bg-stone-900/70 border-stone-200/60 dark:border-stone-800/60">
                                <span className="flex items-center gap-1">
                                  <span className={`w-1.5 h-1.5 rounded-full ${heatStyles.indicatorDot}`} />
                                  <span className={heatStyles.badgeText}>
                                    {slotEval.intensity === 'optimal_open' ? 'Prime Open' : 'Open'}
                                  </span>
                                </span>
                                <span className="font-mono text-stone-500 dark:text-stone-400">
                                  {maxCapacity}/{maxCapacity} Free
                                </span>
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => openSlotBooking(slotDate)}
                              className="w-full flex-1 flex flex-col items-center justify-center rounded-lg border border-dashed border-transparent hover:border-amber-400/80 hover:bg-amber-50/60 dark:hover:bg-amber-950/20 text-stone-400 dark:text-stone-600 hover:text-amber-700 dark:hover:text-amber-400 transition-all cursor-pointer group/empty"
                              title={`Click to book interview slot on ${slotDate.toLocaleDateString()} at ${hour}:00 PKT`}
                            >
                              <Plus className="w-4 h-4 opacity-0 group-hover/empty:opacity-100 transition-opacity" />
                              <span className="text-[10px] font-semibold opacity-0 group-hover/empty:opacity-100 transition-opacity">
                                {showHeatmap && slotEval.intensity === 'optimal_open'
                                  ? 'Book Prime Slot'
                                  : 'Book Slot'}
                              </span>
                              {showHeatmap && slotEval.historicalBookingFrequency > 0 && (
                                <span className="text-[8px] font-mono text-stone-400 dark:text-stone-500 opacity-0 group-hover/empty:opacity-80 transition-opacity mt-0.5">
                                  {slotEval.historicalBookingFrequency} hist. sessions
                                </span>
                              )}
                            </button>
                          </div>
                        ) : (
                          <>
                            {/* Availability Heatmap Live Status Header */}
                            {showHeatmap ? (
                              <div
                                className={`flex items-center justify-between text-[9px] font-bold px-1.5 py-0.5 rounded border mb-0.5 ${heatStyles.badgeBg} ${heatStyles.badgeText} ${heatStyles.badgeBorder}`}
                              >
                                <span className="flex items-center gap-1 truncate">
                                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${heatStyles.indicatorDot}`} />
                                  <span className="truncate">
                                    {slotEval.isSaturated
                                      ? '⛔ Saturated'
                                      : slotEval.isPeak
                                      ? '🔥 Peak Slot'
                                      : slotEval.intensity === 'moderate_demand'
                                      ? 'Moderate Load'
                                      : 'Active Slot'}
                                  </span>
                                </span>
                                <span className="font-mono ml-1 flex-shrink-0">
                                  {slotCandidates.length}/{maxCapacity} Active
                                </span>
                              </div>
                            ) : (
                              slotCandidates.length > 1 && (
                                <div className="flex items-center justify-between text-[9px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800/60">
                                  <span>⚡ Parallel Slot</span>
                                  <span className="font-mono">{slotCandidates.length}/{maxCapacity} Active</span>
                                </div>
                              )
                            )}

                            {/* Render Each Scheduled Candidate in this Slot */}
                            {slotCandidates.map((candidate) => {
                              const geo = detectCandidateGeo(candidate);
                              const duration = candidate.durationMinutes || 45;
                              const track = getTrackById(candidate.trackId);
                              const conflicts = findSlotConflicts(
                                candidate.suggestedPktTime,
                                duration,
                                candidates,
                                candidate.id,
                                candidate.trackId,
                                candidate.interviewerEmails
                              );
                              const hasConflict = conflicts.length > 0;
                              const sc = candidate.scorecard;
                              const isHighlighted = candidate.id === highlightCandidateId;

                              return (
                                <div
                                  key={candidate.id}
                                  id={`calendar-candidate-${candidate.id}`}
                                  className={`p-2 rounded-xl text-xs shadow-xs border transition-all hover:shadow-md ${
                                    isHighlighted
                                      ? 'ring-3 ring-indigo-500 shadow-md bg-indigo-50/40 dark:bg-indigo-950/40 border-indigo-500 animate-pulse'
                                      : hasConflict
                                      ? 'bg-rose-500/15 border-rose-500/40 text-rose-900 dark:text-rose-200 ring-2 ring-rose-400/30'
                                      : candidate.status === 'Selected'
                                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-900 dark:text-emerald-200'
                                      : candidate.status === 'Interviewed'
                                      ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-900 dark:text-indigo-200'
                                      : candidate.status === 'Pending'
                                      ? 'bg-amber-500/10 border-dashed border-amber-500/40 text-amber-900 dark:text-amber-200'
                                      : `${colors.cardBg} ${colors.border} ${colors.textPrimary}`
                                  }`}
                                >
                                  {/* Conflict Warning Indicator */}
                                  {hasConflict && (
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 mb-1">
                                      <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                                      <span>Conflict ({conflicts[0]?.details || 'Overlap'})</span>
                                    </div>
                                  )}

                                  {/* Track & Time Info Header */}
                                  <div className="flex items-center justify-between gap-1 mb-1">
                                    <span
                                      className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${track.badgeBg} ${track.badgeBorder}`}
                                      title={track.name}
                                    >
                                      {track.shortCode}
                                    </span>
                                    
                                    {/* Status Badge */}
                                    <span
                                      className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                                        candidate.status === 'Selected'
                                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300'
                                          : candidate.status === 'Interviewed'
                                          ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-300'
                                          : candidate.status === 'Pending'
                                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-dashed border-amber-300'
                                          : candidate.status === 'Rescheduled'
                                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300'
                                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300'
                                      }`}
                                    >
                                      {candidate.status === 'Pending' ? 'Tentative' : candidate.status}
                                    </span>

                                    <span className={`text-[10px] font-mono font-semibold ${colors.subtleBg} px-1.5 py-0.2 rounded ${colors.textSecondary} border ${colors.borderLight}`}>
                                      {duration}m
                                    </span>
                                  </div>

                                  {/* Candidate Info */}
                                  <div className="flex items-center justify-between gap-1">
                                    <div className="font-bold truncate text-[11px] flex items-center gap-1">
                                      <span>{geo.flag}</span>
                                      <span className="truncate">{candidate.name}</span>
                                    </div>
                                  </div>

                                  <div className={`text-[10px] ${colors.textSecondary} truncate mt-0.5 font-medium flex items-center justify-between`}>
                                    <span className="truncate">{candidate.position || 'Applicant'}</span>
                                    {candidate.hiringRound && (
                                      <span className="text-[9px] font-semibold text-indigo-600 dark:text-indigo-400 shrink-0 ml-1">
                                        {candidate.hiringRound}
                                      </span>
                                    )}
                                  </div>

                                  {/* Scorecard recommendation badge */}
                                  {sc && (
                                    <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                      <Award className="w-3 h-3" />
                                      <span>★ {sc.overallRating} • {sc.recommendation}</span>
                                    </div>
                                  )}

                                  {/* Quick Stage Progression Dropdown (Pipeline Link directly on Calendar) */}
                                  {onStatusChange && candidate.id && (
                                    <div className="mt-1.5 pt-1 border-t border-stone-200/40 dark:border-stone-700/40 flex items-center justify-between gap-1">
                                      <span className="text-[9px] text-stone-400 font-semibold uppercase">Stage:</span>
                                      <select
                                        value={candidate.status}
                                        onChange={(e) => onStatusChange(candidate.id!, e.target.value as Candidate['status'])}
                                        className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-stone-200 dark:border-stone-700 bg-white/90 dark:bg-stone-800 text-stone-800 dark:text-stone-200 cursor-pointer"
                                      >
                                        <option value="Scheduled">Scheduled</option>
                                        <option value="Interviewed">Interviewed</option>
                                        <option value="Selected">Selected</option>
                                        <option value="Rescheduled">Rescheduled</option>
                                        <option value="Pending">Pending</option>
                                      </select>
                                    </div>
                                  )}

                                  {/* Interactive Quick Action Buttons */}
                                  <div className="mt-1.5 flex items-center gap-1 pt-1 border-t border-stone-200/50 dark:border-stone-700/50">
                                    {candidate.meetLink && (
                                      <a
                                        href={candidate.meetLink}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                                        title="Join Google Meet"
                                      >
                                        <Video className="w-3 h-3" />
                                      </a>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => onOpenReminder(candidate)}
                                      className="p-1 rounded bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 hover:bg-amber-200 transition-colors cursor-pointer"
                                      title="Send 1-Click Reminder"
                                    >
                                      <Bell className="w-3 h-3" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => onOpenScorecard(candidate)}
                                      className="p-1 rounded bg-indigo-100 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300 hover:bg-indigo-200 transition-colors cursor-pointer"
                                      title="Open Scorecard / Evaluation"
                                    >
                                      <Award className="w-3 h-3" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => onOpenWhatsApp(candidate)}
                                      className="p-1 rounded bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 transition-colors cursor-pointer"
                                      title="WhatsApp Schedule"
                                    >
                                      <MessageCircle className="w-3 h-3 fill-current" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => onScheduleCandidate(candidate)}
                                      className="ml-auto text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                                    >
                                      Edit / Reschedule
                                    </button>
                                  </div>
                                </div>
                              );
                            })}

                            {/* Add Parallel Track Button if room remains in this slot */}
                            {slotCandidates.length < maxCapacity && (
                              <button
                                type="button"
                                onClick={() => openSlotBooking(slotDate)}
                                className="w-full py-1 px-1 rounded-lg border border-dashed border-indigo-300 dark:border-indigo-700/60 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300 text-[10px] font-semibold flex items-center justify-center gap-1 hover:bg-indigo-100/70 transition-colors cursor-pointer"
                                title={`Schedule another concurrent interview at ${hour}:00 (${maxCapacity - slotCandidates.length} tracks free)`}
                              >
                                <Plus className="w-3 h-3" />
                                <span>+ Add Parallel ({maxCapacity - slotCandidates.length} free)</span>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                  </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick Empty Slot Booking Modal */}
      {slotToBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-auto">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 bg-gradient-to-r from-amber-50 to-indigo-50/50 dark:from-amber-950/30 dark:to-indigo-950/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-600/20">
                  <CalendarPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                    Book Calendar Slot
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Directly assign candidate &amp; reserve multi-track interview slot
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSlotToBook(null)}
                className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Time Indicator Card */}
            <div className="p-5 space-y-4">
              <div className="p-3 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs space-y-1.5">
                <div className="flex items-center justify-between font-semibold text-amber-950 dark:text-amber-200">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    Slot Time (PKT / UTC+5):
                  </span>
                  <span className="font-mono font-bold">
                    {formatPktDateTime(slotToBook.toISOString())}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-stone-600 dark:text-stone-400">
                  <span>Your Browser Local Time:</span>
                  <span className="font-mono">
                    {formatLocalDateTime(slotToBook.toISOString())}
                  </span>
                </div>
              </div>

              {/* Multi-Track / Virtual Room Allocation for this slot */}
              {(() => {
                const dayPkt = getPktDateComponents(slotToBook)!;
                const inSlot = scheduledCandidates.filter((c) => {
                  if (!c.suggestedPktTime) return false;
                  const cPkt = getPktDateComponents(c.suggestedPktTime);
                  return (
                    cPkt &&
                    cPkt.year === dayPkt.year &&
                    cPkt.month === dayPkt.month &&
                    cPkt.date === dayPkt.date &&
                    cPkt.hour === dayPkt.hour
                  );
                });
                const occupiedMap = new Map<string, Candidate>();
                inSlot.forEach((c) => {
                  occupiedMap.set(c.trackId || 'track-alpha', c);
                });

                return (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-stone-800 dark:text-stone-200 uppercase tracking-wider flex items-center justify-between">
                      <span>Select Track / Virtual Room</span>
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold lowercase">
                        {maxCapacity - inSlot.length}/{maxCapacity} tracks free
                      </span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {DEFAULT_INTERVIEW_TRACKS.map((t) => {
                        const occupyingCand = occupiedMap.get(t.id);
                        const isOccupied = Boolean(occupyingCand);
                        const isSelected = selectedTrackId === t.id;

                        return (
                          <button
                            key={t.id}
                            type="button"
                            disabled={isOccupied}
                            onClick={() => setSelectedTrackId(t.id)}
                            className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                              isOccupied
                                ? 'bg-stone-100 dark:bg-stone-800/40 border-stone-200 dark:border-stone-800 opacity-60 cursor-not-allowed'
                                : isSelected
                                ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-500 shadow-2xs ring-2 ring-indigo-400/30'
                                : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 hover:border-indigo-300'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-0.5">
                              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${t.badgeBg} ${t.badgeBorder}`}>
                                {t.shortCode}
                              </span>
                              {isOccupied ? (
                                <span className="text-[9px] font-bold text-rose-600 dark:text-rose-400">
                                  Occupied
                                </span>
                              ) : isSelected ? (
                                <span className="text-[9px] font-bold text-indigo-700 dark:text-indigo-300">
                                  Selected
                                </span>
                              ) : (
                                <span className="text-[9px] font-medium text-emerald-600 dark:text-emerald-400">
                                  Free
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] font-bold text-stone-800 dark:text-stone-200 truncate">
                              {t.panelName}
                            </div>
                            {occupyingCand && (
                              <div className="text-[9px] text-stone-400 truncate mt-0.5">
                                by {occupyingCand.name}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Option 1: Select an existing candidate */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-800 dark:text-stone-200 uppercase tracking-wider">
                    Select Candidate to Assign
                  </label>
                  <div className="flex items-center gap-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setCandidateFilterScope('awaiting')}
                      className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                        candidateFilterScope === 'awaiting'
                          ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 font-bold'
                          : 'text-stone-500 hover:text-stone-800'
                      }`}
                    >
                      Awaiting ({candidates.filter((c) => c.status === 'Pending' || c.status === 'Rescheduled').length})
                    </button>
                    <span>|</span>
                    <button
                      type="button"
                      onClick={() => setCandidateFilterScope('all')}
                      className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                        candidateFilterScope === 'all'
                          ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-200 font-bold'
                          : 'text-stone-500 hover:text-stone-800'
                      }`}
                    >
                      All ({candidates.filter((c) => c.status !== 'Rejected').length})
                    </button>
                  </div>
                </div>

                {(() => {
                  const eligibleCandidates =
                    candidateFilterScope === 'awaiting'
                      ? candidates.filter((c) => c.status === 'Pending' || c.status === 'Rescheduled')
                      : candidates.filter((c) => c.status !== 'Rejected');

                  if (eligibleCandidates.length === 0) {
                    return (
                      <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 text-xs text-stone-600 dark:text-stone-400 text-center">
                        No candidates found in this scope.
                      </div>
                    );
                  }

                  return (
                    <select
                      value={selectedCandidateId}
                      onChange={(e) => setSelectedCandidateId(e.target.value)}
                      className="w-full border border-stone-300 dark:border-stone-700 rounded-xl p-2.5 text-xs bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="">-- Choose Candidate from Pipeline --</option>
                      {eligibleCandidates.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} • {c.position || 'Applicant'} [{c.status}] ({c.hiringRound || 'Screening'})
                        </option>
                      ))}
                    </select>
                  );
                })()}

                {/* Primary Booking Actions: 1-Click Direct Book OR Full Google Meet Schedule */}
                <div className="space-y-2 pt-1">
                  {onDirectBookSlot && (
                    <button
                      type="button"
                      disabled={!selectedCandidateId || isBookingDirect}
                      onClick={async () => {
                        if (!selectedCandidateId || !slotToBook) return;
                        setIsBookingDirect(true);
                        try {
                          await onDirectBookSlot(selectedCandidateId, slotToBook.toISOString(), selectedTrackId);
                          setSlotToBook(null);
                        } finally {
                          setIsBookingDirect(false);
                        }
                      }}
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isBookingDirect ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Directly Booking Slot...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4" />
                          <span>1-Click Direct Book Slot</span>
                        </>
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={!selectedCandidateId}
                    onClick={() => {
                      const candidate = candidates.find((c) => c.id === selectedCandidateId);
                      if (candidate) {
                        onScheduleCandidate({
                          ...candidate,
                          suggestedPktTime: slotToBook.toISOString(),
                          trackId: selectedTrackId,
                          trackName: getTrackById(selectedTrackId).name,
                        });
                        setSlotToBook(null);
                      }
                    }}
                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Video className="w-4 h-4" />
                    <span>Schedule with Google Meet &amp; Email Invite</span>
                  </button>
                </div>
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-stone-200 dark:border-stone-800"></div>
                <span className="flex-shrink mx-3 text-stone-400 text-[10px] uppercase tracking-wider font-semibold">
                  Or
                </span>
                <div className="flex-grow border-t border-stone-200 dark:border-stone-800"></div>
              </div>

              {/* Option 2: Add New Candidate Profile at this Slot */}
              <button
                type="button"
                onClick={() => {
                  if (onAddNewCandidateAtSlot) {
                    onAddNewCandidateAtSlot(slotToBook.toISOString(), selectedTrackId);
                  }
                  setSlotToBook(null);
                }}
                className="w-full py-2.5 px-4 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-bold rounded-xl transition-all border border-stone-300 dark:border-stone-700 flex items-center justify-center gap-2 cursor-pointer"
              >
                <UserPlus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>+ Add New Candidate Profile for this Slot</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
