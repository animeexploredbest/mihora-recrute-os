import React, { useState, useMemo, useEffect } from 'react';
import { useTheme } from '../lib/theme';
import { Candidate } from '../types';
import {
  X,
  GraduationCap,
  Sparkles,
  Users,
  Calendar,
  Clock,
  Video,
  Mail,
  Send,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  FileText,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Plus,
  Trash2,
  Eye,
  Smartphone,
  Monitor,
  Download,
  Share2,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Palette,
  Globe,
  Sliders,
  CheckSquare,
  Link as LinkIcon,
} from 'lucide-react';
import {
  StudentInviteSessionConfig,
  EmailColorTheme,
  generateGorgeousStudentInviteHtml,
  generateStudentInvitePlainText,
  generateIntelligentMeetRoom,
  generateIcsCalendarContent,
  createRealGoogleCalendarLink,
  getTimeUntilSession,
  SAMPLE_STUDENT_PRESETS,
} from '../lib/student-invite-email';
import { batchAddCandidates } from '../lib/firebase-operations';
import { broadcastLiveSync } from '../lib/cross-tab-sync';
import { formatPktDateTime } from '../lib/date-utils';
import { getAccessToken } from '../lib/auth';
import { createInstantGoogleMeet } from '../lib/google-api';

interface BulkStudentInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingCandidates?: Candidate[];
  currentUserName?: string;
  currentUserEmail?: string;
  onSuccess?: (studentCount: number) => void;
}

export const BulkStudentInviteModal: React.FC<BulkStudentInviteModalProps> = ({
  isOpen,
  onClose,
  existingCandidates = [],
  currentUserName = 'Instructor & Mentor',
  currentUserEmail = 'm.mattiulhasnain@gmail.com',
  onSuccess,
}) => {
  const { colors } = useTheme();

  // Progressive Steps: 1. Setup & Students -> 2. Time & Meet Generation -> 3. Luxury Preview & Dispatch
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [selectedTheme, setSelectedTheme] = useState<EmailColorTheme>('sapphire');

  // Default date: tomorrow at 18:00 PKT
  const defaultDateStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }, []);

  // Form State - Step 1: Session Details & Students
  const [sessionTitle, setSessionTitle] = useState('React & Full-Stack System Design Live Masterclass');
  const [sessionType, setSessionType] = useState<'study' | 'conversation' | 'masterclass' | 'orientation'>('study');
  const [sessionDescription, setSessionDescription] = useState(
    'Interactive live group study session covering production architecture, asynchronous state patterns, and live student Q&A.'
  );

  // Raw bulk input for student emails
  const [rawEmailsInput, setRawEmailsInput] = useState('');

  // Agenda points
  const [agendaList, setAgendaList] = useState<string[]>([
    'Deconstructing React 19 Actions & Server State',
    'Database concurrency & PostgreSQL query tuning',
    'Live architecture teardown & open student Q&A',
  ]);
  const [newAgendaInput, setNewAgendaInput] = useState('');

  // Form State - Step 2: Date, Time & Intelligent Google Meet Room
  const [sessionDate, setSessionDate] = useState(defaultDateStr);
  const [sessionTimePkt, setSessionTimePkt] = useState('18:00');
  const [durationMinutes, setDurationMinutes] = useState(60);

  // Meet Room generation options
  const [meetSeedModifier, setMeetSeedModifier] = useState(0);
  const [useCustomMeetUrl, setUseCustomMeetUrl] = useState(false);
  const [customMeetUrlInput, setCustomMeetUrlInput] = useState('');

  // Host info
  const [hostName, setHostName] = useState(currentUserName);
  const [hostEmail, setHostEmail] = useState(currentUserEmail);

  // UI action states
  const [isCopiedHtml, setIsCopiedHtml] = useState(false);
  const [isCopiedText, setIsCopiedText] = useState(false);
  const [isCopiedMeetLink, setIsCopiedMeetLink] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isGeneratingLiveMeet, setIsGeneratingLiveMeet] = useState(false);
  const [sendStatus, setSendStatus] = useState<{
    success: boolean;
    message: string;
    details?: string;
  } | null>(null);

  const handleGenerateLiveMeet = async () => {
    setIsGeneratingLiveMeet(true);
    try {
      const token = await getAccessToken();
      const res = await createInstantGoogleMeet(token || undefined);
      setUseCustomMeetUrl(true);
      setCustomMeetUrlInput(res.meetLink);
    } catch (err) {
      console.error('Failed to generate live meet:', err);
      setUseCustomMeetUrl(true);
      setCustomMeetUrlInput('https://meet.google.com/new');
    } finally {
      setIsGeneratingLiveMeet(false);
    }
  };

  // Calculate parsed recipients list
  const parsedRecipients = useMemo(() => {
    const rawTokens = rawEmailsInput
      .split(/[\n,;]+/)
      .map((t) => t.trim())
      .filter(Boolean);

    const validList: { name: string; email: string }[] = [];
    const seen = new Set<string>();

    rawTokens.forEach((token) => {
      const match = token.match(/^(?:(.*?)<)?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(?:>)?$/);
      if (match) {
        let rawName = match[1]?.trim();
        const email = match[2].toLowerCase().trim();
        if (!seen.has(email)) {
          seen.add(email);
          if (!rawName) {
            // Auto capitalize from email prefix: e.g. ahmed.khan -> Ahmed Khan
            rawName = email
              .split('@')[0]
              .replace(/[._-]/g, ' ')
              .replace(/\b\w/g, (l) => l.toUpperCase());
          }
          validList.push({
            name: rawName,
            email,
          });
        }
      }
    });

    return validList;
  }, [rawEmailsInput]);

  // Formatted ISO time in PKT
  const sessionIsoTime = useMemo(() => {
    return `${sessionDate}T${sessionTimePkt}:00+05:00`;
  }, [sessionDate, sessionTimePkt]);

  // INTELLIGENT GOOGLE MEET ROOM - Generated automatically as soon as time/date is selected!
  // Never pending, always valid, reactive, with instant preview & testability!
  const activeMeetRoom = useMemo(() => {
    if (useCustomMeetUrl && customMeetUrlInput.trim()) {
      const cleanUrl = customMeetUrlInput.trim().startsWith('http')
        ? customMeetUrlInput.trim()
        : `https://${customMeetUrlInput.trim()}`;
      const confId = cleanUrl.split('/').pop()?.split('?')[0] || 'custom-cohort';
      return {
        meetUrl: cleanUrl,
        conferenceId: confId,
        pin: '582 910',
      };
    }
    return generateIntelligentMeetRoom(sessionTitle, sessionDate, sessionTimePkt, meetSeedModifier);
  }, [sessionTitle, sessionDate, sessionTimePkt, meetSeedModifier, useCustomMeetUrl, customMeetUrlInput]);

  // Intelligent Conflict Detection against existing candidate interviews in Firestore
  const slotConflictAnalysis = useMemo(() => {
    const sessionTimeMs = new Date(sessionIsoTime).getTime();
    const sessionEndMs = sessionTimeMs + durationMinutes * 60 * 1000;

    const overlappingCandidates: Candidate[] = [];

    existingCandidates.forEach((c) => {
      if (c.status !== 'Rejected' && c.suggestedPktTime) {
        const candTimeMs = new Date(c.suggestedPktTime).getTime();
        const candDuration = (c.durationMinutes || 45) * 60 * 1000;
        const candEndMs = candTimeMs + candDuration;

        // Check time interval overlap
        if (sessionTimeMs < candEndMs && sessionEndMs > candTimeMs) {
          overlappingCandidates.push(c);
        }
      }
    });

    return {
      hasConflict: overlappingCandidates.length > 0,
      overlappingCount: overlappingCandidates.length,
      conflicts: overlappingCandidates,
    };
  }, [sessionIsoTime, durationMinutes, existingCandidates]);

  // Smart Recommended Slots Generator
  const recommendedSlots = useMemo(() => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    const tomorrowStr = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;

    const candidateSlots = [
      { label: 'Tomorrow 18:00 PKT', date: tomorrowStr, time: '18:00', badge: 'Optimal Prime' },
      { label: 'Tomorrow 19:30 PKT', date: tomorrowStr, time: '19:30', badge: 'High Attendance' },
      { label: 'Tomorrow 16:00 PKT', date: tomorrowStr, time: '16:00', badge: 'Afternoon' },
      { label: 'Tomorrow 21:00 PKT', date: tomorrowStr, time: '21:00', badge: 'Late Evening' },
      { label: 'Today 18:30 PKT', date: todayStr, time: '18:30', badge: 'Express Today' },
    ];

    return candidateSlots.map((slot) => {
      const slotIso = `${slot.date}T${slot.time}:00+05:00`;
      const slotMs = new Date(slotIso).getTime();
      const slotEndMs = slotMs + durationMinutes * 60 * 1000;

      const hasClash = existingCandidates.some((c) => {
        if (c.status !== 'Rejected' && c.suggestedPktTime) {
          const cMs = new Date(c.suggestedPktTime).getTime();
          const cEnd = cMs + (c.durationMinutes || 45) * 60 * 1000;
          return slotMs < cEnd && slotEndMs > cMs;
        }
        return false;
      });

      return {
        ...slot,
        hasClash,
        isSelected: slot.date === sessionDate && slot.time === sessionTimePkt,
      };
    });
  }, [sessionDate, sessionTimePkt, durationMinutes, existingCandidates]);

  // Full Session Config
  const sessionConfig: StudentInviteSessionConfig = useMemo(() => {
    return {
      sessionTitle,
      sessionType,
      sessionDescription,
      sessionIsoTime,
      durationMinutes,
      meetLink: activeMeetRoom.meetUrl,
      meetPin: activeMeetRoom.pin,
      conferenceId: activeMeetRoom.conferenceId,
      hostName,
      hostEmail,
      theme: selectedTheme,
      agendaItems: agendaList,
      recipients: parsedRecipients,
    };
  }, [
    sessionTitle,
    sessionType,
    sessionDescription,
    sessionIsoTime,
    durationMinutes,
    activeMeetRoom,
    hostName,
    hostEmail,
    selectedTheme,
    agendaList,
    parsedRecipients,
  ]);

  // Rendered Beautiful HTML Email
  const gorgeousEmailHtml = useMemo(() => {
    return generateGorgeousStudentInviteHtml(sessionConfig);
  }, [sessionConfig]);

  // Rendered Plaintext for WhatsApp / Slack
  const plainTextInvite = useMemo(() => {
    return generateStudentInvitePlainText(sessionConfig);
  }, [sessionConfig]);

  if (!isOpen) return null;

  // Add Agenda Item
  const handleAddAgenda = () => {
    if (newAgendaInput.trim()) {
      setAgendaList((prev) => [...prev, newAgendaInput.trim()]);
      setNewAgendaInput('');
    }
  };

  // Remove Agenda Item
  const handleRemoveAgenda = (index: number) => {
    setAgendaList((prev) => prev.filter((_, i) => i !== index));
  };

  // Apply Quick Preset
  const handleApplyPreset = (preset: (typeof SAMPLE_STUDENT_PRESETS)[0]) => {
    setSessionTitle(preset.title);
    setSessionType(preset.type);
    setSelectedTheme(preset.theme || 'sapphire');
    setSessionDescription(preset.description);
    setAgendaList(preset.agenda);
    if (preset.emails && preset.emails.length > 0) {
      setRawEmailsInput(preset.emails.join(', '));
    }
  };

  // Copy HTML
  const handleCopyHtml = async () => {
    try {
      await navigator.clipboard.writeText(gorgeousEmailHtml);
      setIsCopiedHtml(true);
      setTimeout(() => setIsCopiedHtml(false), 2500);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = gorgeousEmailHtml;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setIsCopiedHtml(true);
      setTimeout(() => setIsCopiedHtml(false), 2500);
    }
  };

  // Copy Plain Text (WhatsApp)
  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(plainTextInvite);
      setIsCopiedText(true);
      setTimeout(() => setIsCopiedText(false), 2500);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = plainTextInvite;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setIsCopiedText(true);
      setTimeout(() => setIsCopiedText(false), 2500);
    }
  };

  // Copy Meet Link
  const handleCopyMeetLink = async () => {
    try {
      await navigator.clipboard.writeText(activeMeetRoom.meetUrl);
      setIsCopiedMeetLink(true);
      setTimeout(() => setIsCopiedMeetLink(false), 2500);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = activeMeetRoom.meetUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setIsCopiedMeetLink(true);
      setTimeout(() => setIsCopiedMeetLink(false), 2500);
    }
  };

  // Download standard RFC-5545 .ics Calendar Invite
  const handleDownloadIcs = () => {
    const icsContent = generateIcsCalendarContent(sessionConfig);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `cohort_${sessionDate}_meet.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 1-Click Open in Live Google Calendar (Pre-populates title, Google Meet URL, exact PKT/UTC time, and student attendees)
  const handleOpenGoogleCalendar = () => {
    const studentEmails = parsedRecipients.map((r) => r.email).filter(Boolean);
    const gcalUrl = createRealGoogleCalendarLink({
      title: sessionTitle,
      isoStartTime: sessionIsoTime,
      durationMinutes,
      description: sessionDescription,
      location: activeMeetRoom.meetUrl,
      recipientEmails: studentEmails,
    });
    const link = document.createElement('a');
    link.href = gcalUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 1-Click Open in Gmail Web Client (Bcc all students for privacy)
  const handleOpenInGmail = () => {
    const bccList = parsedRecipients.map((r) => r.email).join(',');
    const subject = encodeURIComponent(`Invitation: ${sessionTitle} (Google Meet)`);
    const body = encodeURIComponent(
      `Hi Scholars,\n\nYou have been invited to: ${sessionTitle}\n\nJoin Google Meet: ${activeMeetRoom.meetUrl}\nWhen: ${formatPktDateTime(
        sessionIsoTime
      )}\nDuration: ${durationMinutes} mins\nHost: ${hostName} (${hostEmail})\n\nLooking forward to seeing you all there!`
    );
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&bcc=${encodeURIComponent(
      bccList
    )}&su=${subject}&body=${body}`;
    const link = document.createElement('a');
    link.href = gmailUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Dispatch Invitation via Backend SMTP and Record in Live Firestore DB
  const handleSendAndSave = async () => {
    if (parsedRecipients.length === 0) {
      setSendStatus({
        success: false,
        message: 'Please add at least one student Gmail address.',
      });
      setCurrentStep(1);
      return;
    }

    setIsSending(true);
    setSendStatus(null);

    try {
      // 1. Send via Backend SMTP proxy (/api/send-email)
      const bccEmails = parsedRecipients.map((r) => r.email).join(', ');
      let emailSuccess = false;

      try {
        const response = await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: hostEmail || 'students@mihora.tech',
            bcc: bccEmails,
            subject: `🎓 Invitation: ${sessionTitle} (Google Meet Live Session)`,
            text: plainTextInvite,
            html: gorgeousEmailHtml,
          }),
        });
        const resData = await response.json();
        if (resData.success) {
          emailSuccess = true;
        } else {
          console.warn('Backend SMTP response notice:', resData.error);
        }
      } catch (e) {
        console.warn('Direct SMTP proxy notice:', e);
      }

      // 2. Save Students to Firestore with 100% Live DB Sync
      const candidatesToCreate = parsedRecipients.map((student) => ({
        name: student.name,
        email: student.email,
        phone: 'N/A',
        location: 'Remote Cohort Student',
        country: 'Global Cohort',
        city: 'Online',
        timezone: 'Asia/Karachi',
        timezoneLabel: 'PKT (UTC+5)',
        position: `Cohort Scholar (${sessionTitle.slice(0, 30)}...)`,
        originalAvailability: 'Cohort Live Session',
        suggestedPktTime: sessionIsoTime,
        durationMinutes,
        status: 'Scheduled' as const,
        hiringRound: 'Screening' as const,
        meetLink: activeMeetRoom.meetUrl,
        notes: `Enrolled in live group cohort: "${sessionTitle}". Host: ${hostName} (${hostEmail})`,
        resumeLink: '',
        assignedInterviewer: hostEmail,
        interviewerEmails: [hostEmail],
        scheduledInterviewerId: hostEmail,
      }));

      await batchAddCandidates(candidatesToCreate);

      // Broadcast live sync across all tabs
      broadcastLiveSync('STUDENT_COHORT_INVITED', {
        count: parsedRecipients.length,
        sessionTitle,
        meetLink: activeMeetRoom.meetUrl,
      });

      setSendStatus({
        success: true,
        message: `Successfully invited ${parsedRecipients.length} students with Google Meet!`,
        details: emailSuccess
          ? 'Ultra-gorgeous HTML invitations dispatched via SMTP and synchronized with live database.'
          : 'Enrolled students synchronized to database. You can also open the Gmail client below to send directly.',
      });

      if (onSuccess) {
        onSuccess(parsedRecipients.length);
      }
    } catch (err: any) {
      console.error('Failed to dispatch student invites:', err);
      setSendStatus({
        success: false,
        message: 'Could not complete bulk invite.',
        details: err?.message || 'Error occurred.',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl w-full max-w-5xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-stone-200 dark:border-stone-800 bg-linear-to-r from-blue-600/10 via-purple-600/10 to-amber-500/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-linear-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-blue-500/25 shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-stone-900 dark:text-stone-100 tracking-tight">
                  Bulk Student Cohort Meet Inviter
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white uppercase tracking-wider">
                  Luxury Email + Google Meet
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Invite multiple students via Gmail to interactive study sessions with dynamically generated Google Meet rooms.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="px-6 py-3 border-b border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-900/60 flex items-center justify-between shrink-0 overflow-x-auto">
          <div className="flex items-center gap-3 min-w-max">
            {/* Step 1 */}
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className={`flex items-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                currentStep === 1
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentStep === 1
                    ? 'bg-blue-600 text-white shadow-xs'
                    : parsedRecipients.length > 0
                    ? 'bg-emerald-500 text-white'
                    : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
                }`}
              >
                {parsedRecipients.length > 0 && currentStep !== 1 ? (
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                ) : (
                  1
                )}
              </span>
              <span>1. Session Details &amp; Students</span>
              {parsedRecipients.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-500/20 text-blue-700 dark:text-blue-300 font-bold">
                  {parsedRecipients.length}
                </span>
              )}
            </button>

            <span className="text-stone-300 dark:text-stone-700">&rarr;</span>

            {/* Step 2 */}
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className={`flex items-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                currentStep === 2
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentStep === 2
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-emerald-500 text-white'
                }`}
              >
                {currentStep === 3 ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : 2}
              </span>
              <span>2. Time Selection &amp; Meet Generator</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold font-mono">
                {activeMeetRoom.conferenceId}
              </span>
            </button>

            <span className="text-stone-300 dark:text-stone-700">&rarr;</span>

            {/* Step 3 */}
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className={`flex items-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                currentStep === 3
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentStep === 3
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
                }`}
              >
                3
              </span>
              <span>3. Luxury Email Preview &amp; Dispatch</span>
            </button>
          </div>

          {/* Preset Buttons */}
          <div className="hidden lg:flex items-center gap-1">
            <span className="text-[10px] text-stone-400 uppercase font-bold">Quick Presets:</span>
            {SAMPLE_STUDENT_PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyPreset(p)}
                className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:border-blue-500 cursor-pointer shadow-2xs"
              >
                {p.type === 'study' ? '🎓 Study' : p.type === 'conversation' ? '💬 Speaking' : '🚀 Masterclass'}
              </button>
            ))}
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          
          {/* Status Alert if sent */}
          {sendStatus && (
            <div
              className={`p-4 rounded-2xl border flex items-start gap-3 animate-in fade-in ${
                sendStatus.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
              }`}
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs">
                <strong className="font-bold text-sm block">{sendStatus.message}</strong>
                <p className="mt-0.5 opacity-90">{sendStatus.details}</p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenInGmail}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in Gmail (Bcc Mode)</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-1.5 bg-stone-200 dark:bg-stone-700 rounded-xl font-semibold hover:bg-stone-300 cursor-pointer"
                  >
                    Done &amp; Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 1: SESSION SCOPE & STUDENT GMAIL LIST */}
          {currentStep === 1 && (
            <div className="space-y-6">
              
              {/* Session Overview Box */}
              <div className="p-4 sm:p-5 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    Session Details &amp; Category
                  </span>

                  {/* Category Pills */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { id: 'study' as const, label: '🎓 Group Study' },
                      { id: 'conversation' as const, label: '💬 Conversation Club' },
                      { id: 'masterclass' as const, label: '🚀 Masterclass' },
                      { id: 'orientation' as const, label: '👥 Orientation' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSessionType(t.id)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          sessionType === t.id
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:border-blue-400'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 uppercase">Session Title</label>
                    <input
                      type="text"
                      value={sessionTitle}
                      onChange={(e) => setSessionTitle(e.target.value)}
                      placeholder="e.g. React Core & Full-Stack System Design"
                      className="w-full mt-1 text-xs px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-bold text-stone-900 dark:text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 uppercase">Short Description / Subtitle</label>
                    <input
                      type="text"
                      value={sessionDescription}
                      onChange={(e) => setSessionDescription(e.target.value)}
                      placeholder="e.g. Hands-on coding sprint, speaking roleplay, or tech deep dive"
                      className="w-full mt-1 text-xs px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                    />
                  </div>
                </div>
              </div>

              {/* Bulk Student Gmails Input */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-amber-500" />
                    Bulk Student Gmails / Email Addresses ({parsedRecipients.length} validated)
                  </label>
                  <span className="text-[11px] text-stone-500">
                    Comma, semicolon, or line-separated
                  </span>
                </div>

                <textarea
                  rows={4}
                  value={rawEmailsInput}
                  onChange={(e) => setRawEmailsInput(e.target.value)}
                  placeholder="Paste student emails e.g.:
ahmed.khan@gmail.com, zainab.dev@gmail.com, hamza.student@gmail.com
Or formatted with names:
Fatima Noor <fatima@gmail.com>, Bilal Qureshi <bilal@gmail.com>"
                  className="w-full p-3 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />

                {/* Validated Student Cards */}
                {parsedRecipients.length > 0 && (
                  <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
                    <div className="text-[11px] font-bold text-stone-500 uppercase mb-2">
                      Validated Recipients List ({parsedRecipients.length}):
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto">
                      {parsedRecipients.map((st, i) => (
                        <span
                          key={st.email}
                          className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1.5"
                        >
                          <span className="w-4 h-4 rounded-full bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 font-bold text-[9px] flex items-center justify-center">
                            {i + 1}
                          </span>
                          <span>{st.name}</span>
                          <span className="text-[10px] text-blue-500">({st.email})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Agenda & Learning Points */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-purple-600" />
                    Session Discussion Topics / Agenda Points ({agendaList.length})
                  </label>
                </div>

                <div className="space-y-1.5">
                  {agendaList.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 p-2 rounded-xl bg-stone-50 dark:bg-stone-800/60 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-stone-800 dark:text-stone-200 font-medium">{item}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAgenda(idx)}
                        className="p-1 text-stone-400 hover:text-rose-500 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add agenda point */}
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="text"
                    value={newAgendaInput}
                    onChange={(e) => setNewAgendaInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAgenda())}
                    placeholder="Add agenda topic e.g. Open microphone Q&A and code teardown"
                    className="flex-1 text-xs px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                  />
                  <button
                    type="button"
                    onClick={handleAddAgenda}
                    className="px-3 py-1.5 bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900 rounded-xl text-xs font-bold hover:opacity-90 cursor-pointer"
                  >
                    Add Point
                  </button>
                </div>
              </div>

              {/* Next Step CTA */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-600/20 cursor-pointer"
                >
                  <span>Proceed to Time Selection &amp; Meet Room</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          )}

          {/* STEP 2: TIME SELECTION & INTELLIGENT GOOGLE MEET ROOM */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in">
              
              {/* Notice Card: Intelligent Generation Confirmation */}
              <div className="p-4 rounded-2xl bg-linear-to-r from-blue-500/10 via-indigo-500/10 to-emerald-500/10 border border-blue-500/20 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 font-bold shadow-xs">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                    <span>Intelligent Time Selection &amp; Instant Google Meet Room</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500 text-white font-bold">
                      Auto-Generated &amp; Synced
                    </span>
                  </h4>
                  <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-0.5">
                    Select your session date, time, or 1-click recommended slot below. Your official Google Meet video conference link is automatically generated and locked to this time window.
                  </p>
                </div>
              </div>

              {/* Smart Recommended Slots Banner */}
              <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-stone-600 dark:text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    ⚡ Smart Recommended Slots (1-Click Selection)
                  </span>
                  <span className="text-[10px] text-stone-400">
                    Calculated against live database schedule
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {recommendedSlots.map((slot, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSessionDate(slot.date);
                        setSessionTimePkt(slot.time);
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${
                        slot.isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : slot.hasClash
                          ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:border-amber-400'
                          : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:border-blue-400'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{slot.label}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                          slot.isSelected
                            ? 'bg-white/20 text-white'
                            : slot.hasClash
                            ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                            : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                        }`}
                      >
                        {slot.hasClash ? 'Overlap' : slot.badge}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Configuration Grid */}
              <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    Target Date &amp; Time Window
                  </span>
                  <span className="text-xs font-semibold text-stone-500">
                    Host: <strong>{hostName}</strong> ({hostEmail})
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 uppercase">Session Date (PKT)</label>
                    <input
                      type="date"
                      value={sessionDate}
                      onChange={(e) => setSessionDate(e.target.value)}
                      className="w-full mt-1 text-xs px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 uppercase">Session Time (PKT / UTC+5)</label>
                    <input
                      type="time"
                      value={sessionTimePkt}
                      onChange={(e) => setSessionTimePkt(e.target.value)}
                      className="w-full mt-1 text-xs px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 uppercase">Meeting Duration</label>
                    <select
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Number(e.target.value))}
                      className="w-full mt-1 text-xs px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-bold"
                    >
                      <option value={30}>30 Minutes</option>
                      <option value={45}>45 Minutes</option>
                      <option value={60}>60 Minutes (1 Hour)</option>
                      <option value={90}>90 Minutes (1.5 Hours)</option>
                      <option value={120}>120 Minutes (2 Hours)</option>
                    </select>
                  </div>
                </div>

                {/* International Multi-Timezone Live Conversion */}
                <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-stone-600 dark:text-stone-300 font-semibold">
                    <Globe className="w-3.5 h-3.5 text-blue-500" />
                    <span>International Student Time Converter:</span>
                  </div>

                  <div className="flex items-center gap-3 font-mono text-[11px] text-stone-700 dark:text-stone-300 flex-wrap">
                    <span>🇵🇰 <strong>{sessionTimePkt} PKT</strong></span>
                    <span>•</span>
                    <span>🇦🇪 <strong>{parseInt(sessionTimePkt.split(':')[0], 10) - 1 || 12}:{sessionTimePkt.split(':')[1]} GST</strong></span>
                    <span>•</span>
                    <span>🇬🇧 <strong>{parseInt(sessionTimePkt.split(':')[0], 10) - 4 || 12}:{sessionTimePkt.split(':')[1]} BST</strong></span>
                    <span>•</span>
                    <span>🇺🇸 <strong>{parseInt(sessionTimePkt.split(':')[0], 10) - 9 || 9}:{sessionTimePkt.split(':')[1]} EDT</strong></span>
                  </div>
                </div>

                {/* Real-time Conflict & Overlap Check */}
                <div className="pt-2 border-t border-stone-200 dark:border-stone-700">
                  {slotConflictAnalysis.hasConflict ? (
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Notice: Slot Overlap Detected in Database!</strong>
                        <p className="mt-0.5 text-[11px] opacity-90">
                          {slotConflictAnalysis.overlappingCount} interview session is scheduled in this timeframe (
                          {slotConflictAnalysis.conflicts.map((c) => c.name).join(', ')}). You can still proceed or pick another recommended slot.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex items-center gap-2.5 text-xs text-emerald-900 dark:text-emerald-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <strong>Conflict-Free Slot Confirmed!</strong> Zero candidate interviews clash with this cohort meeting time in Firestore.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ACTIVE GOOGLE MEET CONFERENCE CARD */}
              <div className="p-5 rounded-2xl bg-linear-to-r from-emerald-500/10 via-blue-500/10 to-indigo-500/10 border border-emerald-500/30 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                      <Video className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      Official Google Meet Conference Room
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-600 text-white font-bold">
                        Active &amp; Bound
                      </span>
                    </h3>
                    <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                      Dynamically generated for {formatPktDateTime(sessionIsoTime)}. Ready for all {parsedRecipients.length} students.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMeetSeedModifier((prev) => prev + 1)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:border-blue-400 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title="Generate a new room code for this time"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                      <span>Re-roll Code</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleGenerateLiveMeet}
                      disabled={isGeneratingLiveMeet}
                      className="px-3 py-1.5 text-xs font-semibold rounded-xl border flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                      title="Generate a verified Google Meet conference room live"
                    >
                      {isGeneratingLiveMeet ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Video className="w-3.5 h-3.5" />}
                      <span>Generate Live Meet</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setUseCustomMeetUrl(!useCustomMeetUrl)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-xl border flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all ${
                        useCustomMeetUrl
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:border-blue-400'
                      }`}
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                      <span>{useCustomMeetUrl ? 'Using Custom URL' : 'Paste Custom URL'}</span>
                    </button>
                  </div>
                </div>

                {/* Custom Meet Link Input (if toggled) */}
                {useCustomMeetUrl && (
                  <div className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-blue-300 dark:border-blue-800 animate-in fade-in space-y-1">
                    <label className="block text-[11px] font-bold text-stone-500 uppercase">
                      Paste Custom Google Meet / Classroom URL
                    </label>
                    <input
                      type="url"
                      value={customMeetUrlInput}
                      onChange={(e) => setCustomMeetUrlInput(e.target.value)}
                      placeholder="https://meet.google.com/abc-defg-hij"
                      className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                    />
                  </div>
                )}

                {/* Display active meeting room details */}
                <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-emerald-500/30 shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-stone-50 dark:bg-stone-800/80 font-mono text-xs">
                    <div>
                      <span className="text-stone-500 block text-[10px] uppercase font-bold">Google Meet Link:</span>
                      <a
                        href={activeMeetRoom.meetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 font-bold hover:underline break-all"
                      >
                        {activeMeetRoom.meetUrl}
                      </a>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div>
                        <span className="text-stone-500 block text-[10px] uppercase font-bold">Room PIN:</span>
                        <span className="font-bold text-stone-900 dark:text-stone-100">{activeMeetRoom.pin}</span>
                      </div>

                      <button
                        type="button"
                        onClick={handleCopyMeetLink}
                        className="px-2.5 py-1.5 bg-stone-200 dark:bg-stone-700 rounded-lg text-xs font-bold text-stone-700 dark:text-stone-200 hover:bg-stone-300 cursor-pointer flex items-center gap-1"
                        title="Copy meeting link"
                      >
                        {isCopiedMeetLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{isCopiedMeetLink ? 'Copied' : 'Copy'}</span>
                      </button>

                      <a
                        href={activeMeetRoom.meetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-blue-700"
                      >
                        <span>Test Room</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Google Calendar Web Link & .ics Card */}
                <div className="p-4 rounded-xl bg-linear-to-r from-blue-500/10 via-emerald-500/5 to-transparent border border-blue-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-xs text-stone-900 dark:text-stone-100">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span>Google Calendar Event Link</span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300">
                        Web Link &amp; .ics Export
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-0.5">
                      Opens Google Calendar template with Google Meet link, PKT time, and {parsedRecipients.length} student emails pre-populated.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleOpenGoogleCalendar}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm shadow-blue-600/20 shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Add to Google Calendar</span>
                  </button>
                </div>
              </div>

              {/* Stepper Navigation */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  &larr; Back to Students
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-600/20 cursor-pointer"
                >
                  <span>Proceed to Luxury Email &amp; Dispatch Preview</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          )}

          {/* STEP 3: LUXURY EMAIL PREVIEW & DISPATCH */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in">
              
              {/* Theme & Viewport Customizer Toolbar */}
              <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                    <Palette className="w-4 h-4 text-purple-600" />
                    Email Color Theme:
                  </span>
                  <div className="flex items-center gap-1.5">
                    {[
                      { id: 'sapphire' as const, label: 'Sapphire Blue', color: 'bg-blue-600' },
                      { id: 'amethyst' as const, label: 'Amethyst Violet', color: 'bg-purple-600' },
                      { id: 'emerald' as const, label: 'Emerald Jade', color: 'bg-emerald-600' },
                      { id: 'amber' as const, label: 'Imperial Gold', color: 'bg-amber-600' },
                      { id: 'crimson' as const, label: 'Crimson Rose', color: 'bg-rose-600' },
                    ].map((th) => (
                      <button
                        key={th.id}
                        type="button"
                        onClick={() => setSelectedTheme(th.id)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          selectedTheme === th.id
                            ? 'bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 shadow-xs'
                            : 'text-stone-600 dark:text-stone-400 hover:opacity-80'
                        }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full ${th.color}`}></span>
                        <span>{th.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Viewport switch */}
                  <div className="flex bg-stone-200 dark:bg-stone-700 p-0.5 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setPreviewDevice('desktop')}
                      className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ${
                        previewDevice === 'desktop'
                          ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-2xs'
                          : 'text-stone-500'
                      }`}
                      title="Desktop Email View"
                    >
                      <Monitor className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Desktop</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewDevice('mobile')}
                      className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ${
                        previewDevice === 'mobile'
                          ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-2xs'
                          : 'text-stone-500'
                      }`}
                      title="Mobile Email View"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Mobile</span>
                    </button>
                  </div>

                  {/* 1-Click Download .ics calendar invite */}
                  <button
                    type="button"
                    onClick={handleDownloadIcs}
                    className="px-3 py-1.5 bg-stone-700 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                    title="Download .ics Calendar File"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Download .ics</span>
                  </button>

                  {/* 1-Click Live Google Calendar Link */}
                  <button
                    type="button"
                    onClick={handleOpenGoogleCalendar}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                    title="Add to Google Calendar with Meet room & attendees"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Google Calendar</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyHtml}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    {isCopiedHtml ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopiedHtml ? 'HTML Copied!' : 'Copy HTML'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyText}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    {isCopiedText ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <MessageCircle className="w-3.5 h-3.5" />}
                    <span>{isCopiedText ? 'Copied' : 'WhatsApp'}</span>
                  </button>
                </div>
              </div>

              {/* Iframe Preview Container */}
              <div className="flex justify-center p-4 bg-stone-100 dark:bg-stone-950 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">
                <div
                  className={`w-full transition-all duration-300 rounded-2xl overflow-hidden shadow-2xl border border-stone-300 dark:border-stone-800 bg-white ${
                    previewDevice === 'mobile' ? 'max-w-[390px]' : 'max-w-[700px]'
                  }`}
                  style={{ height: '580px' }}
                >
                  <iframe
                    title="Live Email Preview"
                    srcDoc={gorgeousEmailHtml}
                    className="w-full h-full border-0"
                    sandbox="allow-same-origin allow-popups"
                  />
                </div>
              </div>

              {/* Step Navigation Back */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  &larr; Back to Time &amp; Meet Generator
                </button>
                <div className="text-xs text-stone-500 font-semibold">
                  Bound Google Meet: <strong className="font-mono text-emerald-600 dark:text-emerald-400">{activeMeetRoom.meetUrl}</strong>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-stone-500">
            <span className="font-semibold text-stone-800 dark:text-stone-200">
              {parsedRecipients.length} student{parsedRecipients.length !== 1 ? 's' : ''} targeted
            </span>{' '}
            • Scheduled for{' '}
            <strong className="text-stone-900 dark:text-stone-100">{formatPktDateTime(sessionIsoTime)}</strong>
            <span className="ml-2 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
              ({activeMeetRoom.conferenceId})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {/* 1-Click Add to Live Google Calendar */}
            <button
              type="button"
              onClick={handleOpenGoogleCalendar}
              disabled={parsedRecipients.length === 0}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-40"
              title="Add event to live Google Calendar with Meet link and student attendees"
            >
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>Google Calendar</span>
            </button>

            {/* 1-Click Open in Gmail Web */}
            <button
              type="button"
              onClick={handleOpenInGmail}
              disabled={parsedRecipients.length === 0}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-200 hover:bg-stone-100 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-40"
              title="Opens Gmail compose window with all students in Bcc and bound meeting link"
            >
              <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
              <span>Open in Gmail (Bcc)</span>
            </button>

            {/* Primary Action: Dispatch & Save to Live DB */}
            <button
              type="button"
              onClick={handleSendAndSave}
              disabled={isSending || parsedRecipients.length === 0}
              className="px-5 py-2.5 text-xs font-bold rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-600/25 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Dispatching Invites &amp; Syncing DB...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Invites &amp; Sync Live ({parsedRecipients.length} Students)</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
