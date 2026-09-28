import React, { useState } from 'react';
import { Candidate, HiringRound } from '../types';
import { useTheme } from '../lib/theme';
import {
  X,
  Award,
  Star,
  Globe,
  Clock,
  Briefcase,
  CheckCircle2,
  CalendarPlus,
  ArrowRight,
  Printer,
  ChevronRight,
} from 'lucide-react';
import { formatPktDateTime } from '../lib/date-utils';
import { getAvatarGradient, getInitials, detectCandidateGeo } from '../lib/geo-utils';
import { getTrackById } from '../lib/track-constants';

interface CandidateComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: Candidate[];
  allCandidates?: Candidate[];
  initialCandidateIds?: string[];
  onSchedule?: (candidate: Candidate) => void;
  onScheduleCandidate?: (candidate: Candidate) => void;
  onScorecard?: (candidate: Candidate) => void;
  onScorecardCandidate?: (candidate: Candidate) => void;
  onAdvanceRound?: (candidateId: string, nextRound: HiringRound) => void;
}

const HIRING_ROUNDS: HiringRound[] = [
  'Screening',
  'Technical Round 1',
  'Technical Round 2',
  'Management / HR',
  'Final Offer',
];

export const CandidateComparisonModal: React.FC<CandidateComparisonModalProps> = ({
  isOpen,
  onClose,
  candidates: initialCandidates,
  allCandidates,
  initialCandidateIds,
  onSchedule,
  onScheduleCandidate,
  onScorecard,
  onScorecardCandidate,
  onAdvanceRound,
}) => {
  const { colors } = useTheme();

  const scheduleHandler = onSchedule || onScheduleCandidate || (() => {});
  const scorecardHandler = onScorecard || onScorecardCandidate || (() => {});
  const advanceHandler = onAdvanceRound || (() => {});

  // Determine active compared candidates
  const [activeCandidates, setActiveCandidates] = useState<Candidate[]>(() => {
    if (initialCandidateIds && initialCandidateIds.length > 0 && allCandidates) {
      const matched = allCandidates.filter((c) => c.id && initialCandidateIds.includes(c.id));
      if (matched.length > 0) return matched;
    }
    return initialCandidates.length > 0 ? initialCandidates : (allCandidates ? allCandidates.slice(0, 4) : []);
  });

  // Sync active candidates whenever the modal opens or compared list changes
  React.useEffect(() => {
    if (isOpen) {
      if (initialCandidateIds && initialCandidateIds.length > 0 && allCandidates) {
        const matched = allCandidates.filter((c) => c.id && initialCandidateIds.includes(c.id));
        if (matched.length > 0) {
          setActiveCandidates(matched);
          return;
        }
      }
      if (initialCandidates && initialCandidates.length > 0) {
        setActiveCandidates(initialCandidates);
      } else if (allCandidates && allCandidates.length > 0) {
        setActiveCandidates(allCandidates.slice(0, 4));
      }
    }
  }, [isOpen, initialCandidateIds, initialCandidates, allCandidates]);

  if (!isOpen || activeCandidates.length === 0) return null;

  const candidates = activeCandidates;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div
        className={`bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto`}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-stone-200 dark:border-stone-800 bg-amber-50/50 dark:bg-stone-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`text-lg font-bold font-display ${colors.textPrimary}`}>
                Candidate Side-by-Side Comparison Matrix
              </h2>
              <p className={`text-xs ${colors.textSecondary}`}>
                Comparing {candidates.length} shortlisted candidates across scorecards, technical ratings, and pipeline stages.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${colors.subtleBg} ${colors.border} ${colors.textSecondary} hover:${colors.textPrimary}`}
              title="Print or Save PDF Comparison"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`p-2 rounded-xl text-stone-400 hover:${colors.textPrimary} hover:${colors.subtleBg} transition-colors cursor-pointer`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Comparison Matrix Table */}
        <div className="p-6 flex-1 overflow-x-auto overflow-y-auto">
          <div className="min-w-[700px]">
            {/* Candidate Header Cards */}
            <div
              className="grid gap-4 pb-6 border-b border-stone-200 dark:border-stone-800"
              style={{ gridTemplateColumns: `repeat(${candidates.length}, minmax(220px, 1fr))` }}
            >
              {candidates.map((c) => {
                const avatarGrad = getAvatarGradient(c.name);
                const initials = getInitials(c.name);
                const geo = detectCandidateGeo(c);
                const currentRound = c.hiringRound || 'Screening';
                const nextRoundIdx = HIRING_ROUNDS.indexOf(currentRound) + 1;
                const nextRound = HIRING_ROUNDS[nextRoundIdx];

                return (
                  <div
                    key={c.id || c.name}
                    className={`p-4 rounded-2xl border ${colors.cardBg} ${colors.border} shadow-xs space-y-3`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${avatarGrad} text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0`}
                      >
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className={`text-sm font-bold font-display ${colors.textPrimary} truncate`}>
                          {c.name}
                        </h3>
                        <p className={`text-xs ${colors.textSecondary} truncate`}>
                          {c.position || 'Software Engineer'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium">
                        {geo.flag} {c.country || geo.country}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-500/20">
                        {currentRound}
                      </span>
                      {c.trackId && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getTrackById(c.trackId).badgeBg} ${getTrackById(c.trackId).badgeBorder}`}
                          title={c.trackName || getTrackById(c.trackId).name}
                        >
                          {getTrackById(c.trackId).shortCode}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => scorecardHandler(c)}
                        className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold border ${colors.subtleBg} ${colors.border} ${colors.textPrimary} hover:brightness-95 text-center cursor-pointer`}
                      >
                        Scorecard
                      </button>
                      {nextRound && c.id ? (
                        <button
                          type="button"
                          onClick={() => advanceHandler(c.id!, nextRound)}
                          className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold text-white ${colors.accentBg} ${colors.accentHover} text-center cursor-pointer`}
                          title={`Advance to ${nextRound}`}
                        >
                          Next Round
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => scheduleHandler(c)}
                          className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold border ${colors.subtleBg} ${colors.border} ${colors.accentText} hover:brightness-95 text-center cursor-pointer`}
                        >
                          Schedule
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Matrix Rows */}
            <div className="divide-y divide-stone-200 dark:divide-stone-800 text-xs">
              {/* Row: Recommendation */}
              <div className="py-4">
                <div className={`font-bold uppercase tracking-wider text-[11px] ${colors.textSecondary} mb-2.5`}>
                  Evaluation Recommendation
                </div>
                <div
                  className="grid gap-4"
                  style={{ gridTemplateColumns: `repeat(${candidates.length}, minmax(220px, 1fr))` }}
                >
                  {candidates.map((c) => {
                    const rec = c.scorecard?.recommendation;
                    return (
                      <div key={c.id || c.name} className="flex items-center gap-2">
                        {rec ? (
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold border ${
                              rec === 'Strong Hire'
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                                : rec === 'Hire'
                                ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
                                : rec === 'On Hold'
                                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                                : 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30'
                            }`}
                          >
                            {rec}
                          </span>
                        ) : (
                          <span className="text-stone-400 italic">Not evaluated yet</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Row: Scorecard Ratings */}
              <div className="py-4">
                <div className={`font-bold uppercase tracking-wider text-[11px] ${colors.textSecondary} mb-2.5`}>
                  Interview Ratings (1 - 5)
                </div>
                <div
                  className="grid gap-4"
                  style={{ gridTemplateColumns: `repeat(${candidates.length}, minmax(220px, 1fr))` }}
                >
                  {candidates.map((c) => {
                    const sc = c.scorecard;
                    return (
                      <div key={c.id || c.name} className={`p-3 rounded-xl border ${colors.subtleBg} ${colors.border} space-y-2`}>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className={colors.textSecondary}>Technical:</span>
                          <span className="font-bold text-amber-700 dark:text-amber-400">
                            {sc?.technicalRating ? `${sc.technicalRating} / 5` : '—'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className={colors.textSecondary}>Communication:</span>
                          <span className="font-bold text-amber-700 dark:text-amber-400">
                            {sc?.communicationRating ? `${sc.communicationRating} / 5` : '—'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className={colors.textSecondary}>Problem Solving:</span>
                          <span className="font-bold text-amber-700 dark:text-amber-400">
                            {sc?.problemSolvingRating ? `${sc.problemSolvingRating} / 5` : '—'}
                          </span>
                        </div>
                        <div className="pt-1.5 border-t border-stone-200 dark:border-stone-800 flex justify-between items-center text-xs font-bold">
                          <span>Overall Score:</span>
                          <span className="text-amber-600 dark:text-amber-300">
                            {sc?.overallRating ? `${sc.overallRating} / 5` : '—'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Row: AI Resume Rating & Skills */}
              <div className="py-4">
                <div className={`font-bold uppercase tracking-wider text-[11px] ${colors.textSecondary} mb-2.5`}>
                  Skills &amp; AI Resume Analysis
                </div>
                <div
                  className="grid gap-4"
                  style={{ gridTemplateColumns: `repeat(${candidates.length}, minmax(220px, 1fr))` }}
                >
                  {candidates.map((c) => (
                    <div key={c.id || c.name} className="space-y-2">
                      {c.aiRating && (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span>AI Resume Score: {c.aiRating} / 10</span>
                        </div>
                      )}
                      <p className={`text-xs ${colors.textPrimary} font-medium leading-relaxed line-clamp-3`}>
                        {c.aiSummary || c.notes || 'No summary available.'}
                      </p>
                      {c.aiSkills && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {c.aiSkills
                            .split(',')
                            .slice(0, 5)
                            .map((skill, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-[10px] font-semibold text-stone-700 dark:text-stone-300"
                              >
                                {skill.trim()}
                              </span>
                            ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Row: Interviewer Notes */}
              <div className="py-4">
                <div className={`font-bold uppercase tracking-wider text-[11px] ${colors.textSecondary} mb-2.5`}>
                  Interviewer Notes
                </div>
                <div
                  className="grid gap-4"
                  style={{ gridTemplateColumns: `repeat(${candidates.length}, minmax(220px, 1fr))` }}
                >
                  {candidates.map((c) => (
                    <div key={c.id || c.name} className={`p-3 rounded-xl border ${colors.subtleBg} ${colors.border} text-xs italic ${colors.textSecondary}`}>
                      "{c.scorecard?.interviewerNotes || 'No notes added yet.'}"
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className={`px-5 py-2 rounded-xl text-xs font-bold text-white ${colors.accentBg} ${colors.accentHover} shadow-xs cursor-pointer`}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
