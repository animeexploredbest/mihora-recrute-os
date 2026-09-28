import React, { useMemo } from 'react';
import { Candidate } from '../types';
import { useTheme } from '../lib/theme';
import { exportCandidatesToCsv, printCandidateSummaryReport } from '../lib/export-utils';
import {
  BarChart3,
  Users,
  Calendar,
  Clock,
  Globe,
  Award,
  Download,
  Printer,
  MessageCircle,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  FileSpreadsheet,
  Layers,
  Star,
  MapPin,
} from 'lucide-react';
import { detectCandidateGeo } from '../lib/geo-utils';

interface AnalyticsViewProps {
  candidates: Candidate[];
  onOpenWhatsAppSummary: () => void;
  onOpenBulkImport: () => void;
  onOpenCandidateModal: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  candidates,
  onOpenWhatsAppSummary,
  onOpenBulkImport,
  onOpenCandidateModal,
}) => {
  const { colors } = useTheme();

  // Core metrics derived in real-time from Firestore candidates
  const metrics = useMemo(() => {
    const total = candidates.length;
    const scheduled = candidates.filter((c) => c.status === 'Scheduled').length;
    const pending = candidates.filter((c) => c.status === 'Pending').length;
    const interviewed = candidates.filter((c) => c.status === 'Interviewed').length;
    const selected = candidates.filter((c) => c.status === 'Selected').length;
    const rejected = candidates.filter((c) => c.status === 'Rejected').length;
    const rescheduled = candidates.filter((c) => c.status === 'Rescheduled').length;

    // Distinct countries
    const countriesSet = new Set<string>();
    const countryCounts: Record<string, { count: number; flag: string }> = {};

    candidates.forEach((c) => {
      const geo = detectCandidateGeo(c);
      const country = c.country || geo.country;
      countriesSet.add(country);
      if (!countryCounts[country]) {
        countryCounts[country] = { count: 0, flag: geo.flag };
      }
      countryCounts[country].count += 1;
    });

    const sortedCountries = Object.entries(countryCounts)
      .map(([country, data]) => ({ country, count: data.count, flag: data.flag }))
      .sort((a, b) => b.count - a.count);

    // Scorecards breakdown
    const evaluated = candidates.filter((c) => Boolean(c.scorecard));
    const avgRating =
      evaluated.length > 0
        ? (
            evaluated.reduce((acc, c) => acc + (c.scorecard?.overallRating || 0), 0) /
            evaluated.length
          ).toFixed(1)
        : '0.0';

    const strongHireCount = evaluated.filter(
      (c) => c.scorecard?.recommendation === 'Strong Hire'
    ).length;
    const hireCount = evaluated.filter((c) => c.scorecard?.recommendation === 'Hire').length;
    const holdCount = evaluated.filter((c) => c.scorecard?.recommendation === 'Hold').length;
    const rejectScoreCount = evaluated.filter(
      (c) => c.scorecard?.recommendation === 'Reject'
    ).length;

    const withMeetLink = candidates.filter((c) => Boolean(c.meetLink)).length;
    const withWhatsAppDispatched = candidates.filter((c) => Boolean(c.lastWhatsAppSentAt)).length;

    return {
      total,
      scheduled,
      pending,
      interviewed,
      selected,
      rejected,
      rescheduled,
      countriesCount: countriesSet.size,
      sortedCountries,
      evaluatedCount: evaluated.length,
      avgRating,
      strongHireCount,
      hireCount,
      holdCount,
      rejectScoreCount,
      withMeetLink,
      withWhatsAppDispatched,
    };
  }, [candidates]);

  const pipelineStages = [
    { label: 'Pending Review', count: metrics.pending, color: 'bg-amber-500', textColor: 'text-amber-700 dark:text-amber-300' },
    { label: 'Scheduled in PKT', count: metrics.scheduled, color: 'bg-blue-500', textColor: 'text-blue-700 dark:text-blue-300' },
    { label: 'Rescheduled', count: metrics.rescheduled, color: 'bg-orange-500', textColor: 'text-orange-700 dark:text-orange-300' },
    { label: 'Interviewed', count: metrics.interviewed, color: 'bg-indigo-500', textColor: 'text-indigo-700 dark:text-indigo-300' },
    { label: 'Selected / Offer', count: metrics.selected, color: 'bg-emerald-500', textColor: 'text-emerald-700 dark:text-emerald-300' },
    { label: 'Rejected / Archived', count: metrics.rejected, color: 'bg-rose-500', textColor: 'text-rose-700 dark:text-rose-300' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Overview Header Banner with Quick Report Actions */}
      <div
        className={`p-5 sm:p-6 rounded-2xl border transition-all ${colors.cardBg} flex flex-col md:flex-row md:items-center justify-between gap-4`}
      >
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`text-lg sm:text-xl font-bold font-display ${colors.textPrimary}`}>
                Recruitment Analytics & Executive Intelligence
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/25">
                Realtime Firestore
              </span>
            </div>
            <p className={`text-xs ${colors.textSecondary} mt-0.5`}>
              Consolidated metrics, hiring funnel conversion, interview scorecard distribution, and global reach.
            </p>
          </div>
        </div>

        {/* Action Buttons for reports */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => exportCandidatesToCsv(candidates)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border ${colors.border} ${colors.subtleBg} ${colors.textPrimary} hover:brightness-95 transition-all shadow-xs cursor-pointer`}
            title="Download full candidate roster as CSV"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => printCandidateSummaryReport(candidates)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border ${colors.border} ${colors.subtleBg} ${colors.textPrimary} hover:brightness-95 transition-all shadow-xs cursor-pointer`}
            title="Print or Save PDF Executive Report"
          >
            <Printer className="w-3.5 h-3.5 text-indigo-600" />
            <span>Executive PDF</span>
          </button>

          <button
            type="button"
            onClick={onOpenWhatsAppSummary}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-all shadow-xs cursor-pointer"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>WhatsApp Digest</span>
          </button>
        </div>
      </div>

      {/* 4 Core Executive Telemetry Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Metric 1 */}
        <div className={`p-5 rounded-2xl border transition-all ${colors.cardBg}`}>
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${colors.textSecondary}`}>
              Total Pipeline
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${colors.subtleBg} ${colors.accentText}`}>
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-2xl sm:text-3xl font-extrabold font-display tracking-tight ${colors.textPrimary}`}>
              {metrics.total}
            </span>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Active
            </span>
          </div>
          <p className={`text-[11px] ${colors.textMuted} mt-1.5 font-medium`}>
            All candidate profiles in database
          </p>
        </div>

        {/* Metric 2 */}
        <div className={`p-5 rounded-2xl border transition-all ${colors.cardBg}`}>
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${colors.textSecondary}`}>
              Scheduled (PKT)
            </span>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-2xl sm:text-3xl font-extrabold font-display tracking-tight ${colors.textPrimary}`}>
              {metrics.scheduled}
            </span>
            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
              UTC+5
            </span>
          </div>
          <p className={`text-[11px] ${colors.textMuted} mt-1.5 font-medium`}>
            {metrics.withMeetLink} with Google Meet links
          </p>
        </div>

        {/* Metric 3 */}
        <div className={`p-5 rounded-2xl border transition-all ${colors.cardBg}`}>
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${colors.textSecondary}`}>
              Awaiting Slots
            </span>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-2xl sm:text-3xl font-extrabold font-display tracking-tight ${colors.textPrimary}`}>
              {metrics.pending}
            </span>
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              Action Required
            </span>
          </div>
          <p className={`text-[11px] ${colors.textMuted} mt-1.5 font-medium`}>
            Candidates pending interviewer slots
          </p>
        </div>

        {/* Metric 4 */}
        <div className={`p-5 rounded-2xl border transition-all ${colors.cardBg}`}>
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${colors.textSecondary}`}>
              Global Reach
            </span>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-2xl sm:text-3xl font-extrabold font-display tracking-tight ${colors.textPrimary}`}>
              {metrics.countriesCount}
            </span>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Countries
            </span>
          </div>
          <p className={`text-[11px] ${colors.textMuted} mt-1.5 font-medium`}>
            Converted to PKT timezone
          </p>
        </div>
      </div>

      {/* Row 2: Pipeline Funnel + Scorecards Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Pipeline Funnel Distribution */}
        <div className={`p-5 sm:p-6 rounded-2xl border ${colors.cardBg} space-y-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-600" />
              <h3 className={`font-bold font-display text-sm sm:text-base ${colors.textPrimary}`}>
                Candidate Pipeline Funnel
              </h3>
            </div>
            <span className={`text-xs ${colors.textSecondary} font-medium`}>
              {metrics.total} Total
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {pipelineStages.map((stage) => {
              const pct = metrics.total > 0 ? Math.round((stage.count / metrics.total) * 100) : 0;
              return (
                <div key={stage.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-semibold ${colors.textPrimary}`}>{stage.label}</span>
                    <span className="font-mono text-stone-500 font-bold">
                      {stage.count} <span className="font-normal opacity-70">({pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${stage.color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Evaluation Scorecards & Decision Metrics */}
        <div className={`p-5 sm:p-6 rounded-2xl border ${colors.cardBg} space-y-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-600" />
              <h3 className={`font-bold font-display text-sm sm:text-base ${colors.textPrimary}`}>
                Interview Scorecards &amp; Feedback
              </h3>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25">
              {metrics.evaluatedCount} Evaluated
            </span>
          </div>

          {/* Average Rating Highlight */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className={`p-3.5 rounded-xl border ${colors.subtleBg} ${colors.borderLight} text-center space-y-1`}>
              <div className="flex items-center justify-center gap-1 text-amber-500">
                <Star className="w-4 h-4 fill-amber-400" />
                <span className="text-xl sm:text-2xl font-extrabold font-display">
                  {metrics.avgRating}
                </span>
                <span className="text-xs text-stone-400">/ 5.0</span>
              </div>
              <p className={`text-[11px] font-semibold ${colors.textSecondary}`}>
                Avg. Candidate Rating
              </p>
            </div>

            <div className={`p-3.5 rounded-xl border ${colors.subtleBg} ${colors.borderLight} text-center space-y-1`}>
              <div className="flex items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xl sm:text-2xl font-extrabold font-display">
                  {metrics.strongHireCount + metrics.hireCount}
                </span>
              </div>
              <p className={`text-[11px] font-semibold ${colors.textSecondary}`}>
                Hire Recommendations
              </p>
            </div>
          </div>

          {/* Recommendation Breakdown Badges */}
          <div className="space-y-2 pt-2">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${colors.textSecondary} block`}>
              Recommendation Breakdown
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
                <span className="block font-bold text-sm">{metrics.strongHireCount}</span>
                <span className="text-[10px] font-semibold">Strong Hire</span>
              </div>
              <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300">
                <span className="block font-bold text-sm">{metrics.hireCount}</span>
                <span className="text-[10px] font-semibold">Hire</span>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300">
                <span className="block font-bold text-sm">{metrics.holdCount}</span>
                <span className="text-[10px] font-semibold">Hold</span>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300">
                <span className="block font-bold text-sm">{metrics.rejectScoreCount}</span>
                <span className="text-[10px] font-semibold">Reject</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Country Talent Distribution */}
      <div className={`p-5 sm:p-6 rounded-2xl border ${colors.cardBg} space-y-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-600" />
            <h3 className={`font-bold font-display text-sm sm:text-base ${colors.textPrimary}`}>
              Candidate Geographic Distribution (All auto-aligned with PKT)
            </h3>
          </div>
          <span className={`text-xs ${colors.textSecondary} font-semibold`}>
            {metrics.sortedCountries.length} active zones
          </span>
        </div>

        {metrics.sortedCountries.length === 0 ? (
          <p className={`text-xs ${colors.textMuted} py-4 text-center`}>No candidate locations recorded yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {metrics.sortedCountries.map((item) => (
              <div
                key={item.country}
                className={`p-3 rounded-xl border ${colors.subtleBg} ${colors.borderLight} flex items-center justify-between gap-2`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-base">{item.flag}</span>
                  <span className={`text-xs font-semibold truncate ${colors.textPrimary}`}>
                    {item.country}
                  </span>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200 shrink-0">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
