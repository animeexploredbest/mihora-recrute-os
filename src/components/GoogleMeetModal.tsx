import React, { useState } from 'react';
import {
  X,
  Video,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  Users,
  Calendar,
  Loader2,
  CheckCircle2,
  Share2,
} from 'lucide-react';
import { useTheme } from '../lib/theme';
import { createInstantGoogleMeet } from '../lib/google-api';
import { getAccessToken } from '../lib/auth';
import { Candidate } from '../types';

interface GoogleMeetModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: Candidate[];
  onAssignToCandidate?: (candidateId: string, meetLink: string) => Promise<void>;
  isCalendarConnected: boolean;
  onConnectCalendar: () => Promise<void>;
}

export const GoogleMeetModal: React.FC<GoogleMeetModalProps> = ({
  isOpen,
  onClose,
  candidates,
  onAssignToCandidate,
  isCalendarConnected,
  onConnectCalendar,
}) => {
  const { colors } = useTheme();
  const [currentMeetLink, setCurrentMeetLink] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState<boolean>(false);
  const [assignSuccess, setAssignSuccess] = useState<boolean>(false);

  React.useEffect(() => {
    if (isOpen && !currentMeetLink) {
      handleGenerateMeet();
    }
  }, [isOpen]);

  const handleGenerateMeet = async () => {
    setIsGenerating(true);
    setAssignSuccess(false);
    try {
      const token = await getAccessToken();
      const res = await createInstantGoogleMeet(token || undefined);
      setCurrentMeetLink(res.meetLink);
    } catch (e) {
      console.warn('Error generating Meet room:', e);
      setCurrentMeetLink('https://meet.google.com/new');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = () => {
    if (!currentMeetLink) return;
    navigator.clipboard.writeText(currentMeetLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleAssign = async () => {
    if (!selectedCandidateId || !currentMeetLink || !onAssignToCandidate) return;
    setIsAssigning(true);
    try {
      await onAssignToCandidate(selectedCandidateId, currentMeetLink);
      setAssignSuccess(true);
      setTimeout(() => setAssignSuccess(false), 3000);
    } catch (e) {
      console.error('Failed to attach Meet link to candidate:', e);
    } finally {
      setIsAssigning(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden flex flex-col ${colors.cardBg} ${colors.border}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-200/80 dark:border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-xs">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-base font-bold font-display ${colors.textPrimary}`}>
                  Instant Google Meet
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Ready
                </span>
              </div>
              <p className={`text-xs ${colors.textMuted}`}>
                Launch a dedicated video conference room for interviews
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Main Meeting Link Display */}
          <div className={`p-4 rounded-2xl border space-y-3 ${colors.subtleBg} ${colors.borderLight}`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold ${colors.textMuted}`}>
                Meeting URL
              </span>
              <button
                type="button"
                onClick={handleGenerateMeet}
                disabled={isGenerating}
                className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
              >
                {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                <span>New Meeting Link</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div
                className={`flex-1 px-3.5 py-2.5 rounded-xl border text-xs font-mono font-medium truncate select-all ${colors.cardBg} ${colors.border} ${colors.textPrimary}`}
              >
                {isGenerating ? 'Generating Google Meet room...' : currentMeetLink}
              </div>
              <button
                type="button"
                onClick={handleCopyLink}
                title="Copy Meet link"
                className="p-2.5 rounded-xl border bg-white dark:bg-stone-900 hover:bg-stone-100 text-stone-700 dark:text-stone-200 font-semibold cursor-pointer shrink-0 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {/* Direct Join Action */}
            <div className="pt-1 flex items-center justify-between gap-3">
              <a
                href={currentMeetLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Video className="w-4 h-4" />
                <span>Join Google Meet Now</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </a>
            </div>
          </div>

          {/* Quick Assign to Candidate */}
          {onAssignToCandidate && (
            <div className="space-y-2">
              <label className={`block text-xs font-bold font-display ${colors.textPrimary}`}>
                Quick-Attach to Candidate in Pipeline
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={selectedCandidateId}
                  onChange={(e) => setSelectedCandidateId(e.target.value)}
                  className={`flex-1 px-3 py-2 rounded-xl border text-xs focus:outline-none ${colors.cardBg} ${colors.border} ${colors.textPrimary}`}
                >
                  <option value="">Select candidate to attach this Meet room...</option>
                  {candidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.position || 'Applicant'}) - {c.status}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  disabled={!selectedCandidateId || isAssigning}
                  onClick={handleAssign}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                >
                  {isAssigning ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : assignSuccess ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                      <span>Attached!</span>
                    </>
                  ) : (
                    <span>Attach Room</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-200/80 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 flex items-center justify-between text-xs text-stone-500">
          <span>Compatible with Google Calendar attendees &amp; guests</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border bg-white dark:bg-stone-900 hover:bg-stone-100 text-stone-700 dark:text-stone-200 font-semibold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
