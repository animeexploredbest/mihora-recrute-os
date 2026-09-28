import React, { useState } from 'react';
import { Candidate } from '../types';
import {
  X,
  Calendar,
  CalendarClock,
  Video,
  Mail,
  Loader2,
  Send,
  FileText,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Zap,
  Users,
  Check,
  ExternalLink,
  Copy,
  Clock,
  Download,
  Link,
  Eye,
  Code,
  Edit3,
  RotateCcw,
  Sparkles,
  CheckCheck,
  Info,
} from 'lucide-react';
import { DateTimePicker } from './DateTimePicker';
import { formatPktDateTime, formatLocalDateTime } from '../lib/date-utils';
import {
  findSlotConflicts,
  findNextFreeSlot,
  evaluateMultiTrackSlot,
} from '../lib/conflict-detector';
import { DEFAULT_INTERVIEW_TRACKS, getTrackById, InterviewTrack } from '../lib/track-constants';
import { downloadIcsFile } from '../lib/ics-utils';
import { formatInTimezone, resolveCandidateTimezone, getDiffFromPktDetailed } from '../lib/timezone-utils';
import { TimezoneSelector } from './TimezoneSelector';
import {
  getDefaultEmailTemplate,
  generateEmailSubject,
  renderEmailBody,
  renderEmailHtml,
  TEMPLATE_PLACEHOLDERS,
} from '../lib/email-template-utils';

interface ScheduleModalProps {
  candidate: Candidate;
  allCandidates: Candidate[];
  defaultTemplate?: string;
  defaultInterviewers?: string;
  defaultDurationMinutes?: number;
  isCalendarConnected: boolean;
  onConnectCalendar: () => Promise<void>;
  onSchedule: (
    candidateId: string,
    draftMode: boolean,
    scheduledIsoTime: string,
    customEmailTemplate?: string,
    interviewerEmails?: string,
    isReschedule?: boolean,
    durationMinutes?: number,
    trackId?: string,
    trackName?: string
  ) => Promise<{
    success: boolean;
    meetLink?: string;
    error?: string;
    calendarInviteSent?: boolean;
    gmailComposeUrl?: string;
    emailSent?: boolean;
    senderEmail?: string;
  }>;
  onClose: () => void;
}

export function ScheduleModal({
  candidate,
  allCandidates,
  defaultTemplate,
  defaultInterviewers,
  defaultDurationMinutes,
  isCalendarConnected,
  onConnectCalendar,
  onSchedule,
  onClose,
}: ScheduleModalProps) {
  const isReschedule =
    candidate.status === 'Scheduled' ||
    candidate.status === 'Rescheduled' ||
    Boolean(candidate.meetLink);

  const initialTzInfo = resolveCandidateTimezone(candidate);
  const [candidateTz, setCandidateTz] = useState<string>(candidate.timezone || initialTzInfo.tz);
  const [candidateTzLabel, setCandidateTzLabel] = useState<string>(candidate.timezoneLabel || initialTzInfo.label);

  const [currentTemplate, setCurrentTemplate] = useState<string>(
    defaultTemplate || getDefaultEmailTemplate(isReschedule)
  );
  const [previewTab, setPreviewTab] = useState<'rich' | 'plain' | 'edit'>('rich');
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [copiedFull, setCopiedFull] = useState(false);

  const [selectedTime, setSelectedTime] = useState(
    candidate.suggestedPktTime || new Date(Date.now() + 86400000).toISOString()
  );
  const [durationMinutes, setDurationMinutes] = useState<number>(
    candidate.durationMinutes || defaultDurationMinutes || 45
  );
  // Each interviewer strictly receives their own quota of interviews
  const [interviewerEmails, setInterviewerEmails] = useState(
    candidate.assignedInterviewer ||
      candidate.scheduledInterviewerId ||
      (candidate.interviewerEmails && candidate.interviewerEmails[0]) ||
      defaultInterviewers ||
      'm.mattiulhasnain@gmail.com'
  );
  const [selectedTrackId, setSelectedTrackId] = useState<string>(
    candidate.trackId || 'track-alpha'
  );
  const selectedTrack = getTrackById(selectedTrackId);

  const [isDraftMode, setIsDraftMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedBookingLink, setCopiedBookingLink] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    meetLink?: string;
    error?: string;
    calendarInviteSent?: boolean;
    gmailComposeUrl?: string;
    emailSent?: boolean;
    senderEmail?: string;
    draftId?: string;
    emailError?: string;
  } | null>(null);

  const handleCopyBookingLink = () => {
    const bookingUrl = `${window.location.origin}${window.location.pathname}?book=${candidate.id}`;
    navigator.clipboard.writeText(bookingUrl);
    setCopiedBookingLink(true);
    setTimeout(() => setCopiedBookingLink(false), 2000);
  };

  const role = candidate.position || 'Software Engineer';
  const pktTimeStr = formatPktDateTime(selectedTime);
  const candidateLocalTimeStr = candidateTz
    ? formatInTimezone(selectedTime, candidateTz, { includeAbbr: true })
    : formatLocalDateTime(selectedTime);
  const localTimeStr = formatLocalDateTime(selectedTime);
  const durationStr = `${durationMinutes} minutes`;

  // Multi-Track Concurrency & Conflict Evaluation
  const slotEval = evaluateMultiTrackSlot(
    selectedTime,
    durationMinutes,
    selectedTrackId,
    interviewerEmails,
    allCandidates,
    candidate.id,
    4
  );

  const conflicts = findSlotConflicts(
    selectedTime,
    durationMinutes,
    allCandidates,
    candidate.id,
    selectedTrackId,
    interviewerEmails,
    4
  );

  const handlePickNextFreeSlot = () => {
    const nextSlot = findNextFreeSlot(
      selectedTime,
      durationMinutes,
      allCandidates,
      candidate.id,
      selectedTrackId
    );
    setSelectedTime(nextSlot);
  };

  // Live generated email subject and body dynamically reflecting current template, candidate details, timezone, and duration
  const previewSubject = generateEmailSubject(candidate.name, role, isReschedule);

  const previewBody = renderEmailBody(currentTemplate, {
    candidateName: candidate.name,
    candidateEmail: candidate.email,
    role,
    scheduledIsoTime: selectedTime,
    candidateTimezone: candidateTz,
    durationMinutes,
    interviewerEmails,
    meetLink: result?.meetLink || candidate.meetLink,
    isReschedule,
    trackName: selectedTrack.name,
  });

  const handleCopySubject = () => {
    navigator.clipboard.writeText(previewSubject);
    setCopiedSubject(true);
    setTimeout(() => setCopiedSubject(false), 2000);
  };

  const handleCopyFullEmail = () => {
    const fullText = `Subject: ${previewSubject}\nFrom: hr@mihora.tech (Titan Mail)\nTo: ${candidate.email}\nCc: ${interviewerEmails}\n\n${previewBody}`;
    navigator.clipboard.writeText(fullText);
    setCopiedFull(true);
    setTimeout(() => setCopiedFull(false), 2000);
  };

  const handleResetTemplate = () => {
    setCurrentTemplate(defaultTemplate || getDefaultEmailTemplate(isReschedule));
  };

  const handleInsertToken = (token: string) => {
    setCurrentTemplate((prev) => `${prev} ${token}`);
  };

  const isTemplateModified =
    currentTemplate.trim() !==
    (defaultTemplate || getDefaultEmailTemplate(isReschedule)).trim();

  const handleAction = async (draft: boolean) => {
    setIsSubmitting(true);
    setIsDraftMode(draft);
    setResult(null);

    try {
      const res = await onSchedule(
        candidate.id!,
        draft,
        selectedTime,
        currentTemplate,
        interviewerEmails,
        isReschedule,
        durationMinutes,
        selectedTrack.id,
        selectedTrack.name
      );
      setResult(res);

      if (res.success && !res.error && res.emailSent) {
        setTimeout(() => {
          onClose();
        }, 2200);
      }
    } catch (err: any) {
      setResult({ success: false, error: err.message || 'Scheduling failed' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyMeetLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyEmailContent = () => {
    const fullText = `Subject: ${previewSubject}\nTo: ${candidate.email}\nCc: ${interviewerEmails}\n\n${previewBody}`;
    navigator.clipboard.writeText(fullText);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 overflow-hidden animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Pinned Header */}
        <div className="p-5 sm:p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-bold font-display text-gray-900 flex items-center gap-2">
              {isReschedule ? (
                <>
                  <CalendarClock className="w-5 h-5 text-amber-600" />
                  <span>Reschedule Interview</span>
                </>
              ) : (
                <>
                  <Calendar className="w-5 h-5 text-indigo-600" />
                  <span>Schedule Interview</span>
                </>
              )}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Candidate: <span className="font-semibold text-gray-800">{candidate.name}</span> ({candidate.email})
              {isReschedule && (
                <span className="ml-2 text-amber-700 font-medium bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded text-[10px]">
                  Reschedule Mode
                </span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">

        {/* Status result banner */}
        {result && (
          <div
            className={`p-4 rounded-xl text-xs space-y-3 ${
              result.success
                ? 'bg-emerald-50 text-emerald-950 border border-emerald-200'
                : 'bg-red-50 text-red-950 border border-red-200'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {result.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-bold text-sm">
                  {result.success
                    ? isReschedule
                      ? 'Interview Rescheduled Successfully!'
                      : 'Interview Scheduled Successfully!'
                    : 'Scheduling Encountered an Issue'}
                </p>
                {result.success ? (
                  <div className="text-[11px] space-y-1 mt-1">
                    {result.emailSent && (
                      <p className="text-emerald-800 font-semibold flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-emerald-600" />
                        Email dispatched from <span className="underline">{result.senderEmail || 'hr@mihora.tech'}</span> to {candidate.email}
                      </p>
                    )}
                    <p className="text-emerald-800">
                      ✓ Google Calendar event synchronized with Google Meet video link &amp; interviewer panel notified.
                    </p>
                  </div>
                ) : (
                  <div className="text-[11px] space-y-1 mt-1 text-red-800">
                    <p>{result.error || 'Google Calendar failed to synchronize.'}</p>
                    {result.error?.includes('401') && (
                      <p className="font-semibold text-red-900 mt-1">
                        Tip: Click "Connect Calendar" at the top header to refresh your Google OAuth session.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Meet link card */}
            {result.meetLink && (
              <div className="bg-white/80 border border-emerald-200 rounded-lg p-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 truncate">
                  <Video className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <a
                    href={result.meetLink}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-xs text-emerald-900 underline truncate hover:text-emerald-700"
                  >
                    {result.meetLink}
                  </a>
                </div>
                <button
                  type="button"
                  onClick={() => copyMeetLink(result.meetLink!)}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-100 text-emerald-800 rounded-md hover:bg-emerald-200 transition-colors flex items-center gap-1 cursor-pointer flex-shrink-0"
                >
                  <Copy className="w-3 h-3" />
                  {copiedLink ? 'Copied' : 'Copy Meet Link'}
                </button>
              </div>
            )}

            {/* Quick Actions & Manual Backup */}
            <div className="bg-white/90 border border-emerald-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-800 flex items-center gap-1.5 text-xs sm:text-sm">
                  <Mail className="w-3.5 h-3.5 text-indigo-600" />
                  {result.senderEmail ? `Sender: ${result.senderEmail}` : 'Email Notification'}
                </span>
                {result.emailSent ? (
                  <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-600" />
                    Delivered to Candidate
                  </span>
                ) : result.draftId ? (
                  <span className="text-[10px] text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                    Saved in Gmail Drafts
                  </span>
                ) : result.emailError ? (
                  <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    Manual Dispatch Required
                  </span>
                ) : (
                  <span className="text-[10px] text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                    Scheduled &amp; Ready
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={copyEmailContent}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copiedEmail ? 'Copied to Clipboard!' : 'Copy Email Text'}
                </button>
                {result.gmailComposeUrl && (
                  <a
                    href={result.gmailComposeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open in Webmail
                  </a>
                )}
              </div>
            </div>

            {result.error && (
              <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 p-2 rounded-lg">
                Notice: {result.error} (Google Calendar event was synchronized successfully).
              </p>
            )}
          </div>
        )}

        {/* Worldwide Timezone Selector & Verification */}
        <div className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-3.5 space-y-2">
          <TimezoneSelector
            value={candidateTz}
            suggestedCountry={candidate.country}
            label={`Candidate Time Zone (${candidate.name})`}
            onChange={(tz, tzInfo) => {
              setCandidateTz(tz);
              setCandidateTzLabel(`${tzInfo.abbr || tzInfo.utcOffsetStr} (${tzInfo.city})`);
            }}
            helperText="Candidate's time zone used for email invitations and calendar notifications."
          />
        </div>

        {/* Date Time Picker */}
        <div className="bg-gray-50 border border-gray-200/80 rounded-xl p-4">
          <DateTimePicker
            value={selectedTime}
            onChange={setSelectedTime}
            candidates={allCandidates}
            currentCandidateId={candidate.id}
            candidateTimezone={candidateTz}
            candidateTimezoneLabel={candidateTzLabel}
            candidateName={candidate.name}
            label={isReschedule ? 'Select New Interview Slot' : 'Select Interview Slot'}
          />
        </div>

        {/* Meeting Duration Selection */}
        <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-700" />
              Interview Meeting Duration
            </label>
            <span className="text-xs font-mono font-bold text-amber-900 bg-amber-100/80 border border-amber-300 px-2.5 py-0.5 rounded-md">
              {durationMinutes} minutes
            </span>
          </div>

          {/* Quick preset chips */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
            {[15, 30, 45, 60, 90, 120].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => setDurationMinutes(mins)}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                  durationMinutes === mins
                    ? 'bg-amber-600 text-white border-amber-700 shadow-xs ring-2 ring-amber-400/40'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-amber-50 hover:border-amber-300'
                }`}
              >
                {mins < 60 ? `${mins}m` : mins === 60 ? '1 hr' : `${mins / 60} hrs`}
              </button>
            ))}
          </div>

          {/* Calculated End-Time preview */}
          <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-amber-900/90 pt-1 border-t border-amber-200/60 font-medium">
            <span>Interview Window (PKT):</span>
            <span className="font-mono font-bold text-amber-950">
              {formatPktDateTime(selectedTime)} &rarr;{' '}
              {formatPktDateTime(new Date(new Date(selectedTime).getTime() + durationMinutes * 60000).toISOString())}
            </span>
          </div>
        </div>

        {/* Multi-Track / Concurrent Interview Suite */}
        <div className="bg-gradient-to-br from-indigo-50/70 via-purple-50/40 to-blue-50/60 border border-indigo-200/90 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
          {/* Header & Concurrency Meter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-lg bg-indigo-600 text-white shadow-xs">
                  <Zap className="w-4 h-4" />
                </span>
                <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                  Multi-System Concurrent Track Engine
                </h4>
              </div>
              <p className="text-[11px] text-indigo-700/90 mt-0.5">
                Multiple interviewers can conduct parallel interviews in the same time slot across isolated tracks.
              </p>
            </div>

            {/* Live Concurrency Slot Badge */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span
                className={`text-[11px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1.5 shadow-2xs ${
                  slotEval.isCapacityExceeded
                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                    : slotEval.concurrentCount > 0
                    ? 'bg-purple-100 text-purple-800 border-purple-300'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full animate-pulse ${
                    slotEval.isCapacityExceeded
                      ? 'bg-rose-600'
                      : slotEval.concurrentCount > 0
                      ? 'bg-purple-600'
                      : 'bg-emerald-600'
                  }`}
                />
                <span>
                  {slotEval.concurrentCount} of {slotEval.maxCapacity} Parallel Tracks Used
                </span>
              </span>
            </div>
          </div>

          {/* Capacity Progress Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-semibold text-indigo-900">
              <span>Slot Concurrency Capacity</span>
              <span>
                {slotEval.concurrentCount >= slotEval.maxCapacity
                  ? 'Slot Full'
                  : `${slotEval.maxCapacity - slotEval.concurrentCount} Tracks Free`}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-indigo-100 overflow-hidden flex gap-0.5 p-0.5">
              {Array.from({ length: slotEval.maxCapacity }).map((_, idx) => {
                const isOccupied = idx < slotEval.concurrentCount;
                return (
                  <div
                    key={idx}
                    className={`flex-1 h-full rounded-sm transition-all duration-300 ${
                      isOccupied
                        ? slotEval.isCapacityExceeded
                          ? 'bg-rose-500'
                          : 'bg-indigo-600'
                        : 'bg-indigo-200/50'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* Interactive Track Selection Cards */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-indigo-950 flex items-center justify-between">
              <span>Assign Interview Track / Room:</span>
              <span className="text-[10px] font-normal text-indigo-600">
                Selected: <strong className="font-bold">{selectedTrack.name}</strong>
              </span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {DEFAULT_INTERVIEW_TRACKS.map((track) => {
                const isSelected = selectedTrackId === track.id;
                const occupyingCandidate = slotEval.occupiedTracks.find(
                  (o) => o.track.id === track.id
                )?.candidate;
                const isOccupied = Boolean(occupyingCandidate);

                return (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => setSelectedTrackId(track.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? isOccupied
                          ? 'bg-rose-50/90 border-rose-400 ring-2 ring-rose-400/40 shadow-sm'
                          : 'bg-white border-indigo-500 ring-2 ring-indigo-500/30 shadow-sm'
                        : isOccupied
                        ? 'bg-stone-50/80 border-stone-200 text-stone-600 hover:border-stone-300'
                        : 'bg-white/80 border-indigo-100 hover:border-indigo-300 hover:bg-white text-gray-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${track.badgeBg}`}>
                            {track.shortCode}
                          </span>
                          <span className="font-bold text-xs text-gray-900 truncate">
                            {track.panelName}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1 line-clamp-1">
                          {track.description}
                        </p>
                      </div>

                      {/* Live Availability Tag */}
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 border ${
                          isOccupied
                            ? 'bg-rose-100 text-rose-800 border-rose-200'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        {isOccupied ? '🔴 Occupied' : '🟢 Free'}
                      </span>
                    </div>

                    {/* Occupying Candidate Notice */}
                    {isOccupied && (
                      <div className="mt-2 pt-1.5 border-t border-rose-100 text-[10px] text-rose-700 flex items-center justify-between">
                        <span className="truncate">
                          Booked by: <strong>{occupyingCandidate?.name}</strong>
                        </span>
                        <span className="text-[9px] opacity-80 shrink-0">
                          {occupyingCandidate?.durationMinutes || 45}m
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Concurrent Status Reassurance or Conflict Alert */}
          {slotEval.hasHardConflict ? (
            <div className="bg-rose-50 border-2 border-rose-300 rounded-xl p-3.5 space-y-2.5 animate-in shake duration-200">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-xs">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-rose-950 uppercase tracking-wider">
                      {slotEval.isCapacityExceeded
                        ? 'Slot Capacity Reached'
                        : slotEval.hasInterviewerCollision
                        ? 'Interviewer Double-Booking Collision'
                        : 'Track Collision Detected'}
                    </h5>
                    <span className="text-[10px] font-bold bg-rose-200 text-rose-900 px-2 py-0.5 rounded-full">
                      Action Required
                    </span>
                  </div>
                  <p className="text-rose-800 mt-1 font-medium">
                    {slotEval.statusMessage}
                  </p>

                  {/* Conflicting Candidates List */}
                  {conflicts.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {conflicts.map((conf, idx) => (
                        <div
                          key={idx}
                          className="bg-white/90 border border-rose-200 rounded-lg p-2 flex items-center justify-between gap-2"
                        >
                          <div>
                            <span className="font-bold text-stone-900">{conf.conflictingCandidate.name}</span>{' '}
                            <span className="text-stone-500 text-[10px]">({conf.details})</span>
                          </div>
                          <span className="font-mono font-bold text-rose-900 text-[10px] bg-rose-100 px-2 py-0.5 rounded">
                            {formatPktDateTime(conf.startIso)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons to Resolve Conflict */}
              <div className="pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-rose-200/60">
                <span className="text-[11px] text-rose-700">
                  Quick Conflict Resolution:
                </span>
                <div className="flex items-center gap-2">
                  {slotEval.availableTracks.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedTrackId(slotEval.availableTracks[0].id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Switch to {slotEval.availableTracks[0].shortCode} (Free)</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handlePickNextFreeSlot}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>Next Open Slot</span>
                  </button>
                </div>
              </div>
            </div>
          ) : slotEval.isAllowedConcurrent ? (
            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex items-start gap-2.5 text-xs text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <span>⚡ Allowed Concurrent Interview Approved</span>
                  <span className="text-[10px] bg-emerald-200/80 px-2 py-0.2 rounded-full font-bold">
                    Zero Conflict
                  </span>
                </div>
                <p className="mt-0.5 text-emerald-800">
                  This interview will take place concurrently with <strong>{slotEval.concurrentCount}</strong> other active session(s) in this same time slot on <strong>{selectedTrack.name}</strong>. Data will sync in real time across the workspace.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white/80 border border-indigo-100 rounded-xl p-2.5 flex items-center gap-2 text-xs text-indigo-900">
              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>
                <strong>{selectedTrack.name}</strong> is completely open for this slot.
              </span>
            </div>
          )}
        </div>

        {/* Interviewers Panel & CC section */}
        <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-600" />
              Interviewer Panel (Calendar Guests &amp; Email CC)
            </label>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-600" />
              Auto-Invited &amp; CC&apos;d
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {['m.mattiulhasnain@gmail.com', 'mihora.tech@gmail.com'].map((email) => (
              <span
                key={email}
                className="bg-white border border-indigo-200 text-indigo-900 text-xs px-2.5 py-1 rounded-lg font-medium shadow-2xs flex items-center gap-1.5"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                {email}
              </span>
            ))}
          </div>

          <div className="space-y-1">
            <input
              type="text"
              value={interviewerEmails}
              onChange={(e) => setInterviewerEmails(e.target.value)}
              placeholder="Interviewer emails separated by commas"
              className="w-full border border-indigo-200 rounded-lg text-xs p-2 bg-white font-mono text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
            <p className="text-[11px] text-gray-500">
              Both <span className="font-semibold text-indigo-900">m.mattiulhasnain@gmail.com</span> and{' '}
              <span className="font-semibold text-indigo-900">mihora.tech@gmail.com</span> are automatically added as Google Calendar guests and kept in CC on all invitation emails.
            </p>
          </div>
        </div>

        {/* Calendar Connection Status */}
        <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-indigo-600" />
            <div>
              <span className="font-semibold text-gray-900">Google Workspace Sync: </span>
              <span className="text-gray-600">
                {isCalendarConnected
                  ? 'Connected with Google Calendar & Meet'
                  : 'Needs Google Calendar authorization'}
              </span>
            </div>
          </div>
          {!isCalendarConnected && (
            <button
              type="button"
              onClick={onConnectCalendar}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-3 py-1.5 rounded-lg text-xs transition-colors shadow-sm cursor-pointer"
            >
              Connect Calendar
            </button>
          )}
        </div>

        {/* Live Email Preview & Template Customization Suite */}
        <div className="border border-indigo-100/80 rounded-2xl p-4 sm:p-5 space-y-4 bg-gradient-to-b from-white to-gray-50/50 shadow-xs text-xs">
          {/* Section Header & View Mode Segmented Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-150 pb-3.5">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Mail className="w-4 h-4" />
                </span>
                <span className="font-bold text-sm text-gray-900">
                  Live Generated Email Preview
                </span>
                <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-500" />
                  Live Sync
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Rendered with candidate details, selected timezone (<span className="font-semibold text-gray-700">{candidateTz}</span>), and active template.
              </p>
            </div>

            {/* Segmented Tab Controls */}
            <div className="inline-flex bg-gray-150/70 p-1 rounded-xl gap-1 shrink-0 self-start sm:self-center">
              <button
                type="button"
                onClick={() => setPreviewTab('rich')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  previewTab === 'rich'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Formatted Email</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewTab('plain')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  previewTab === 'plain'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span>Plain Text</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewTab('edit')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  previewTab === 'edit'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Customize Template</span>
                {isTemplateModified && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Customized" />
                )}
              </button>
            </div>
          </div>

          {/* Envelope Header Metadata Bar */}
          <div className="bg-white border border-gray-200/90 rounded-xl p-3 space-y-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">From:</span>
                <span className="font-semibold text-gray-900 flex items-center gap-1.5">
                  hr@mihora.tech
                  <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                    Titan Mail SMTP (Verified)
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyFullEmail}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md transition-colors cursor-pointer"
                  title="Copy full email content with headers"
                >
                  {copiedFull ? (
                    <>
                      <CheckCheck className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-700">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-gray-500" />
                      <span>Copy Full Email</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-0.5">
              <div className="truncate">
                <span className="font-bold text-gray-500 uppercase tracking-wider mr-1.5">To:</span>
                <span className="font-medium text-gray-800">{candidate.name} &lt;{candidate.email}&gt;</span>
              </div>
              <div className="truncate sm:text-right">
                <span className="font-bold text-gray-500 uppercase tracking-wider mr-1.5">CC:</span>
                <span className="font-medium text-indigo-700">{interviewerEmails || 'None'}</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 bg-gray-50/80 px-2.5 py-1.5 rounded-lg border border-gray-100 text-[11px]">
              <div className="flex items-center gap-1.5 truncate">
                <span className="font-bold text-gray-600 uppercase tracking-wider shrink-0">Subject:</span>
                <span className="font-semibold text-gray-900 truncate">{previewSubject}</span>
              </div>
              <button
                type="button"
                onClick={handleCopySubject}
                className="shrink-0 text-gray-400 hover:text-gray-700 p-1 rounded hover:bg-gray-200 transition-colors cursor-pointer"
                title="Copy subject line"
              >
                {copiedSubject ? (
                  <Check className="w-3 h-3 text-emerald-600" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>

          {/* TAB 1: Formatted Rich Email Preview */}
          {previewTab === 'rich' && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-inner max-h-96 overflow-y-auto space-y-4">
              {/* Branded Header Inside Email */}
              <div className="flex items-center justify-between border-b-2 border-indigo-600 pb-3">
                <div>
                  <h3 className="text-base font-bold text-indigo-700 tracking-tight">Mihora Tech</h3>
                  <p className="text-[11px] text-gray-500 font-medium">Talent Acquisition &amp; Recruitment</p>
                </div>
                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                    isReschedule
                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                      : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                  }`}
                >
                  {isReschedule ? '⚠️ Rescheduled Interview' : '📅 Interview Invitation'}
                </span>
              </div>

              {/* Email Body Content */}
              <div className="space-y-3 text-xs leading-relaxed text-gray-800">
                <p className="font-medium">
                  Hi <span className="font-bold text-gray-900">{candidate.name}</span>,
                </p>

                <p className="text-gray-700">
                  {isReschedule ? (
                    <span className="text-amber-800 font-semibold bg-amber-50 border border-amber-200 px-2 py-1 rounded inline-block">
                      ⚠️ Please note: Your interview schedule for the {role} position has been updated to the slot below.
                    </span>
                  ) : (
                    <span>
                      We are pleased to invite you to an interview for the{' '}
                      <strong className="text-indigo-950 font-bold">{role}</strong> position at Mihora Tech.
                    </span>
                  )}
                </p>

                {/* Formatted Key-Value Details Card */}
                <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 space-y-2.5 my-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5 border-b border-slate-200/80 pb-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    Interview Details &amp; Timezone Conversion
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {/* Candidate local time */}
                    <div className="bg-white border border-slate-200 p-2.5 rounded-lg space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-indigo-600 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Candidate Local Time
                        </span>
                        <span className="text-[9px] font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200">
                          {candidateTzLabel || candidateTz}
                        </span>
                      </div>
                      <p className="font-bold text-gray-900 text-xs">
                        {candidateLocalTimeStr}
                      </p>
                    </div>

                    {/* Pakistan Standard Time */}
                    <div className="bg-white border border-slate-200 p-2.5 rounded-lg space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-emerald-700 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Pakistan Time (PKT)
                        </span>
                        <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">
                          UTC+5
                        </span>
                      </div>
                      <p className="font-bold text-gray-900 text-xs font-mono">
                        {pktTimeStr}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-[10px] text-gray-500 block uppercase font-bold">Role:</span>
                      <span className="font-semibold text-gray-900">{role}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 block uppercase font-bold">Duration:</span>
                      <span className="font-semibold text-gray-900">{durationStr}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 block uppercase font-bold">Assigned Track / Room:</span>
                      <span className="font-semibold text-indigo-700 flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${selectedTrack.badgeBg}`}>
                          {selectedTrack.shortCode}
                        </span>
                        <span>{selectedTrack.panelName}</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 block uppercase font-bold">Interview Panel (CC):</span>
                      <span className="font-mono text-gray-700 text-[11px] truncate block mt-0.5">{interviewerEmails || 'None'}</span>
                    </div>
                  </div>
                </div>

                {/* Call To Action Meeting Link Box */}
                <div className="text-center py-3 px-2 bg-gradient-to-b from-indigo-50/50 to-slate-50 border border-indigo-100 rounded-xl space-y-1.5">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold shadow-xs text-xs">
                    <Video className="w-4 h-4" />
                    <span>Join Google Meet Interview</span>
                  </div>
                  <p className="text-[11px] text-gray-500 font-mono">
                    {result?.meetLink || candidate.meetLink || '(Google Meet video link is generated automatically upon sending)'}
                  </p>
                </div>

                <p className="text-[11px] text-gray-600">
                  Please join the Google Meet link 5 minutes prior to the scheduled time. If this time slot does not work for you, simply reply directly to this email to coordinate an alternative slot.
                </p>

                <div className="border-t border-gray-150 pt-2.5 text-[11px] text-gray-500 space-y-0.5">
                  <p className="font-semibold text-gray-800">Best regards,</p>
                  <p className="text-gray-700 font-medium">Mihora Tech Hiring Team</p>
                  <p className="text-gray-500 font-mono text-[10px]">hr@mihora.tech</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Plain Text Preview */}
          {previewTab === 'plain' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-gray-500">
                <span>Exact RFC text format delivered to email clients:</span>
                <button
                  type="button"
                  onClick={handleCopyFullEmail}
                  className="font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  {copiedFull ? 'Copied to Clipboard!' : 'Copy Plain Text'}
                </button>
              </div>
              <div className="bg-gray-900 text-emerald-400 p-4 rounded-xl font-mono text-[11px] leading-relaxed max-h-80 overflow-y-auto whitespace-pre-wrap select-all">
Subject: {previewSubject}
From: hr@mihora.tech (Titan Mail)
To: {candidate.email}
Cc: {interviewerEmails}

{previewBody}
              </div>
            </div>
          )}

          {/* TAB 3: Customize Template Editor */}
          {previewTab === 'edit' && (
            <div className="space-y-3 bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-gray-900 text-xs">
                    Template Customization for this Interview
                  </h4>
                  <p className="text-[11px] text-gray-500">
                    Add custom instructions or modify wording. Tokens update dynamically.
                  </p>
                </div>
                {isTemplateModified && (
                  <button
                    type="button"
                    onClick={handleResetTemplate}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset to Default
                  </button>
                )}
              </div>

              {/* Placeholder insertion chips */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                  Click to Insert Placeholder Token:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {TEMPLATE_PLACEHOLDERS.map((ph) => (
                    <button
                      key={ph.token}
                      type="button"
                      onClick={() => handleInsertToken(ph.token)}
                      className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors cursor-pointer"
                      title={`${ph.label}: e.g. "${ph.sampleValue}"`}
                    >
                      +{ph.token}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea */}
              <textarea
                value={currentTemplate}
                onChange={(e) => setCurrentTemplate(e.target.value)}
                rows={9}
                className="w-full border border-gray-300 rounded-xl p-3 font-mono text-xs text-gray-900 bg-gray-50/50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 focus:outline-hidden leading-relaxed shadow-inner"
                placeholder="Type your custom email template here..."
              />

              <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
                <span>
                  Words: <strong className="text-gray-800">{currentTemplate.trim().split(/\s+/).filter(Boolean).length}</strong> &bull; Chars:{' '}
                  <strong className="text-gray-800">{currentTemplate.length}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewTab('rich')}
                  className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview Formatted Result &rarr;</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pinned Action Buttons Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-4 sm:p-5 border-t border-gray-100 bg-gray-50/80 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleCopyBookingLink}
            className="px-3 py-1.5 text-xs text-stone-700 bg-white border border-stone-200 hover:bg-stone-50 rounded-xl font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Copy self-service booking link for candidate"
          >
            {copiedBookingLink ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Link className="w-3.5 h-3.5 text-stone-500" />
            )}
            <span>{copiedBookingLink ? 'Copied Link!' : 'Candidate Booking Link'}</span>
          </button>

          {(candidate.suggestedPktTime || result?.success) && (
            <button
              type="button"
              onClick={() => downloadIcsFile({
                ...candidate,
                suggestedPktTime: selectedTime,
                meetLink: result?.meetLink || candidate.meetLink,
              })}
              className="px-3 py-1.5 text-xs text-stone-700 bg-white border border-stone-200 hover:bg-stone-50 rounded-xl font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Download standard RFC 5545 .ics calendar invite"
            >
              <Download className="w-3.5 h-3.5 text-stone-500" />
              <span>Download .ics</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors cursor-pointer"
          >
            {result?.success ? 'Close' : 'Cancel'}
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleAction(true)}
            className="px-4 py-2 text-sm text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-xl font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting && isDraftMode ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            Draft in Gmail
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleAction(false)}
            className={`px-5 py-2 text-sm text-white rounded-xl font-medium flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50 cursor-pointer ${
              isReschedule
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {isSubmitting && !isDraftMode ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isReschedule ? (
              <CalendarClock className="w-4 h-4" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {isReschedule ? 'Send Reschedule' : 'Send Invite (hr@mihora.tech)'}
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
