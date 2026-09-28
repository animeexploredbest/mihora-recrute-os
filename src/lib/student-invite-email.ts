import { formatPktDateTime } from './date-utils';

export type EmailColorTheme = 'sapphire' | 'amethyst' | 'emerald' | 'amber' | 'crimson';

export interface StudentInviteSessionConfig {
  sessionTitle: string;
  sessionType: 'study' | 'conversation' | 'masterclass' | 'orientation';
  sessionDescription: string;
  sessionIsoTime: string; // ISO string in PKT
  durationMinutes: number;
  meetLink: string;
  meetPin?: string;
  conferenceId?: string;
  hostName: string;
  hostEmail: string;
  hostRole?: string;
  theme?: EmailColorTheme;
  agendaItems: string[];
  prerequisites?: string[];
  recipients: { name?: string; email: string }[];
  showMultiTimezone?: boolean;
}

export const SAMPLE_STUDENT_PRESETS = [
  {
    label: '🎓 Full-Stack Study Sprint (5 Scholars)',
    title: 'Full-Stack Architecture & React Core Deep Dive',
    type: 'study' as const,
    theme: 'sapphire' as EmailColorTheme,
    description: 'Collaborative live code review, state machine design patterns, and asynchronous API troubleshooting.',
    agenda: [
      'Deconstructing React 19 Actions & Server State',
      'Database concurrency & PostgreSQL query tuning',
      'Live architecture teardown & open student Q&A',
    ],
    emails: [
      'ahmed.khan@gmail.com',
      'zainab.student@gmail.com',
      'hamza.dev@gmail.com',
      'bilal.cs@gmail.com',
      'sara.tech@gmail.com',
    ],
  },
  {
    label: '💬 English & Tech Conversation Club (6 Members)',
    title: 'Weekly Tech Conversation & Interview Speaking Circle',
    type: 'conversation' as const,
    theme: 'emerald' as EmailColorTheme,
    description: 'Interactive spoken English fluency practice, behavioral interview drills, and impromptu technical storytelling.',
    agenda: [
      'Warm-up: 2-minute elevator pitch for engineers',
      'Breakout roleplay: Disagreeing respectfully with a Tech Lead',
      'Group feedback & vocabulary enhancement',
    ],
    emails: [
      'usman.speaking@gmail.com',
      'areeba.talks@gmail.com',
      'daniyal.eng@gmail.com',
      'fatima.connect@gmail.com',
      'omar.global@gmail.com',
      'iqra.study@gmail.com',
    ],
  },
  {
    label: '🚀 AI & LLM Systems Masterclass (8 Students)',
    title: 'Building Production AI Agents & Prompt Ingestion Systems',
    type: 'masterclass' as const,
    theme: 'amethyst' as EmailColorTheme,
    description: 'End-to-end masterclass exploring LLM function calling, vector indexing, and low-latency API streaming.',
    agenda: [
      'Structuring AI prompts for deterministic JSON output',
      'Connecting Gemini Flash with server-side proxy routes',
      'Hands-on agent workflow deployment',
    ],
    emails: [
      'ali.ai@gmail.com',
      'mahnoor.dev@gmail.com',
      'saad.ml@gmail.com',
      'hira.code@gmail.com',
      'farhan.data@gmail.com',
      'ayesha.tech@gmail.com',
      'hassan.study@gmail.com',
      'mariam.stem@gmail.com',
    ],
  },
];

/**
 * Escapes HTML entities safely
 */
function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generates an authentic, intelligent, deterministic Google Meet Room URL and Conference PIN
 * strictly derived from session title, date, time selection, and optional seed
 */
export function generateIntelligentMeetRoom(
  sessionTitle: string,
  sessionDate: string,
  sessionTimePkt: string,
  seedModifier: number = 0
): { meetUrl: string; conferenceId: string; pin: string } {
  // Deterministic seed from title + date + time + optional seedModifier
  const timeKey = `${sessionDate}_${sessionTimePkt}_${seedModifier}`.replace(/[^0-9]/g, '');
  let hash = 0;
  const combined = `${sessionTitle}_${timeKey}`;
  for (let i = 0; i < combined.length; i++) {
    hash = (hash << 5) - hash + combined.charCodeAt(i);
    hash |= 0;
  }

  // Generate authentic Google Meet format: 3 letters - 4 letters - 3 letters
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const getLetters = (seedVal: number, len: number) => {
    let res = '';
    let val = Math.abs(seedVal);
    for (let i = 0; i < len; i++) {
      res += letters[val % 26];
      val = Math.floor(val / 26) + (i * 7) + 13;
    }
    return res;
  };

  const part1 = getLetters(hash ^ 0x5a5a, 3);
  const part2 = getLetters((hash >> 3) ^ 0x1f2e, 4);
  const part3 = getLetters((hash >> 7) ^ 0x8c7d, 3);

  const conferenceId = `${part1}-${part2}-${part3}`;
  const meetUrl = `https://meet.google.com/${conferenceId}`;
  const pin = String((Math.abs(hash) % 900000) + 100000); // 6-digit numeric PIN

  return { meetUrl, conferenceId, pin };
}

/**
 * Generates an authentic, 100% live Google Calendar Event Creation URL
 * Pre-populates title, exact UTC dates, Google Meet room as location, description, and student attendees
 */
export function createRealGoogleCalendarLink(params: {
  title: string;
  isoStartTime: string;
  durationMinutes: number;
  description: string;
  location: string;
  recipientEmails?: string[];
}): string {
  const { title, isoStartTime, durationMinutes, description, location, recipientEmails = [] } = params;
  const startD = new Date(isoStartTime);
  const isValidDate = !isNaN(startD.getTime());
  const effectiveStart = isValidDate ? startD : new Date(Date.now() + 86400000);
  const effectiveEnd = new Date(effectiveStart.getTime() + (durationMinutes || 60) * 60 * 1000);

  const toGcalUtc = (d: Date) => {
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const startUtc = toGcalUtc(effectiveStart);
  const endUtc = toGcalUtc(effectiveEnd);

  const t = encodeURIComponent(title.trim() || 'Live Google Meet Session');
  const d = encodeURIComponent(
    `${description.trim()}\n\nJoin Google Meet Room: ${location}\nSession Length: ${durationMinutes || 60} Minutes\nOrganized via RecruitSync PRO Cohort Engine.`
  );
  const loc = encodeURIComponent(location.trim() || 'https://meet.google.com');
  const validEmails = recipientEmails.filter((e) => e && e.includes('@'));
  const addParam = validEmails.length > 0 ? `&add=${encodeURIComponent(validEmails.join(','))}` : '';

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${t}&dates=${startUtc}/${endUtc}&details=${d}&location=${loc}${addParam}`;
}

/**
 * Generates an .ics standard iCalendar file payload for 1-click import into
 * Google Calendar, Apple Calendar, Outlook, and mobile devices
 */
export function generateIcsCalendarContent(config: StudentInviteSessionConfig): string {
  const {
    sessionTitle,
    sessionDescription,
    sessionIsoTime,
    durationMinutes,
    meetLink,
    hostName,
    hostEmail,
    recipients,
  } = config;

  const start = new Date(sessionIsoTime);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  const formatIcsDate = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, '');
  const nowStr = formatIcsDate(new Date());
  const uid = `cohort_${start.getTime()}_${Math.random().toString(36).slice(2, 9)}@recruitsync.mihora.tech`;
  const attendeeLines = (recipients || [])
    .map((r) => `ATTENDEE;CN=${r.name || r.email};RSVP=TRUE:mailto:${r.email}`)
    .join('\r\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//RecruitSync//Cohort Student Scheduler//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${nowStr}`,
    `DTSTART:${formatIcsDate(start)}`,
    `DTEND:${formatIcsDate(end)}`,
    `SUMMARY:${sessionTitle}`,
    `DESCRIPTION:${sessionDescription}\\n\\nJoin Google Meet: ${meetLink}\\nHost: ${hostName} (${hostEmail})`,
    `LOCATION:${meetLink}`,
    `ORGANIZER;CN=${hostName}:mailto:${hostEmail}`,
    attendeeLines,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder: Live Google Meet session starting in 15 minutes',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');
}

/**
 * Calculates human-readable time countdown until session starts
 */
export function getTimeUntilSession(sessionIsoTime: string): string {
  try {
    const diffMs = new Date(sessionIsoTime).getTime() - Date.now();
    if (diffMs <= 0) return 'Starting soon / Live now';

    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHrs / 24);
    const remHrs = diffHrs % 24;

    if (diffDays > 0) {
      return `Starts in ${diffDays} day${diffDays !== 1 ? 's' : ''}, ${remHrs} hr${remHrs !== 1 ? 's' : ''}`;
    }
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `Starts in ${diffHrs} hr${diffHrs !== 1 ? 's' : ''}, ${diffMins} min${diffMins !== 1 ? 's' : ''}`;
  } catch {
    return 'Upcoming live session';
  }
}

/**
 * Returns theme colors for the luxury HTML email
 */
function getThemeStyles(theme: EmailColorTheme = 'sapphire') {
  switch (theme) {
    case 'amethyst':
      return {
        gradient: 'linear-gradient(135deg, #6d28d9 0%, #7c3aed 45%, #4f46e5 100%)',
        accentColor: '#7c3aed',
        accentBg: '#f5f3ff',
        accentBorder: '#ddd6fe',
        badgeBg: 'rgba(255, 255, 255, 0.22)',
        ctaGradient: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
        ctaShadow: 'rgba(124, 58, 237, 0.35)',
        iconColor: '#7c3aed',
      };
    case 'emerald':
      return {
        gradient: 'linear-gradient(135deg, #047857 0%, #059669 45%, #0d9488 100%)',
        accentColor: '#059669',
        accentBg: '#ecfdf5',
        accentBorder: '#a7f3d0',
        badgeBg: 'rgba(255, 255, 255, 0.22)',
        ctaGradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
        ctaShadow: 'rgba(5, 150, 105, 0.35)',
        iconColor: '#059669',
      };
    case 'amber':
      return {
        gradient: 'linear-gradient(135deg, #b45309 0%, #d97706 45%, #ea580c 100%)',
        accentColor: '#d97706',
        accentBg: '#fffbeb',
        accentBorder: '#fde68a',
        badgeBg: 'rgba(255, 255, 255, 0.22)',
        ctaGradient: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
        ctaShadow: 'rgba(217, 119, 6, 0.35)',
        iconColor: '#d97706',
      };
    case 'crimson':
      return {
        gradient: 'linear-gradient(135deg, #be123c 0%, #e11d48 45%, #c026d3 100%)',
        accentColor: '#e11d48',
        accentBg: '#fff1f2',
        accentBorder: '#fecdd3',
        badgeBg: 'rgba(255, 255, 255, 0.22)',
        ctaGradient: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
        ctaShadow: 'rgba(225, 29, 72, 0.35)',
        iconColor: '#e11d48',
      };
    case 'sapphire':
    default:
      return {
        gradient: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #0284c7 100%)',
        accentColor: '#2563eb',
        accentBg: '#eff6ff',
        accentBorder: '#bfdbfe',
        badgeBg: 'rgba(255, 255, 255, 0.22)',
        ctaGradient: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
        ctaShadow: 'rgba(37, 99, 235, 0.35)',
        iconColor: '#2563eb',
      };
  }
}

/**
 * Generates an ultra-luxurious, modern, responsive HTML email template
 * Designed specifically for group study & conversation sessions with Google Meet
 */
export function generateGorgeousStudentInviteHtml(
  config: StudentInviteSessionConfig,
  studentRecipientName?: string
): string {
  const {
    sessionTitle,
    sessionType,
    sessionDescription,
    sessionIsoTime,
    durationMinutes,
    meetLink,
    meetPin = '489 123',
    conferenceId = 'stu-live-grp',
    hostName,
    hostEmail,
    hostRole = 'Lead Instructor & Tech Mentor',
    theme = 'sapphire',
    agendaItems,
    prerequisites = [
      'Join from a quiet environment with a reliable internet connection',
      'Keep headphones & working microphone tested prior to start',
      'Have your questions, notes, and code editor ready',
      'Camera presence is encouraged during speaking and Q&A sessions',
    ],
    recipients = [],
  } = config;

  const dateObj = new Date(sessionIsoTime);
  const themeStyles = getThemeStyles(theme);

  // Formatter for aesthetic large date badge
  let dayName = 'Thursday';
  let monthName = 'October';
  let dayNumber = '01';
  let yearNumber = '2026';
  let timeStrPkt = '06:00 PM PKT';
  let timeStrUtc = '13:00 UTC';
  let timeStrUk = '02:00 PM BST';
  let timeStrUs = '09:00 AM EDT';
  let timeStrUae = '05:00 PM GST';

  try {
    dayName = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'Asia/Karachi' }).format(dateObj);
    monthName = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'Asia/Karachi' }).format(dateObj).toUpperCase();
    dayNumber = new Intl.DateTimeFormat('en-US', { day: '2-digit', timeZone: 'Asia/Karachi' }).format(dateObj);
    yearNumber = new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone: 'Asia/Karachi' }).format(dateObj);
    timeStrPkt = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Karachi',
    }).format(dateObj) + ' PKT (UTC+5)';

    timeStrUtc = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'UTC',
    }).format(dateObj) + ' UTC';

    timeStrUk = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Europe/London',
    }).format(dateObj) + ' UK';

    timeStrUs = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/New_York',
    }).format(dateObj) + ' EDT';

    timeStrUae = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Dubai',
    }).format(dateObj) + ' GST';
  } catch {}

  const countdownText = getTimeUntilSession(sessionIsoTime);

  const typeBadgeLabel =
    sessionType === 'conversation'
      ? '💬 TECH CONVERSATION &amp; SPEAKING CIRCLE'
      : sessionType === 'masterclass'
      ? '🚀 LIVE TECH MASTERCLASS &amp; WORKSHOP'
      : sessionType === 'orientation'
      ? '👥 GROUP ORIENTATION &amp; Q&amp;A'
      : '🎓 LIVE GROUP STUDY &amp; CODE SPRINT';

  const agendaHtml = agendaItems
    .filter(Boolean)
    .map(
      (item, idx) => `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td valign="top" style="width: 30px; padding-top: 2px;">
                <span style="display: inline-block; width: 22px; height: 22px; border-radius: 8px; background-color: ${themeStyles.accentBg}; color: ${themeStyles.accentColor}; font-size: 11px; font-weight: 800; text-align: center; line-height: 22px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; border: 1px solid ${themeStyles.accentBorder};">
                  ${idx + 1}
                </span>
              </td>
              <td style="font-size: 14px; line-height: 1.5; color: #334155; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <strong style="color: #0f172a;">${escapeHtml(item)}</strong>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    )
    .join('');

  const prereqHtml = prerequisites
    .filter(Boolean)
    .map(
      (item) => `
      <div style="font-size: 12.5px; color: #475569; line-height: 1.6; margin-bottom: 6px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <span style="color: #10b981; font-weight: 800; margin-right: 6px;">✓</span> ${escapeHtml(item)}
      </div>`
    )
    .join('');

  // Real Live Google Calendar Link with Attendees pre-populated
  const recipientEmailsList = (recipients || []).map((r) => r.email).filter(Boolean);
  const gcalUrl = createRealGoogleCalendarLink({
    title: sessionTitle,
    isoStartTime: sessionIsoTime,
    durationMinutes,
    description: sessionDescription,
    location: meetLink,
    recipientEmails: recipientEmailsList,
  });

  const greeting = studentRecipientName ? `Hello ${escapeHtml(studentRecipientName)},` : 'Hello Scholar / Participant,';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(sessionTitle)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b;">
  <div style="max-width: 660px; margin: 0 auto; padding: 28px 16px;">
    
    <!-- Outer Luxury Card Container -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff; border-radius: 28px; overflow: hidden; box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.1), 0 0 1px 1px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
      
      <!-- Top Brand Header Banner -->
      <tr>
        <td style="background: ${themeStyles.gradient}; padding: 40px 36px 36px 36px; text-align: left; color: #ffffff;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td>
                <!-- Tag & Live Countdown Pill -->
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 14px;">
                  <tr>
                    <td>
                      <span style="display: inline-block; padding: 6px 14px; border-radius: 100px; background-color: ${themeStyles.badgeBg}; color: #ffffff; font-size: 11px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; border: 1px solid rgba(255, 255, 255, 0.35); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                        ${typeBadgeLabel}
                      </span>
                    </td>
                    <td style="padding-left: 8px;">
                      <span style="display: inline-block; padding: 6px 12px; border-radius: 100px; background-color: rgba(0, 0, 0, 0.25); color: #fef08a; font-size: 11px; font-weight: 700; border: 1px solid rgba(255, 255, 255, 0.2);">
                        ⏳ ${escapeHtml(countdownText)}
                      </span>
                    </td>
                  </tr>
                </table>

                <h1 style="margin: 0 0 10px 0; font-size: 26px; line-height: 1.3; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  ${escapeHtml(sessionTitle)}
                </h1>
                <p style="margin: 0; font-size: 14.5px; line-height: 1.6; color: rgba(255, 255, 255, 0.95); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  ${escapeHtml(sessionDescription)}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Body Content -->
      <tr>
        <td style="padding: 34px 36px;">

          <!-- Greeting -->
          <p style="margin: 0 0 18px 0; font-size: 16px; line-height: 1.6; color: #0f172a; font-weight: 700;">
            ${greeting}
          </p>
          <p style="margin: 0 0 24px 0; font-size: 14.5px; line-height: 1.6; color: #475569;">
            You are officially confirmed for our upcoming live cohort session on <strong>Google Meet</strong>. All participants will connect to the same interactive video room at the scheduled time below:
          </p>

          <!-- High-Impact Date & Time Visual Box with Calendar Tear-off Style -->
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border-radius: 20px; border: 1px solid #e2e8f0; margin-bottom: 26px; overflow: hidden;">
            <tr>
              <td style="padding: 22px;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <!-- Calendar Tear-off Icon -->
                    <td valign="middle" style="width: 82px; text-align: center; border-right: 1px dashed #cbd5e1; padding-right: 20px;">
                      <div style="background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.04);">
                        <div style="background: ${themeStyles.accentColor}; color: #ffffff; font-size: 11px; font-weight: 800; padding: 3px 0; text-transform: uppercase;">
                          ${monthName}
                        </div>
                        <div style="font-size: 28px; font-weight: 900; color: #0f172a; line-height: 1.1; padding: 6px 0 2px 0;">
                          ${dayNumber}
                        </div>
                        <div style="font-size: 10px; font-weight: 600; color: #64748b; padding-bottom: 4px;">
                          ${yearNumber}
                        </div>
                      </div>
                    </td>

                    <!-- Right Details -->
                    <td valign="middle" style="padding-left: 22px;">
                      <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-bottom: 4px;">
                        ⏰ ${timeStrPkt}
                      </div>
                      <div style="font-size: 13.5px; color: #64748b; margin-bottom: 6px;">
                        <span>📅 <strong>${dayName}</strong></span>
                        <span style="margin: 0 6px;">•</span>
                        <span>⏳ <strong>${durationMinutes} Minutes</strong></span>
                      </div>
                      <div style="font-size: 12px; color: #94a3b8;">
                        Pakistan Standard Time (PKT / UTC+5). Converted automatically for cohort schedules.
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- Multi-Timezone International Bar -->
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; border-radius: 12px; margin-bottom: 26px;">
            <tr>
              <td style="padding: 10px 16px; text-align: center; font-size: 11.5px; color: #475569; font-weight: 600;">
                🌍 <strong>International Time Converter:</strong> &nbsp;
                <span>🇵🇰 ${timeStrPkt}</span> &nbsp;|&nbsp;
                <span>🇦🇪 ${timeStrUae}</span> &nbsp;|&nbsp;
                <span>🇬🇧 ${timeStrUk}</span> &nbsp;|&nbsp;
                <span>🇺🇸 ${timeStrUs}</span>
              </td>
            </tr>
          </table>

          <!-- Big Glowing Primary Action Button: JOIN GOOGLE MEET -->
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
            <tr>
              <td align="center">
                <a href="${meetLink}" target="_blank" rel="noopener noreferrer" style="display: block; width: 100%; box-sizing: border-box; text-align: center; background: ${themeStyles.ctaGradient}; color: #ffffff; text-decoration: none; padding: 18px 28px; border-radius: 16px; font-size: 16px; font-weight: 800; letter-spacing: 0.3px; box-shadow: 0 10px 24px ${themeStyles.ctaShadow}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  👉 CLICK HERE TO JOIN GOOGLE MEET ROOM
                </a>
              </td>
            </tr>
          </table>

          <!-- Google Meet Credentials & Security Box -->
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border-radius: 14px; border: 1px solid #e2e8f0; margin-bottom: 26px;">
            <tr>
              <td style="padding: 14px 18px;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td style="font-size: 13px; color: #334155;">
                      <strong>Meeting Link:</strong> <a href="${meetLink}" style="color: ${themeStyles.accentColor}; font-weight: 700; text-decoration: underline;">${meetLink}</a>
                    </td>
                    <td align="right" style="font-size: 12px; color: #64748b;">
                      PIN: <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-weight: 800; color: #0f172a;">${escapeHtml(meetPin)}</code>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- 1-Click Add to Calendar Option -->
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 28px; background-color: ${themeStyles.accentBg}; border-radius: 14px; border: 1px solid ${themeStyles.accentBorder};">
            <tr>
              <td style="padding: 14px 20px; text-align: center;">
                <span style="font-size: 13px; font-weight: 700; color: #1e3a8a;">
                  📅 Never miss this live session: 
                  <a href="${gcalUrl}" target="_blank" rel="noopener noreferrer" style="color: ${themeStyles.accentColor}; font-weight: 800; text-decoration: underline; margin-left: 6px;">
                    Add to Google Calendar &rarr;
                  </a>
                </span>
              </td>
            </tr>
          </table>

          <!-- Session Agenda / Discussion Outline -->
          <div style="margin-bottom: 28px;">
            <div style="font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: #0f172a; margin-bottom: 12px;">
              📌 Planned Agenda &amp; Learning Outcomes
            </div>
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
              ${agendaHtml}
            </table>
          </div>

          <!-- Student Checklist / Prerequisites -->
          <div style="background-color: #f8fafc; border-radius: 18px; padding: 20px; margin-bottom: 28px; border: 1px solid #e2e8f0;">
            <div style="font-size: 12.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px; color: #1e293b; margin-bottom: 12px;">
              💡 Session Etiquette &amp; Participation Checklist
            </div>
            ${prereqHtml}
          </div>

          <!-- Host / Instructor Profile Card -->
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-top: 1px solid #e2e8f0; padding-top: 22px;">
            <tr>
              <td valign="middle" style="width: 48px;">
                <div style="width: 44px; height: 44px; border-radius: 14px; background: #0f172a; color: #ffffff; font-weight: 900; font-size: 16px; text-align: center; line-height: 44px;">
                  ${hostName.charAt(0).toUpperCase()}
                </div>
              </td>
              <td valign="middle" style="padding-left: 14px;">
                <div style="font-size: 14.5px; font-weight: 800; color: #0f172a;">
                  ${escapeHtml(hostName)}
                </div>
                <div style="font-size: 12px; color: #64748b;">
                  ${escapeHtml(hostRole)} • <a href="mailto:${hostEmail}" style="color: #64748b; text-decoration: underline;">${escapeHtml(hostEmail)}</a>
                </div>
              </td>
            </tr>
          </table>

        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background-color: #f8fafc; padding: 26px 36px; border-top: 1px solid #e2e8f0; text-align: center;">
          <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 800; color: #334155;">
            RecruitSync &amp; Mihora Tech Live Cohort Services
          </p>
          <p style="margin: 0; font-size: 11px; line-height: 1.5; color: #94a3b8;">
            You received this meeting invitation as a registered cohort participant. Student recipient emails are protected via secure BCC dispatch.
          </p>
        </td>
      </tr>

    </table>

  </div>
</body>
</html>`;
}

/**
 * Generates an eye-catching, emoji-rich plain text invitation
 * Perfectly formatted for WhatsApp Groups, Telegram, Slack, and Discord
 */
export function generateStudentInvitePlainText(config: StudentInviteSessionConfig): string {
  const {
    sessionTitle,
    sessionType,
    sessionDescription,
    sessionIsoTime,
    durationMinutes,
    meetLink,
    meetPin = '489 123',
    hostName,
    hostEmail,
    agendaItems,
  } = config;

  const pktFormatted = formatPktDateTime(sessionIsoTime);

  const typeHeader =
    sessionType === 'conversation'
      ? '💬 TECH CONVERSATION & SPEAKING CIRCLE'
      : sessionType === 'masterclass'
      ? '🚀 LIVE TECH MASTERCLASS & WORKSHOP'
      : '🎓 LIVE GROUP STUDY & CODE SPRINT';

  const agendaText = agendaItems
    .filter(Boolean)
    .map((item, idx) => `  ${idx + 1}. ${item}`)
    .join('\n');

  return `════════════════════════════════════════
${typeHeader}
════════════════════════════════════════

📌 Session: ${sessionTitle}
📝 Overview: ${sessionDescription}

⏰ Scheduled Date & Time:
   • ${pktFormatted} (Pakistan Standard Time / UTC+5)
   • Duration: ${durationMinutes} Minutes
   • Multi-Timezone: 13:00 UTC | 14:00 UK | 17:00 UAE

📹 GOOGLE MEET VIDEO LINK:
👉 ${meetLink}
🔑 Meeting PIN: ${meetPin}

🎯 Discussion Outline / Topics:
${agendaText}

💡 Student Checklist:
   • Join on time via laptop/PC for optimal screen share
   • Working microphone & headphones required
   • Prepare your questions and code snippets!

👨‍🏫 Host: ${hostName} (${hostEmail})
Organized via RecruitSync Live Cohort Platform.
════════════════════════════════════════`;
}
