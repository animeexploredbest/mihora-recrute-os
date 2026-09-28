import React, { useState, useRef, useEffect } from 'react';
import { Candidate, HiringRound } from '../types';
import { useTheme } from '../lib/theme';
import {
  Calendar,
  Clock,
  Video,
  CalendarClock,
  CalendarPlus,
  Award,
  Bell,
  MessageCircle,
  Edit,
  Trash2,
  AlertTriangle,
  FileText,
  Linkedin,
  Github,
  ExternalLink,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  History,
  Download,
  Link,
  FastForward,
  Globe,
  Users,
  MoreHorizontal,
} from 'lucide-react';
import { formatPktDateTime, formatLocalDateTime, formatRelativeTime, isInterviewPast } from '../lib/date-utils';
import { detectCandidateGeo, getAvatarGradient, getInitials } from '../lib/geo-utils';
import { downloadIcsFile } from '../lib/ics-utils';
import { evaluateCandidateWorkingHours, getDiffFromPktDetailed, formatInTimezone } from '../lib/timezone-utils';
import { getTrackById } from '../lib/track-constants';

interface CandidateRowCardProps {
  candidate: Candidate;
  density: 'compact' | 'detailed';
  isSelected: boolean;
  hasConflict: boolean;
  onToggleSelect: (id: string) => void;
  onSchedule: (candidate: Candidate) => void;
  onScorecard: (candidate: Candidate) => void;
  onReminder: (candidate: Candidate) => void;
  onWhatsApp: (candidate: Candidate) => void;
  onEdit: (candidate: Candidate) => void;
  onDelete: (candidate: Candidate) => void;
  onStatusChange: (id: string, newStatus: Candidate['status']) => void;
  onTimeline?: (candidate: Candidate) => void;
  onSelfBooking?: (candidate: Candidate) => void;
  onAdvanceRound?: (candidateId: string, nextRound: HiringRound) => void;
  onViewInCalendar?: (candidate: Candidate) => void;
}

export const CandidateRowCard: React.FC<CandidateRowCardProps> = ({
  candidate,
  density,
  isSelected,
  hasConflict,
  onToggleSelect,
  onSchedule,
  onScorecard,
  onReminder,
  onWhatsApp,
  onEdit,
  onDelete,
  onStatusChange,
  onTimeline,
  onSelfBooking,
  onAdvanceRound,
  onViewInCalendar,
}) => {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [detailedMoreOpen, setDetailedMoreOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const detailedMoreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setMoreOpen(false);
      }
      if (detailedMoreMenuRef.current && !detailedMoreMenuRef.current.contains(event.target as Node)) {
        setDetailedMoreOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const rel = formatRelativeTime(candidate.suggestedPktTime);
  const isPast = isInterviewPast(candidate.suggestedPktTime);
  const geo = detectCandidateGeo(candidate);
  const displayCountry = candidate.country || geo.country;
  const avatarGrad = getAvatarGradient(candidate.name);
  const initials = getInitials(candidate.name);
  const candidateTz = candidate.timezone || candidate.localTimezone || geo.timezone || 'Asia/Karachi';
  const workingHourEval = candidate.suggestedPktTime
    ? evaluateCandidateWorkingHours(candidate.suggestedPktTime, candidateTz)
    : null;

  const getStatusBadge = (status: Candidate['status']) => {
    switch (status) {
      case 'Scheduled':
        return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
      case 'Rescheduled':
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30';
      case 'Interviewed':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30';
      case 'Selected':
        return 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30';
      case 'Rejected':
        return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30';
      default:
        return 'bg-stone-500/10 text-stone-700 dark:text-stone-400 border-stone-500/30';
    }
  };

  // ----------------------------------------------------
  // COMPACT ROW VIEW (De-crowded & high information density)
  // ----------------------------------------------------
  if (density === 'compact') {
    return (
      <div
        id={`candidate-row-${candidate.id}`}
        className={`rounded-xl border transition-all duration-150 ${colors.cardBg} ${colors.border} hover:shadow-sm ${
          isSelected ? 'ring-2 ring-indigo-500/40 border-indigo-400 bg-indigo-50/20 dark:bg-indigo-950/20' : ''
        }`}
      >
        <div className="p-3 sm:px-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Left section: Checkbox, Avatar, Name, Role, Flag, Status */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              type="button"
              onClick={() => candidate.id && onToggleSelect(candidate.id)}
              className="text-stone-400 hover:text-indigo-600 transition-colors cursor-pointer shrink-0"
            >
              {isSelected ? (
                <CheckSquare className="w-4 h-4 text-indigo-600" />
              ) : (
                <Square className="w-4 h-4 text-stone-300 dark:text-stone-600 hover:text-indigo-500" />
              )}
            </button>

            <div
              className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${avatarGrad} flex items-center justify-center font-display font-extrabold text-xs shadow-2xs shrink-0 tracking-wider`}
            >
              {initials}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className={`text-sm font-bold font-display ${colors.textPrimary} truncate`}>
                  {candidate.name}
                </h4>
                <span className={`text-[10px] px-2 py-0.2 rounded-full font-bold border ${getStatusBadge(candidate.status)}`}>
                  {candidate.status}
                </span>
                {candidate.hiringRound && (
                  <span className="text-[10px] px-2 py-0.2 rounded-full font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30">
                    {candidate.hiringRound}
                  </span>
                )}
                {candidate.trackId && (
                  <span
                    className={`text-[10px] px-2 py-0.2 rounded-full font-bold border ${getTrackById(candidate.trackId).badgeBg} ${getTrackById(candidate.trackId).badgeBorder}`}
                    title={candidate.trackName || getTrackById(candidate.trackId).name}
                  >
                    {getTrackById(candidate.trackId).shortCode}
                  </span>
                )}
                {candidate.assignedInterviewer && (
                  <span
                    className="text-[10px] px-2 py-0.2 rounded-full font-bold bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1"
                    title={`Assigned Interviewer: ${candidate.assignedInterviewer}`}
                  >
                    <Users className="w-2.5 h-2.5 text-amber-600" />
                    <span>{candidate.assignedInterviewer.split('@')[0]}</span>
                  </span>
                )}
                {hasConflict && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1">
                    <AlertTriangle className="w-2.5 h-2.5" /> Overlap
                  </span>
                )}
                {candidate.scorecard && (
                  <button
                    type="button"
                    onClick={() => onScorecard(candidate)}
                    className="text-[10px] px-2 py-0.2 rounded-full font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 flex items-center gap-1 cursor-pointer"
                  >
                    <Award className="w-2.5 h-2.5 text-indigo-600" />
                    <span>★ {candidate.scorecard.overallRating}/5</span>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400 mt-0.5 flex-wrap">
                <span className="font-medium text-stone-700 dark:text-stone-300">{candidate.position || 'Applicant'}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <span>{geo.flag}</span>
                  <span>{displayCountry}</span>
                </span>
                {candidate.suggestedPktTime && (
                  <>
                    <span>•</span>
                    <span className="font-mono text-amber-800 dark:text-amber-300 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                      <span>{formatPktDateTime(candidate.suggestedPktTime)}</span>
                    </span>
                    {onViewInCalendar && (
                      <button
                        type="button"
                        onClick={() => onViewInCalendar(candidate)}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-200 hover:underline flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 cursor-pointer"
                        title="Locate this candidate on Calendar & Slots"
                      >
                        <Calendar className="w-2.5 h-2.5" />
                        <span>Calendar</span>
                      </button>
                    )}
                    {workingHourEval && (
                      <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${workingHourEval.badgeColor}`}>
                        {workingHourEval.badgeText}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right section: Clean De-crowded Action buttons & dropdown */}
          <div className="flex items-center gap-2 shrink-0 justify-end flex-wrap pt-2 md:pt-0">
            {candidate.meetLink ? (
              <a
                href={candidate.meetLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition-all"
                title="Join Google Meet"
              >
                <Video className="w-3.5 h-3.5" />
                <span>Join Meet</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={() => onSchedule(candidate)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-2xs transition-all cursor-pointer ${colors.accentBg} ${colors.accentHover}`}
                title="Schedule Interview in PKT"
              >
                <CalendarPlus className="w-3.5 h-3.5" />
                <span>Schedule</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onScorecard(candidate)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-blue-600 ${colors.subtleBg} ${colors.border} transition-colors cursor-pointer`}
              title="Interview Scorecard"
            >
              <Award className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span className="hidden sm:inline">Scorecard</span>
            </button>

            <button
              type="button"
              onClick={() => onWhatsApp(candidate)}
              className="p-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer"
              title="Share on WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-current" />
            </button>

            {/* More Options Dropdown */}
            <div className="relative" ref={moreMenuRef}>
              <button
                type="button"
                onClick={() => setMoreOpen(!moreOpen)}
                className={`p-1.5 rounded-lg border text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white ${colors.subtleBg} ${colors.border} transition-colors cursor-pointer`}
                title="More Actions"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>

              {moreOpen && (
                <div
                  className={`absolute right-0 mt-2 w-56 rounded-xl p-1.5 border shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100 ${colors.cardBg} ${colors.border}`}
                >
                  {candidate.meetLink && (
                    <button
                      type="button"
                      onClick={() => {
                        setMoreOpen(false);
                        onSchedule(candidate);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-left rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                      <CalendarClock className="w-3.5 h-3.5 text-amber-500" />
                      <span>Reschedule Interview</span>
                    </button>
                  )}

                  {onViewInCalendar && candidate.suggestedPktTime && (
                    <button
                      type="button"
                      onClick={() => {
                        setMoreOpen(false);
                        onViewInCalendar(candidate);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-left rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                      <Calendar className="w-3.5 h-3.5 text-blue-500" />
                      <span>View Slot on Calendar</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setMoreOpen(false);
                      onReminder(candidate);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-left rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    <Bell className="w-3.5 h-3.5 text-amber-500" />
                    <span>Send Reminder</span>
                  </button>

                  {onSelfBooking && (
                    <button
                      type="button"
                      onClick={() => {
                        setMoreOpen(false);
                        onSelfBooking(candidate);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-left rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                      <Link className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Self-Booking Portal Link</span>
                    </button>
                  )}

                  {candidate.suggestedPktTime && (
                    <button
                      type="button"
                      onClick={() => {
                        setMoreOpen(false);
                        downloadIcsFile(candidate);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-left rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-400" />
                      <span>Download .ics Calendar</span>
                    </button>
                  )}

                  {onTimeline && (
                    <button
                      type="button"
                      onClick={() => {
                        setMoreOpen(false);
                        onTimeline(candidate);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-left rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                      <History className="w-3.5 h-3.5 text-purple-500" />
                      <span>Audit Trail &amp; History</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setMoreOpen(false);
                      onEdit(candidate);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-left rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5 text-slate-400" />
                    <span>Edit Candidate</span>
                  </button>

                  <div className="my-1 border-t border-slate-200 dark:border-slate-800" />

                  <button
                    type="button"
                    onClick={() => {
                      setMoreOpen(false);
                      onDelete(candidate);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-left rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    <span>Delete Candidate</span>
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className={`p-1.5 rounded-lg border text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 ${colors.subtleBg} ${colors.border} transition-colors cursor-pointer`}
              title={expanded ? 'Collapse profile details' : 'Expand full profile & links'}
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Expanded Drawer in Compact View */}
        {expanded && (
          <div className={`p-3.5 sm:px-5 border-t text-xs space-y-2.5 ${colors.subtleBg} ${colors.borderLight}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-semibold text-stone-600 dark:text-stone-400">Email: {candidate.email}</span>
                {candidate.phone && <span>• Tel: {candidate.phone}</span>}
                {candidate.localTimezone && <span>• Zone: {candidate.localTimezone}</span>}
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {/* Round Quick Switcher */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-stone-500">Round:</span>
                  <select
                    value={candidate.hiringRound || 'Screening'}
                    onChange={(e) => candidate.id && onAdvanceRound && onAdvanceRound(candidate.id, e.target.value as HiringRound)}
                    className={`text-xs px-2 py-0.5 rounded-lg border ${colors.inputBg} ${colors.border} font-semibold`}
                  >
                    {['Screening', 'Technical Round 1', 'Technical Round 2', 'Management / HR', 'Final Offer'].map((rd) => (
                      <option key={rd} value={rd}>
                        {rd}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Quick Switcher */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-stone-500">Quick Status:</span>
                  <select
                    value={candidate.status}
                    onChange={(e) => candidate.id && onStatusChange(candidate.id, e.target.value as Candidate['status'])}
                    className={`text-xs px-2 py-0.5 rounded-lg border ${colors.inputBg} ${colors.border} font-semibold`}
                  >
                    {['Pending', 'Scheduled', 'Rescheduled', 'Interviewed', 'Selected', 'Rejected'].map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Profile & portfolio URLs */}
            <div className="flex items-center gap-3 flex-wrap pt-1">
              {candidate.resumeLink && (
                <a
                  href={candidate.resumeLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:underline font-semibold flex items-center gap-1"
                >
                  <FileText className="w-3 h-3" /> CV / Resume
                </a>
              )}
              {candidate.linkedinUrl && (
                <a
                  href={candidate.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-semibold flex items-center gap-1"
                >
                  <Linkedin className="w-3 h-3" /> LinkedIn Profile
                </a>
              )}
              {candidate.githubUrl && (
                <a
                  href={candidate.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-stone-700 dark:text-stone-300 hover:underline font-semibold flex items-center gap-1"
                >
                  <Github className="w-3 h-3" /> GitHub
                </a>
              )}
              {candidate.portfolioUrl && (
                <a
                  href={candidate.portfolioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-600 hover:underline font-semibold flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" /> Portfolio
                </a>
              )}
            </div>

            {candidate.skills && candidate.skills.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap pt-1">
                <span className="text-[11px] text-stone-400 font-medium">Skills:</span>
                {candidate.skills.map((s, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-stone-200/60 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}

            {candidate.notes && (
              <p className="text-[11px] text-stone-500 italic bg-white/60 dark:bg-stone-900/60 p-2 rounded-lg border border-stone-200 dark:border-stone-800">
                "{candidate.notes}"
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // DETAILED VIEW (Rich card with comprehensive layout)
  // ----------------------------------------------------
  return (
    <div
      id={`candidate-row-${candidate.id}`}
      className={`rounded-2xl border p-5 sm:p-6 transition-all duration-200 ${colors.cardBg} hover:shadow-md relative overflow-hidden group ${
        isSelected ? 'ring-2 ring-indigo-500/40 border-indigo-400 bg-indigo-50/20 dark:bg-indigo-950/20' : ''
      }`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        {/* Left: Checkbox + Avatar & Profile Info */}
        <div className="flex items-start gap-3.5 flex-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (candidate.id) onToggleSelect(candidate.id);
            }}
            className="pt-3.5 sm:pt-2.5 text-stone-400 hover:text-indigo-600 transition-colors cursor-pointer"
            title={isSelected ? 'Deselect candidate' : 'Select candidate for batch action'}
          >
            {isSelected ? (
              <CheckSquare className="w-5 h-5 text-indigo-600" />
            ) : (
              <Square className="w-5 h-5 text-stone-300 dark:text-stone-600 hover:text-indigo-500" />
            )}
          </button>

          <div
            className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${avatarGrad} flex items-center justify-center font-display font-extrabold text-sm shadow-sm shrink-0 tracking-wider`}
          >
            {initials}
          </div>

          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className={`text-base sm:text-lg font-bold font-display ${colors.textPrimary} tracking-tight`}>
                {candidate.name}
              </h3>

              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusBadge(candidate.status)}`}>
                {candidate.status}
              </span>

              {candidate.assignedInterviewer && (
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1 shadow-2xs"
                  title={`Assigned Interviewer: ${candidate.assignedInterviewer}`}
                >
                  <Users className="w-3 h-3 text-amber-600" />
                  <span>{candidate.assignedInterviewer.split('@')[0]}</span>
                </span>
              )}

              {hasConflict && (
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1 animate-pulse shadow-2xs"
                  title="Time slot conflict detected with another candidate interview!"
                >
                  <AlertTriangle className="w-3 h-3" />
                  <span>Slot Overlap</span>
                </span>
              )}

              {candidate.scorecard && (
                <button
                  type="button"
                  onClick={() => onScorecard(candidate)}
                  className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 flex items-center gap-1 shadow-2xs cursor-pointer"
                  title="Click to view full evaluation scorecard"
                >
                  <Award className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                  <span>★ {candidate.scorecard.overallRating}/5 • {candidate.scorecard.recommendation}</span>
                </button>
              )}

              {/* Status Select dropdown */}
              <select
                id={`status-select-${candidate.id}`}
                value={candidate.status}
                onChange={(e) => candidate.id && onStatusChange(candidate.id, e.target.value as Candidate['status'])}
                className={`text-xs font-semibold px-2 py-0.5 rounded-lg border ${colors.inputBg} ${colors.border} ${colors.textPrimary} cursor-pointer`}
              >
                {['Pending', 'Scheduled', 'Rescheduled', 'Interviewed', 'Selected', 'Rejected'].map((statusOption) => (
                  <option key={statusOption} value={statusOption}>
                    Move to {statusOption}
                  </option>
                ))}
              </select>

              {/* Hiring Round dropdown */}
              <select
                id={`round-select-${candidate.id}`}
                value={candidate.hiringRound || 'Screening'}
                onChange={(e) => candidate.id && onAdvanceRound && onAdvanceRound(candidate.id, e.target.value as HiringRound)}
                className={`text-xs font-semibold px-2 py-0.5 rounded-lg border ${colors.inputBg} ${colors.border} text-indigo-700 dark:text-indigo-300 cursor-pointer`}
              >
                {['Screening', 'Technical Round 1', 'Technical Round 2', 'Management / HR', 'Final Offer'].map((roundOption) => (
                  <option key={roundOption} value={roundOption}>
                    Round: {roundOption}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-stone-500 dark:text-stone-400">
              <span className="font-semibold text-stone-800 dark:text-stone-200">
                {candidate.position || 'Software Engineer'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-stone-700 dark:text-stone-300 font-medium">
                <span>{geo.flag}</span>
                <span>{displayCountry}</span>
              </span>
              <span>•</span>
              <span className="font-mono">{candidate.email}</span>
              {candidate.phone && (
                <>
                  <span>•</span>
                  <span>{candidate.phone}</span>
                </>
              )}
            </div>

            {/* Time details: PKT and Candidate Local Time */}
            {candidate.suggestedPktTime ? (
              <div
                className={`p-3 rounded-xl border text-xs space-y-1.5 ${colors.subtleBg} ${colors.borderLight} max-w-xl`}
              >
                <div className="flex items-center justify-between font-medium">
                  <span className="flex items-center gap-1.5 text-amber-900 dark:text-amber-200 font-semibold">
                    <Clock className={`w-3.5 h-3.5 ${colors.accentText}`} />
                    <span>Pakistan Standard Time (PKT / UTC+5):</span>
                  </span>
                  <span className="font-mono font-bold text-amber-900 dark:text-amber-200">
                    {formatPktDateTime(candidate.suggestedPktTime)}
                  </span>
                </div>

                <div className={`flex items-center justify-between ${colors.textSecondary} text-[11px]`}>
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-stone-400" />
                    <span>Candidate Local Time:</span>
                    <span className="text-[10px] text-stone-500">
                      ({candidate.timezoneLabel || candidateTz})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-stone-800 dark:text-stone-200">
                      {formatInTimezone(candidate.suggestedPktTime, candidateTz, { includeAbbr: true })}
                    </span>
                    {workingHourEval && (
                      <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${workingHourEval.badgeColor}`}>
                        {workingHourEval.badgeText}
                      </span>
                    )}
                  </div>
                </div>

                {candidate.status === 'Scheduled' && (
                  <div
                    className={`flex items-center justify-between text-[11px] pt-1 border-t ${colors.borderLight}`}
                  >
                    <span className={colors.textMuted}>Interview Countdown / Duration:</span>
                    <div className="flex items-center gap-2 font-semibold">
                      <span className={isPast ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}>
                        {rel.text}
                      </span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-900 dark:text-amber-200">
                        {candidate.durationMinutes || 45} mins
                      </span>
                    </div>
                  </div>
                )}

                {onViewInCalendar && (
                  <div className={`pt-1.5 border-t ${colors.borderLight} flex justify-end`}>
                    <button
                      type="button"
                      onClick={() => onViewInCalendar(candidate)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
                      title="View this interview on Calendar & Slots"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>View Slot on Calendar</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>No interview slot appointed yet. Click Schedule to set PKT slot.</span>
              </div>
            )}

            {/* Links and Skills */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              {candidate.resumeLink && (
                <a
                  href={candidate.resumeLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold hover:underline border border-indigo-200 dark:border-indigo-800"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Resume / CV</span>
                </a>
              )}

              {candidate.linkedinUrl && (
                <a
                  href={candidate.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold hover:underline border border-blue-200 dark:border-blue-800"
                >
                  <Linkedin className="w-3.5 h-3.5" />
                  <span>LinkedIn</span>
                </a>
              )}

              {candidate.githubUrl && (
                <a
                  href={candidate.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-semibold hover:underline border border-stone-200 dark:border-stone-700"
                >
                  <Github className="w-3.5 h-3.5" />
                  <span>GitHub</span>
                </a>
              )}

              {candidate.portfolioUrl && (
                <a
                  href={candidate.portfolioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold hover:underline border border-emerald-200 dark:border-emerald-800"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Portfolio</span>
                </a>
              )}

              {candidate.skills &&
                candidate.skills.slice(0, 4).map((skill, sIdx) => (
                  <span
                    key={sIdx}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-medium ${colors.subtleBg} ${colors.textSecondary} border ${colors.borderLight}`}
                  >
                    {skill}
                  </span>
                ))}
            </div>

            {candidate.notes && (
              <p className={`text-xs ${colors.textMuted} italic bg-black/5 dark:bg-white/5 p-2 rounded-lg max-w-xl`}>
                "{candidate.notes}"
              </p>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-col sm:flex-row lg:flex-col items-stretch gap-2.5 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-stone-200 dark:border-stone-800">
          {candidate.meetLink ? (
            <>
              <a
                id={`btn-meet-${candidate.id}`}
                href={candidate.meetLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
              >
                <Video className="w-4 h-4" />
                <span>Join Google Meet</span>
              </a>

              <button
                id={`btn-reschedule-${candidate.id}`}
                onClick={() => onSchedule(candidate)}
                className={`px-4 py-2 rounded-xl font-semibold text-xs border flex items-center justify-center gap-2 transition-all cursor-pointer ${colors.subtleBg} ${colors.border} ${colors.textPrimary} hover:${colors.accentText}`}
              >
                <CalendarClock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Reschedule</span>
              </button>
            </>
          ) : (
            <button
              id={`btn-schedule-${candidate.id}`}
              onClick={() => onSchedule(candidate)}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs text-white shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-[1.02] ${colors.accentBg} ${colors.accentHover}`}
            >
              <CalendarPlus className="w-4 h-4" />
              <span>Schedule Interview</span>
            </button>
          )}

          {/* Quick Actions Row */}
          <div className="grid grid-cols-2 gap-2">
            <button
              id={`btn-scorecard-${candidate.id}`}
              type="button"
              onClick={() => onScorecard(candidate)}
              className="px-2.5 py-2 rounded-xl font-semibold text-xs border border-blue-200 dark:border-blue-800/60 bg-blue-50/60 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Record Interview Evaluation & Scoring"
            >
              <Award className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Scorecard</span>
            </button>

            <button
              id={`btn-whatsapp-${candidate.id}`}
              type="button"
              onClick={() => onWhatsApp(candidate)}
              className="px-2.5 py-2 rounded-xl font-semibold text-xs border border-emerald-300 dark:border-emerald-700/60 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Share interview details via WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-current text-emerald-600 dark:text-emerald-400" />
              <span>WhatsApp</span>
            </button>
          </div>

          {/* More Actions Dropdown in Detailed View */}
          <div className="relative" ref={detailedMoreMenuRef}>
            <button
              id={`btn-more-${candidate.id}`}
              type="button"
              onClick={() => setDetailedMoreOpen(!detailedMoreOpen)}
              className={`w-full py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${colors.subtleBg} ${colors.border} text-slate-700 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800`}
            >
              <MoreHorizontal className="w-4 h-4 text-slate-500" />
              <span>More Actions &amp; Tools</span>
              <ChevronDown className={`w-3.5 h-3.5 opacity-60 transition-transform ${detailedMoreOpen ? 'rotate-180' : ''}`} />
            </button>

            {detailedMoreOpen && (
              <div
                className={`absolute right-0 mt-2 w-64 rounded-xl p-1.5 border shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100 ${colors.cardBg} ${colors.border}`}
              >
                {candidate.meetLink && (
                  <button
                    type="button"
                    onClick={() => {
                      setDetailedMoreOpen(false);
                      onSchedule(candidate);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 text-xs text-left rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    <CalendarClock className="w-3.5 h-3.5 text-amber-500" />
                    <span>Reschedule Interview</span>
                  </button>
                )}

                {onViewInCalendar && candidate.suggestedPktTime && (
                  <button
                    type="button"
                    onClick={() => {
                      setDetailedMoreOpen(false);
                      onViewInCalendar(candidate);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 text-xs text-left rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5 text-blue-500" />
                    <span>View Slot on Calendar</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setDetailedMoreOpen(false);
                    onReminder(candidate);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 text-xs text-left rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <Bell className="w-3.5 h-3.5 text-amber-500" />
                  <span>Send Follow-up Reminder</span>
                </button>

                {onSelfBooking && (
                  <button
                    type="button"
                    onClick={() => {
                      setDetailedMoreOpen(false);
                      onSelfBooking(candidate);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 text-xs text-left rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    <Link className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Candidate Self-Booking Link</span>
                  </button>
                )}

                {candidate.suggestedPktTime && (
                  <button
                    type="button"
                    onClick={() => {
                      setDetailedMoreOpen(false);
                      downloadIcsFile(candidate);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 text-xs text-left rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-400" />
                    <span>Download .ics Calendar File</span>
                  </button>
                )}

                {onTimeline && (
                  <button
                    type="button"
                    onClick={() => {
                      setDetailedMoreOpen(false);
                      onTimeline(candidate);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 text-xs text-left rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    <History className="w-3.5 h-3.5 text-purple-500" />
                    <span>Audit Trail &amp; History</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setDetailedMoreOpen(false);
                    onEdit(candidate);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 text-xs text-left rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5 text-slate-400" />
                  <span>Edit Profile</span>
                </button>

                <div className="my-1 border-t border-slate-200 dark:border-slate-800" />

                <button
                  type="button"
                  onClick={() => {
                    setDetailedMoreOpen(false);
                    onDelete(candidate);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 text-xs text-left rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  <span>Delete Candidate</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
