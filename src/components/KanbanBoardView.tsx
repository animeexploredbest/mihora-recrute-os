import React, { useState } from 'react';
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
  LayoutDashboard,
  UserPlus,
  AlertTriangle,
  FileText,
  Linkedin,
  Github,
  ExternalLink,
  History,
  Link,
  Download,
  FastForward,
  Layers,
  Zap,
} from 'lucide-react';
import { formatRelativeTime, isInterviewPast, formatPktDateTime } from '../lib/date-utils';
import { detectCandidateGeo, getAvatarGradient, getInitials } from '../lib/geo-utils';
import { downloadIcsFile } from '../lib/ics-utils';
import { getTrackById } from '../lib/track-constants';
import { findNextFreeSlotAndTrack } from '../lib/conflict-detector';

const HIRING_ROUNDS_LIST: { round: HiringRound; title: string; color: string }[] = [
  { round: 'Screening', title: '1. Screening', color: 'border-blue-500/40 bg-blue-500/5' },
  { round: 'Technical Round 1', title: '2. Tech Round 1', color: 'border-indigo-500/40 bg-indigo-500/5' },
  { round: 'Technical Round 2', title: '3. Tech Round 2', color: 'border-purple-500/40 bg-purple-500/5' },
  { round: 'Management / HR', title: '4. Management / HR', color: 'border-amber-500/40 bg-amber-500/5' },
  { round: 'Final Offer', title: '5. Final Offer', color: 'border-emerald-500/40 bg-emerald-500/5' },
];

interface KanbanBoardViewProps {
  candidates: Candidate[];
  columns: { status: Candidate['status']; title: string }[];
  conflictCandidateIds: Set<string>;
  onStatusChange: (candidateId: string, newStatus: Candidate['status']) => void;
  onEditCandidate: (candidate: Candidate) => void;
  onDeleteCandidate: (candidate: Candidate) => void;
  onScheduleCandidate: (candidate: Candidate) => void;
  onScorecardCandidate: (candidate: Candidate) => void;
  onReminderCandidate: (candidate: Candidate) => void;
  onWhatsAppCandidate: (candidate: Candidate) => void;
  onAddCandidate: () => void;
  onTimeline?: (candidate: Candidate) => void;
  onSelfBooking?: (candidate: Candidate) => void;
  onAdvanceRound?: (candidateId: string, nextRound: HiringRound) => void;
  onViewInCalendar?: (candidate: Candidate) => void;
  onDirectBookSlot?: (candidateId: string, slotIso: string, trackId: string) => Promise<void>;
}

export const KanbanBoardView: React.FC<KanbanBoardViewProps> = ({
  candidates,
  columns,
  conflictCandidateIds,
  onStatusChange,
  onEditCandidate,
  onDeleteCandidate,
  onScheduleCandidate,
  onScorecardCandidate,
  onReminderCandidate,
  onWhatsAppCandidate,
  onAddCandidate,
  onTimeline,
  onSelfBooking,
  onAdvanceRound,
  onViewInCalendar,
  onDirectBookSlot,
}) => {
  const { colors } = useTheme();
  const [viewDimension, setViewDimension] = useState<'status' | 'round'>('status');
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('candidateId', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropStatus = (e: React.DragEvent, status: Candidate['status']) => {
    e.preventDefault();
    setDragOverColumn(null);
    const id = e.dataTransfer.getData('candidateId');
    if (!id) return;
    const candidate = candidates.find((c) => c.id === id);
    if (!candidate) return;

    if (status === 'Scheduled' && !candidate.suggestedPktTime) {
      // If candidate has no slot assigned yet, prompt recruiter to schedule
      onScheduleCandidate(candidate);
      return;
    }
    onStatusChange(id, status);
  };

  const handleDropRound = (e: React.DragEvent, round: HiringRound) => {
    e.preventDefault();
    setDragOverColumn(null);
    const id = e.dataTransfer.getData('candidateId');
    if (id && onAdvanceRound) {
      onAdvanceRound(id, round);
    }
  };

  const renderCandidateCard = (candidate: Candidate) => {
    const rel = formatRelativeTime(candidate.suggestedPktTime);
    const isPast = isInterviewPast(candidate.suggestedPktTime);

    return (
      <div
        key={candidate.id}
        id={`card-${candidate.id}`}
        draggable
        onDragStart={(e) => handleDragStart(e, candidate.id!)}
        className={`p-4 rounded-xl border transition-all cursor-grab active:cursor-grabbing space-y-3 group ${colors.cardBg} ${colors.border} hover:shadow-md`}
      >
        <div className="flex justify-between items-start gap-2">
          <div className="flex items-start gap-2.5">
            <div
              className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${getAvatarGradient(
                candidate.name
              )} flex items-center justify-center font-display font-extrabold text-xs shadow-2xs shrink-0`}
            >
              {getInitials(candidate.name)}
            </div>
            <div>
              <h4 className={`font-bold font-display text-sm line-clamp-1 ${colors.textPrimary}`}>
                {candidate.name}
              </h4>
              <p className={`text-[11px] font-medium ${colors.textSecondary}`}>
                {candidate.position || 'Applicant'}
              </p>
              {/* Badges: Country + Current Round */}
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300 pt-0.5 flex-wrap">
                <span>{detectCandidateGeo(candidate).flag}</span>
                <span>{candidate.country || detectCandidateGeo(candidate).country}</span>
                {candidate.hiringRound && (
                  <>
                    <span>•</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                      {candidate.hiringRound}
                    </span>
                  </>
                )}
                {candidate.trackId && (
                  <>
                    <span>•</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-bold border ${getTrackById(candidate.trackId).badgeBg} ${getTrackById(candidate.trackId).badgeBorder}`}
                      title={candidate.trackName || getTrackById(candidate.trackId).name}
                    >
                      {getTrackById(candidate.trackId).shortCode}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              id={`btn-edit-card-${candidate.id}`}
              onClick={() => onEditCandidate(candidate)}
              className={`p-1.5 ${colors.textMuted} hover:${colors.accentText} hover:${colors.subtleBg} rounded-lg transition-colors cursor-pointer`}
              title="Edit Candidate"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>
            <button
              id={`btn-delete-card-${candidate.id}`}
              onClick={() => onDeleteCandidate(candidate)}
              className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
              title="Delete Candidate"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Date and Time badge */}
        <div
          className={`rounded-xl p-2.5 border text-[11px] space-y-1.5 ${colors.subtleBg} ${colors.borderLight}`}
        >
          <div
            className={`flex items-center justify-between font-medium ${colors.textSecondary}`}
          >
            <span className="flex items-center gap-1">
              <Clock className={`w-3.5 h-3.5 ${colors.accentText}`} />
              <span className="font-semibold text-amber-900 dark:text-amber-200">PKT (UTC+5)</span>
            </span>
            <span className={`font-mono font-bold ${colors.textPrimary}`}>
              {formatPktDateTime(candidate.suggestedPktTime)}
            </span>
          </div>

          {/* Direct link to Calendar & Slots Grid */}
          {candidate.suggestedPktTime && onViewInCalendar ? (
            <button
              type="button"
              onClick={() => onViewInCalendar(candidate)}
              className="w-full py-1 px-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-bold text-[10px] border border-indigo-500/30 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Locate and focus this candidate in the Calendar & Slots grid"
            >
              <Calendar className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              <span>View in Calendar &amp; Slots Grid</span>
            </button>
          ) : candidate.status !== 'Rejected' ? (
            <div className="flex items-center gap-1.5 pt-0.5">
              {onDirectBookSlot && (
                <button
                  type="button"
                  onClick={async () => {
                    const suggestion = findNextFreeSlotAndTrack(
                      new Date().toISOString(),
                      candidate.durationMinutes || 45,
                      candidates,
                      candidate.id,
                      candidate.trackId
                    );
                    await onDirectBookSlot(candidate.id!, suggestion.slotIso, suggestion.trackId);
                  }}
                  className="flex-1 py-1 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-2xs"
                  title="Auto-detect next open parallel slot and book instantly"
                >
                  <Zap className="w-3 h-3 fill-current" />
                  <span>1-Click Book</span>
                </button>
              )}
              {onViewInCalendar && (
                <button
                  type="button"
                  onClick={() => onViewInCalendar(candidate)}
                  className="flex-1 py-1 px-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold text-[10px] border border-amber-500/30 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  title="Schedule into an open slot in Calendar"
                >
                  <Calendar className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  <span>Calendar Slot</span>
                </button>
              )}
            </div>
          ) : null}

          {candidate.status === 'Scheduled' && (
            <div
              className={`flex items-center justify-between ${colors.textMuted} pt-0.5 border-t ${colors.borderLight}`}
            >
              <span>Status / Duration:</span>
              <div className="flex items-center gap-1.5 font-semibold">
                <span
                  className={`${
                    isPast
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-emerald-700 dark:text-emerald-400'
                  }`}
                >
                  {rel.text}
                </span>
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-900 dark:text-amber-200">
                  {candidate.durationMinutes || 45}m
                </span>
              </div>
            </div>
          )}

          {/* Overlap Conflict Banner inside Card */}
          {candidate.id && conflictCandidateIds.has(candidate.id) && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-400 text-[11px] font-bold border border-rose-500/25">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              <span>Interview Overlap Warning</span>
            </div>
          )}

          {/* Scorecard Summary Pill */}
          {candidate.scorecard && (
            <button
              type="button"
              onClick={() => onScorecardCandidate(candidate)}
              className="w-full flex items-center justify-between px-2 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 text-[11px] font-bold border border-indigo-500/30 transition-colors cursor-pointer"
              title="View Scorecard"
            >
              <span className="flex items-center gap-1">
                <Award className="w-3 h-3 text-indigo-600" />
                <span>Score: {candidate.scorecard.overallRating}/5</span>
              </span>
              <span>{candidate.scorecard.recommendation}</span>
            </button>
          )}

          {/* Resume & Profile links */}
          <div className="flex items-center gap-2 pt-0.5 text-[11px] flex-wrap">
            {candidate.resumeLink && (
              <a
                href={candidate.resumeLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:underline font-semibold flex items-center gap-0.5"
                title="Resume"
              >
                <FileText className="w-3 h-3" /> CV
              </a>
            )}
            {candidate.linkedinUrl && (
              <a
                href={candidate.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline font-semibold flex items-center gap-0.5"
                title="LinkedIn"
              >
                <Linkedin className="w-3 h-3" /> In
              </a>
            )}
            {candidate.githubUrl && (
              <a
                href={candidate.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-stone-700 dark:text-stone-300 hover:underline font-semibold flex items-center gap-0.5"
                title="GitHub"
              >
                <Github className="w-3 h-3" /> Git
              </a>
            )}
            {candidate.portfolioUrl && (
              <a
                href={candidate.portfolioUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-600 hover:underline font-semibold flex items-center gap-0.5"
                title="Portfolio"
              >
                <ExternalLink className="w-3 h-3" /> Web
              </a>
            )}
          </div>
        </div>

        {/* Quick Card Action Buttons */}
        <div className="pt-0.5 space-y-1.5">
          {candidate.meetLink ? (
            <>
              <a
                href={candidate.meetLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-1.5 py-2 px-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-800 dark:text-blue-200 border border-blue-500/30 rounded-xl text-xs font-bold transition-all shadow-2xs"
              >
                <Video className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Join Google Meet</span>
              </a>
              <button
                type="button"
                onClick={() => onScheduleCandidate(candidate)}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-500/30 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-2xs"
              >
                <CalendarClock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Reschedule Interview</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onScheduleCandidate(candidate)}
              className={`w-full flex items-center justify-center gap-1.5 py-2 px-2 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer ${colors.accentBg} ${colors.accentHover}`}
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              <span>Schedule Interview</span>
            </button>
          )}

          {/* Action Row: Scorecard, Remind */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => onScorecardCandidate(candidate)}
              className="flex items-center justify-center gap-1 py-1.5 px-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-900 dark:text-indigo-200 border border-indigo-500/30 rounded-xl text-[11px] font-semibold transition-all cursor-pointer shadow-2xs"
              title="Scorecard"
            >
              <Award className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              <span>Scorecard</span>
            </button>
            <button
              type="button"
              onClick={() => onReminderCandidate(candidate)}
              className="flex items-center justify-center gap-1 py-1.5 px-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-500/30 rounded-xl text-[11px] font-semibold transition-all cursor-pointer shadow-2xs"
              title="Remind"
            >
              <Bell className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              <span>Remind</span>
            </button>
          </div>

          {/* Secondary Action Row: WhatsApp, History, Booking */}
          <div className="grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={() => onWhatsAppCandidate(candidate)}
              className="flex items-center justify-center gap-1 py-1.5 px-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-900 dark:text-emerald-200 border border-emerald-500/30 rounded-xl text-[11px] font-semibold transition-all cursor-pointer shadow-2xs"
              title="Share interview details via WhatsApp"
            >
              <MessageCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400 fill-current" />
              <span>WA</span>
            </button>

            {onTimeline && (
              <button
                type="button"
                onClick={() => onTimeline(candidate)}
                className="flex items-center justify-center gap-1 py-1.5 px-1 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 rounded-xl text-[11px] font-semibold transition-all cursor-pointer shadow-2xs hover:bg-stone-200"
                title="Activity Audit Trail"
              >
                <History className="w-3 h-3 text-indigo-500" />
                <span>Logs</span>
              </button>
            )}

            {onSelfBooking && (
              <button
                type="button"
                onClick={() => onSelfBooking(candidate)}
                className="flex items-center justify-center gap-1 py-1.5 px-1 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 rounded-xl text-[11px] font-semibold transition-all cursor-pointer shadow-2xs hover:bg-stone-200"
                title="Candidate Self-Booking Link"
              >
                <Link className="w-3 h-3 text-indigo-500" />
                <span>Book</span>
              </button>
            )}
          </div>

          {candidate.suggestedPktTime && (
            <button
              type="button"
              onClick={() => downloadIcsFile(candidate)}
              className="w-full flex items-center justify-center gap-1 py-1 px-2 bg-stone-50 dark:bg-stone-800/80 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 rounded-xl text-[10px] font-medium transition-all cursor-pointer hover:bg-stone-100"
              title="Download RFC 5545 .ics calendar invite"
            >
              <Download className="w-3 h-3 text-stone-400" />
              <span>Download .ics Invite</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Kanban Board Top Ribbon */}
      <div
        className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${colors.cardBg} ${colors.border}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <div>
            <h2 className={`text-base font-bold font-display ${colors.textPrimary}`}>
              Interactive Pipeline Board
            </h2>
            <p className={`text-xs ${colors.textSecondary}`}>
              Drag &amp; drop candidate cards to update stages in real time. Live synced to Firestore database.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Dimension Selector: Status vs Hiring Round */}
          <div className="flex items-center p-1 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs">
            <button
              type="button"
              onClick={() => setViewDimension('status')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                viewDimension === 'status'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
            >
              By Status ({columns.length})
            </button>
            <button
              type="button"
              onClick={() => setViewDimension('round')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                viewDimension === 'round'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
            >
              <FastForward className="w-3 h-3" />
              <span>By Hiring Round (5)</span>
            </button>
          </div>

          {/* Calendar Sync Ribbon in Kanban */}
          {onViewInCalendar && (
            <button
              type="button"
              onClick={() => {
                const pendingCand = candidates.find((c) => c.status === 'Pending' || c.status === 'Rescheduled');
                if (pendingCand) onViewInCalendar(pendingCand);
                else if (candidates.length > 0) onViewInCalendar(candidates[0]);
              }}
              className="px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Open Calendar & Slots view to assign awaiting candidates"
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>Calendar &amp; Slots</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-200/80 dark:bg-indigo-800 text-indigo-900 dark:text-indigo-100 font-mono">
                {candidates.filter((c) => c.status === 'Scheduled').length} Booked • {candidates.filter((c) => c.status === 'Pending' || c.status === 'Rescheduled').length} Awaiting
              </span>
            </button>
          )}

          <button
            type="button"
            id="kanban-add-candidate-btn"
            onClick={onAddCandidate}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-all cursor-pointer ${colors.accentBg} ${colors.accentHover}`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Add Candidate</span>
          </button>
        </div>
      </div>

      {/* Columns Container */}
      <div className="flex gap-4 overflow-x-auto pb-6">
        {viewDimension === 'status' ? (
          // Status Columns (Pending, Scheduled, Rescheduled, Interviewed, Selected, Rejected)
          columns.map((col) => {
            const colCandidates = candidates.filter((c) => c.status === col.status);
            const isOver = dragOverColumn === col.status;
            return (
              <div
                key={col.status}
                id={`kanban-column-${col.status.toLowerCase()}`}
                onDragOver={(e) => {
                  handleDragOver(e);
                  if (dragOverColumn !== col.status) setDragOverColumn(col.status);
                }}
                onDragLeave={() => {
                  if (dragOverColumn === col.status) setDragOverColumn(null);
                }}
                onDrop={(e) => handleDropStatus(e, col.status)}
                className={`flex-1 min-w-[280px] sm:min-w-[300px] xl:min-w-[280px] max-w-[420px] rounded-2xl border flex flex-col min-h-[520px] max-h-[calc(100vh-230px)] transition-all duration-150 ${colors.subtleBg} ${
                  isOver ? 'border-amber-500 ring-2 ring-amber-500/30 shadow-lg bg-amber-500/5' : colors.border
                }`}
              >
                {/* Column Header */}
                <div
                  className={`p-3.5 flex items-center justify-between border-b rounded-t-2xl ${colors.border} ${colors.cardBg}`}
                >
                  <h3 className={`text-xs font-bold uppercase tracking-wide ${colors.textPrimary}`}>
                    {col.title}
                  </h3>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold shadow-2xs ${colors.subtleBg} ${colors.border} ${colors.textSecondary}`}
                  >
                    {colCandidates.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
                  {colCandidates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-stone-400 text-xs border border-dashed rounded-xl border-stone-200 dark:border-stone-700">
                      <p>No candidates in this stage</p>
                    </div>
                  ) : (
                    colCandidates.map((candidate) => renderCandidateCard(candidate))
                  )}
                </div>
              </div>
            );
          })
        ) : (
          // Hiring Round Columns (Screening -> Tech 1 -> Tech 2 -> Management -> Final Offer)
          HIRING_ROUNDS_LIST.map((rd) => {
            const roundCandidates = candidates.filter(
              (c) => (c.hiringRound || 'Screening') === rd.round
            );
            const isOver = dragOverColumn === rd.round;
            return (
              <div
                key={rd.round}
                id={`kanban-round-column-${rd.round.toLowerCase().replace(/\s+/g, '-')}`}
                onDragOver={(e) => {
                  handleDragOver(e);
                  if (dragOverColumn !== rd.round) setDragOverColumn(rd.round);
                }}
                onDragLeave={() => {
                  if (dragOverColumn === rd.round) setDragOverColumn(null);
                }}
                onDrop={(e) => handleDropRound(e, rd.round)}
                className={`flex-1 min-w-[280px] sm:min-w-[300px] xl:min-w-[280px] max-w-[420px] rounded-2xl border flex flex-col min-h-[520px] max-h-[calc(100vh-230px)] transition-all duration-150 ${colors.subtleBg} ${
                  isOver ? 'border-indigo-500 ring-2 ring-indigo-500/30 shadow-lg bg-indigo-500/5' : colors.border
                }`}
              >
                {/* Column Header */}
                <div
                  className={`p-3.5 flex items-center justify-between border-b rounded-t-2xl ${colors.border} ${colors.cardBg}`}
                >
                  <div className="flex items-center gap-1.5">
                    <FastForward className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <h3 className={`text-xs font-bold uppercase tracking-wide ${colors.textPrimary}`}>
                      {rd.title}
                    </h3>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold shadow-2xs bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30`}
                  >
                    {roundCandidates.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
                  {roundCandidates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-stone-400 text-xs border border-dashed rounded-xl border-stone-200 dark:border-stone-700">
                      <p>Drag candidates here to advance to {rd.round}</p>
                    </div>
                  ) : (
                    roundCandidates.map((candidate) => renderCandidateCard(candidate))
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
