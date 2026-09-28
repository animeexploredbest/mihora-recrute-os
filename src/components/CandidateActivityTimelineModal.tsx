import React, { useState } from 'react';
import { Candidate, CandidateActivity } from '../types';
import { useTheme } from '../lib/theme';
import {
  X,
  Clock,
  Calendar,
  CalendarClock,
  Mail,
  Bell,
  Award,
  FastForward,
  MessageCircle,
  Plus,
  Send,
  User,
  History,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { formatPktDateTime, formatRelativeTime } from '../lib/date-utils';
import { logCandidateActivity } from '../lib/firebase-operations';

interface CandidateActivityTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: Candidate;
  onActivityAdded?: (updatedActivities: CandidateActivity[]) => void;
}

export const CandidateActivityTimelineModal: React.FC<CandidateActivityTimelineModalProps> = ({
  isOpen,
  onClose,
  candidate,
  onActivityAdded,
}) => {
  const { colors } = useTheme();
  const [newNote, setNewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const activities = candidate.activities || [];

  const getActivityIcon = (type: CandidateActivity['type']) => {
    switch (type) {
      case 'created':
        return <User className="w-4 h-4 text-stone-500" />;
      case 'scheduled':
        return <Calendar className="w-4 h-4 text-emerald-500" />;
      case 'rescheduled':
        return <CalendarClock className="w-4 h-4 text-amber-500" />;
      case 'email_sent':
        return <Mail className="w-4 h-4 text-blue-500" />;
      case 'reminder_sent':
        return <Bell className="w-4 h-4 text-orange-500" />;
      case 'scorecard_added':
        return <Award className="w-4 h-4 text-purple-500" />;
      case 'round_advanced':
        return <FastForward className="w-4 h-4 text-indigo-500" />;
      case 'self_booked':
        return <CheckCircle2 className="w-4 h-4 text-teal-500" />;
      case 'whatsapp_sent':
        return <MessageCircle className="w-4 h-4 text-emerald-600" />;
      case 'note_added':
      default:
        return <FileText className="w-4 h-4 text-amber-500" />;
    }
  };

  const getActivityBadgeColor = (type: CandidateActivity['type']) => {
    switch (type) {
      case 'created':
        return 'bg-stone-500/10 text-stone-700 dark:text-stone-300 border-stone-500/20';
      case 'scheduled':
        return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20';
      case 'rescheduled':
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20';
      case 'email_sent':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20';
      case 'reminder_sent':
        return 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20';
      case 'scorecard_added':
        return 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20';
      case 'round_advanced':
        return 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20';
      case 'self_booked':
        return 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20';
      case 'whatsapp_sent':
        return 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-300 border-emerald-600/20';
      default:
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20';
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !candidate.id) return;

    setIsSubmitting(true);
    try {
      const added = await logCandidateActivity(
        candidate.id,
        {
          type: 'note_added',
          details: newNote.trim(),
        },
        activities
      );

      setNewNote('');
      if (onActivityAdded) {
        onActivityAdded([added, ...activities]);
      }
    } catch (err) {
      console.error('Failed to log activity note:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div
        className={`bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto`}
      >
        {/* Header */}
        <div className="p-5 border-b border-stone-200 dark:border-stone-800 bg-amber-50/50 dark:bg-stone-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-base font-bold font-display ${colors.textPrimary}`}>
                  Activity &amp; Audit Trail
                </h2>
                {candidate.hiringRound && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25">
                    {candidate.hiringRound}
                  </span>
                )}
              </div>
              <p className={`text-xs ${colors.textSecondary}`}>
                Live tracking for <span className="font-semibold">{candidate.name}</span> ({candidate.position || 'Candidate'})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-xl text-stone-400 hover:${colors.textPrimary} hover:${colors.subtleBg} transition-colors cursor-pointer`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Add Note Bar */}
        <form onSubmit={handleAddNote} className="p-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add recruiter note or candidate update..."
              className={`flex-1 text-xs px-3.5 py-2 rounded-xl border ${colors.inputBg} ${colors.border} ${colors.textPrimary} focus:ring-2 focus:ring-amber-500`}
            />
            <button
              type="submit"
              disabled={!newNote.trim() || isSubmitting}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold text-white shadow-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                !newNote.trim() || isSubmitting
                  ? 'opacity-40 cursor-not-allowed bg-stone-400'
                  : `${colors.accentBg} ${colors.accentHover}`
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>
        </form>

        {/* Activity Stream */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {activities.length === 0 ? (
            <div className="text-center py-10 text-stone-400">
              <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs">No activity logged yet for this candidate.</p>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Actions like emails, scheduling, scorecards, and rounds will automatically record here.
              </p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200 dark:before:bg-stone-800">
              {activities.map((act) => (
                <div key={act.id} className="relative group">
                  {/* Timeline dot */}
                  <div className="absolute -left-6 top-1.5 w-5 h-5 rounded-full bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 flex items-center justify-center shadow-2xs">
                    {getActivityIcon(act.type)}
                  </div>

                  <div className={`p-3 rounded-xl border ${colors.subtleBg} ${colors.border} space-y-1`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${getActivityBadgeColor(
                            act.type
                          )}`}
                        >
                          {act.type.replace('_', ' ')}
                        </span>
                        {act.actor && (
                          <span className={`text-[11px] ${colors.textSecondary} font-medium`}>
                            by {act.actor}
                          </span>
                        )}
                      </div>

                      <div className="text-[10px] font-mono text-stone-400" title={formatPktDateTime(act.timestamp)}>
                        {formatRelativeTime(act.timestamp)}
                      </div>
                    </div>

                    <p className={`text-xs ${colors.textPrimary} font-medium whitespace-pre-line`}>
                      {act.details}
                    </p>

                    <div className="text-[10px] text-stone-400 font-mono">
                      {formatPktDateTime(act.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 flex items-center justify-between text-xs">
          <span className={`text-[11px] ${colors.textSecondary}`}>
            Total Events: {activities.length}
          </span>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-xl font-bold ${colors.subtleBg} ${colors.textPrimary} ${colors.border} border hover:brightness-95 cursor-pointer`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
