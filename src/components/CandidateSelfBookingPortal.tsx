import React, { useState, useMemo } from 'react';
import { Candidate } from '../types';
import { useTheme } from '../lib/theme';
import {
  Calendar,
  Clock,
  Video,
  CheckCircle2,
  Globe,
  Download,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Building2,
  Copy,
  Check,
  X,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { formatPktDateTime, formatLocalDateTime, getPktDateComponents, createPktIso } from '../lib/date-utils';
import { downloadIcsFile, getGoogleCalendarWebLink } from '../lib/ics-utils';
import { updateCandidate, logCandidateActivity } from '../lib/firebase-operations';
import { findSlotConflicts } from '../lib/conflict-detector';
import { TimezoneSelector } from './TimezoneSelector';
import { formatInTimezone, resolveCandidateTimezone } from '../lib/timezone-utils';

interface CandidateSelfBookingPortalProps {
  candidate: Candidate;
  allCandidates: Candidate[];
  isStandalone?: boolean;
  onClose?: () => void;
  onBookingConfirmed?: (updatedCandidate: Candidate) => void;
}

const COMMON_TIMEZONES = [
  { label: 'Pakistan Standard Time (PKT - UTC+5)', value: 'Asia/Karachi' },
  { label: 'US Eastern Time (EST/EDT - UTC-5/UTC-4)', value: 'America/New_York' },
  { label: 'US Pacific Time (PST/PDT - UTC-8/UTC-7)', value: 'America/Los_Angeles' },
  { label: 'US Central Time (CST/CDT - UTC-6/UTC-5)', value: 'America/Chicago' },
  { label: 'UK & London (GMT/BST - UTC+0/UTC+1)', value: 'Europe/London' },
  { label: 'Central European (CET/CEST - UTC+1/UTC+2)', value: 'Europe/Berlin' },
  { label: 'Gulf Standard Time (GST - UTC+4, Dubai)', value: 'Asia/Dubai' },
  { label: 'Saudi Arabia (AST - UTC+3, Riyadh)', value: 'Asia/Riyadh' },
  { label: 'India Standard Time (IST - UTC+5:30)', value: 'Asia/Kolkata' },
  { label: 'Singapore & Malaysia (SGT - UTC+8)', value: 'Asia/Singapore' },
  { label: 'Australia Eastern (AEST - UTC+10)', value: 'Australia/Sydney' },
];

export const CandidateSelfBookingPortal: React.FC<CandidateSelfBookingPortalProps> = ({
  candidate,
  allCandidates,
  isStandalone = false,
  onClose,
  onBookingConfirmed,
}) => {
  const { colors } = useTheme();

  // Detect candidate or browser local timezone
  const defaultTz = useMemo(() => {
    if (candidate.timezone) return candidate.timezone;
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Karachi';
    } catch {
      return 'Asia/Karachi';
    }
  }, [candidate.timezone]);

  const [selectedTimezone, setSelectedTimezone] = useState<string>(defaultTz);
  const [selectedDayOffset, setSelectedDayOffset] = useState<number>(0);
  const [selectedSlotIso, setSelectedSlotIso] = useState<string | null>(null);
  const [candidateNotes, setCandidateNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<boolean>(
    Boolean(candidate.suggestedPktTime && (candidate.status === 'Scheduled' || candidate.status === 'Rescheduled'))
  );
  const [copiedLink, setCopiedLink] = useState(false);

  // Generate the next 4 business days
  const availableDays = useMemo(() => {
    const days: { date: Date; label: string; offset: number }[] = [];
    const now = new Date();
    let offset = 0;
    while (days.length < 4 && offset < 10) {
      const d = new Date(now);
      d.setDate(now.getDate() + offset);
      const dayOfWeek = d.getDay();
      // Exclude Sunday (0) if desired, but allow Saturday / weekdays
      if (dayOfWeek !== 0) {
        const label =
          offset === 0
            ? 'Today'
            : offset === 1
            ? 'Tomorrow'
            : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        days.push({ date: d, label, offset });
      }
      offset++;
    }
    return days;
  }, []);

  // Standard recruiter interview hour slots in PKT (UTC+5)
  // 11:00 AM, 12:30 PM, 2:30 PM, 4:00 PM, 5:30 PM, 7:00 PM, 8:30 PM, 10:00 PM PKT
  const candidateSlots = useMemo(() => {
    const targetDayObj = availableDays[selectedDayOffset] || availableDays[0];
    if (!targetDayObj) return [];

    const pktComponents = getPktDateComponents(targetDayObj.date) || getPktDateComponents(new Date())!;
    const year = pktComponents.year;
    const month = pktComponents.month;
    const day = pktComponents.date;

    // Slot hour/minute pairs in PKT (Pakistan Time is UTC+5)
    const pktSlotTimes = [
      { hour: 11, minute: 0 },
      { hour: 12, minute: 30 },
      { hour: 14, minute: 30 },
      { hour: 16, minute: 0 },
      { hour: 17, minute: 30 },
      { hour: 19, minute: 0 },
      { hour: 20, minute: 30 },
      { hour: 22, minute: 0 },
    ];

    const now = new Date();

    return pktSlotTimes.map((t) => {
      // Create ISO string for PKT time (UTC+05:00) using exact UTC conversion
      const slotIso = createPktIso(year, month, day, t.hour, t.minute);
      const slotDate = new Date(slotIso);

      // Check if past
      const isPast = slotDate.getTime() < now.getTime() + 30 * 60 * 1000; // at least 30 mins from now

      // Check conflict with other scheduled candidates (ignore self if rescheduling)
      const conflicts = findSlotConflicts(
        slotDate.toISOString(),
        candidate.durationMinutes || 45,
        allCandidates,
        candidate.id
      );

      const hasConflict = conflicts.length > 0;

      // Local time formatting for candidate's chosen timezone
      let candidateLocalTime = '';
      try {
        candidateLocalTime = slotDate.toLocaleTimeString('en-US', {
          timeZone: selectedTimezone,
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
      } catch {
        candidateLocalTime = slotDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      }

      const pktFormatted = slotDate.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Karachi',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      return {
        iso: slotDate.toISOString(),
        pktFormatted: `${pktFormatted} PKT`,
        candidateLocalTime,
        isPast,
        hasConflict,
        isAvailable: !isPast && !hasConflict,
      };
    });
  }, [availableDays, selectedDayOffset, selectedTimezone, allCandidates, candidate]);

  const handleConfirmBooking = async () => {
    if (!selectedSlotIso || !candidate.id) return;
    setIsSubmitting(true);
    try {
      // Generate a clean Google Meet room code
      const randCode = `${Math.random().toString(36).substring(2, 5)}-${Math.random()
        .toString(36)
        .substring(2, 6)}-${Math.random().toString(36).substring(2, 5)}`;
      const meetLink = candidate.meetLink || `https://meet.google.com/${randCode}`;

      const updatedPayload: Partial<Candidate> = {
        suggestedPktTime: selectedSlotIso,
        status: 'Scheduled',
        timezone: selectedTimezone,
        meetLink,
        notes: candidateNotes
          ? `${candidate.notes ? `${candidate.notes} | ` : ''}Candidate Self-Booking Note: ${candidateNotes}`
          : candidate.notes,
      };

      await updateCandidate(candidate.id, updatedPayload);

      await logCandidateActivity(
        candidate.id,
        {
          type: 'self_booked',
          details: `Candidate self-booked slot: ${formatPktDateTime(selectedSlotIso)} (${selectedTimezone})`,
          actor: candidate.name || 'Candidate',
        },
        candidate.activities || []
      );

      setConfirmed(true);
      if (onBookingConfirmed) {
        onBookingConfirmed({ ...candidate, ...updatedPayload });
      }
    } catch (err) {
      console.error('Self booking error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    const bookingUrl = `${window.location.origin}${window.location.pathname}?book=${candidate.id}`;
    navigator.clipboard.writeText(bookingUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div
      className={
        isStandalone
          ? 'min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col justify-center items-center p-3 sm:p-6'
          : 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto'
      }
    >
      <div
        className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden transition-all duration-200 ${colors.cardBg} ${colors.border}`}
      >
        {/* Top Header Card */}
        <div className="p-6 sm:p-7 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center font-black text-xl shadow-md">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Mihora Tech Recruitment
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] border border-emerald-500/20">
                    Self-Booking
                  </span>
                </div>
                <h1 className={`text-xl sm:text-2xl font-bold font-display ${colors.textPrimary} tracking-tight`}>
                  Schedule Interview with {candidate.name}
                </h1>
                <p className={`text-xs ${colors.textSecondary} mt-0.5`}>
                  Role: <span className="font-semibold text-amber-700 dark:text-amber-300">{candidate.position || 'Software Engineer'}</span> • Duration: {candidate.durationMinutes || 45} mins
                </p>
              </div>
            </div>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className={`p-2 rounded-xl text-stone-400 hover:${colors.textPrimary} hover:${colors.subtleBg} transition-colors cursor-pointer`}
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-7 space-y-6">
          {/* Confirmed State View */}
          {confirmed && candidate.suggestedPktTime ? (
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-1.5">
                <h2 className={`text-xl font-bold font-display ${colors.textPrimary}`}>
                  Interview Slot Confirmed!
                </h2>
                <p className={`text-sm ${colors.textSecondary} max-w-md mx-auto`}>
                  Your interview slot has been booked and synchronized with our hiring panel's calendar.
                </p>
              </div>

              {/* Slot Details Badge */}
              <div className={`p-4 rounded-2xl border ${colors.subtleBg} ${colors.border} max-w-md mx-auto text-left space-y-2.5`}>
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
                  <Clock className="w-4 h-4" />
                  <span>PKT Time: {formatPktDateTime(candidate.suggestedPktTime)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-300">
                  <Globe className="w-4 h-4 text-stone-400" />
                  <span>Local Time: {formatLocalDateTime(candidate.suggestedPktTime)}</span>
                </div>
                {candidate.meetLink && (
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
                    <div className="flex items-center gap-2 text-xs font-mono truncate text-blue-600 dark:text-blue-400">
                      <Video className="w-4 h-4 shrink-0" />
                      <span className="truncate">{candidate.meetLink}</span>
                    </div>
                    <a
                      href={candidate.meetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shrink-0 shadow-xs"
                    >
                      Join Meet
                    </a>
                  </div>
                )}
              </div>

              {/* Action Buttons: Add to Calendar & ICS */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => downloadIcsFile(candidate)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${colors.subtleBg} ${colors.border} ${colors.textPrimary} hover:brightness-95`}
                >
                  <Download className="w-4 h-4 text-amber-500" />
                  <span>Download .ics Calendar File</span>
                </button>

                <a
                  href={getGoogleCalendarWebLink(candidate)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Add to Google Calendar</span>
                </a>

                <button
                  type="button"
                  onClick={() => setConfirmed(false)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-semibold text-stone-500 hover:${colors.textPrimary} transition-colors cursor-pointer`}
                >
                  Change Slot
                </button>
              </div>
            </div>
          ) : (
            /* Slot Selection Flow */
            <div className="space-y-6">
              {/* Recruiter / Candidate instructions & Worldwide Timezone selector */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                <TimezoneSelector
                  value={selectedTimezone}
                  suggestedCountry={candidate.country}
                  label="Select Your Local Time Zone"
                  onChange={(tz) => setSelectedTimezone(tz)}
                  helperText="All interview slots automatically convert to your local clock time."
                />
              </div>

              {/* Day selection tabs */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider ${colors.textSecondary} mb-2.5`}>
                  1. Select Date
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {availableDays.map((d, idx) => (
                    <button
                      key={d.label}
                      type="button"
                      onClick={() => {
                        setSelectedDayOffset(idx);
                        setSelectedSlotIso(null);
                      }}
                      className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                        selectedDayOffset === idx
                          ? `${colors.accentBg} text-white font-bold shadow-md ring-2 ring-amber-500/40 border-transparent`
                          : `${colors.subtleBg} ${colors.border} ${colors.textSecondary} hover:${colors.textPrimary}`
                      }`}
                    >
                      <div className="text-xs font-bold">{d.label}</div>
                      <div className="text-[11px] opacity-80 mt-0.5">
                        {d.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Slots Grid */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider ${colors.textSecondary} mb-2.5`}>
                  2. Select Available Time Slot
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
                  {candidateSlots.map((slot) => {
                    const isSelected = selectedSlotIso === slot.iso;
                    return (
                      <button
                        key={slot.iso}
                        type="button"
                        disabled={!slot.isAvailable}
                        onClick={() => setSelectedSlotIso(slot.iso)}
                        className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                          !slot.isAvailable
                            ? 'opacity-45 bg-stone-100 dark:bg-stone-900 border-stone-200 dark:border-stone-800 cursor-not-allowed text-stone-400'
                            : isSelected
                            ? `${colors.accentBg} text-white font-bold shadow-sm ring-2 ring-amber-500/40 border-transparent cursor-pointer`
                            : `${colors.cardBg} ${colors.border} hover:border-amber-500/40 cursor-pointer`
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{slot.candidateLocalTime}</span>
                          </div>
                          <div className={`text-[11px] mt-0.5 ${isSelected ? 'text-white/80' : colors.textSecondary}`}>
                            {slot.pktFormatted}
                          </div>
                        </div>

                        {!slot.isAvailable ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-200 dark:bg-stone-800 text-stone-500">
                            {slot.hasConflict ? 'Reserved' : 'Past'}
                          </span>
                        ) : isSelected ? (
                          <Check className="w-4 h-4 text-white" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Optional candidate note */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider ${colors.textSecondary} mb-1.5`}>
                  3. Notes or Phone Confirmation (Optional)
                </label>
                <input
                  type="text"
                  value={candidateNotes}
                  onChange={(e) => setCandidateNotes(e.target.value)}
                  placeholder="e.g., Calling from Lahore / Please call on WhatsApp"
                  className={`w-full text-xs px-3.5 py-2.5 rounded-xl border ${colors.inputBg} ${colors.border} ${colors.textPrimary} focus:ring-2 focus:ring-amber-500`}
                />
              </div>

              {/* Action Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${colors.subtleBg} ${colors.border} ${colors.textSecondary} hover:${colors.textPrimary}`}
                  title="Copy direct self-booking link to share with candidate"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Link Copied!' : 'Copy Candidate Link'}</span>
                </button>

                <button
                  type="button"
                  disabled={!selectedSlotIso || isSubmitting}
                  onClick={handleConfirmBooking}
                  className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all cursor-pointer ${
                    !selectedSlotIso || isSubmitting
                      ? 'opacity-50 cursor-not-allowed bg-stone-400'
                      : `${colors.accentBg} ${colors.accentHover} hover:scale-[1.02]`
                  }`}
                >
                  {isSubmitting ? (
                    <span>Confirming...</span>
                  ) : (
                    <>
                      <span>Confirm &amp; Book Slot</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
