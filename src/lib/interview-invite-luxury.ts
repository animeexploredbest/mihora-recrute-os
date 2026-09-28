import { Candidate } from '../types';
import { ScheduledSlotAllocation } from './auto-scheduler';
import { formatPktDateTime, formatLocalDateTime } from './date-utils';
import { resolveCandidateTimezone, formatInTimezone } from './timezone-utils';

export type LuxuryEmailTheme = 'sapphire' | 'amber' | 'emerald' | 'amethyst' | 'obsidian';

export interface LuxuryEmailThemeStyles {
  headerGradient: string;
  headerShadow: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  accentColor: string;
  accentBg: string;
  accentBorder: string;
  ctaGradient: string;
  ctaShadow: string;
}

export const LUXURY_EMAIL_THEMES: Record<LuxuryEmailTheme, LuxuryEmailThemeStyles> = {
  amber: {
    headerGradient: 'linear-gradient(135deg, #d97706 0%, #b45309 50%, #78350f 100%)',
    headerShadow: 'rgba(217, 119, 6, 0.25)',
    badgeBg: 'rgba(217, 119, 6, 0.12)',
    badgeText: '#92400e',
    badgeBorder: 'rgba(217, 119, 6, 0.25)',
    accentColor: '#d97706',
    accentBg: '#fffbeb',
    accentBorder: '#fde68a',
    ctaGradient: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
    ctaShadow: 'rgba(217, 119, 6, 0.35)',
  },
  sapphire: {
    headerGradient: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 50%, #1e3a8a 100%)',
    headerShadow: 'rgba(37, 99, 235, 0.25)',
    badgeBg: 'rgba(37, 99, 235, 0.12)',
    badgeText: '#1e40af',
    badgeBorder: 'rgba(37, 99, 235, 0.25)',
    accentColor: '#2563eb',
    accentBg: '#eff6ff',
    accentBorder: '#bfdbfe',
    ctaGradient: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    ctaShadow: 'rgba(37, 99, 235, 0.35)',
  },
  emerald: {
    headerGradient: 'linear-gradient(135deg, #059669 0%, #047857 50%, #064e3b 100%)',
    headerShadow: 'rgba(5, 150, 105, 0.25)',
    badgeBg: 'rgba(5, 150, 105, 0.12)',
    badgeText: '#065f46',
    badgeBorder: 'rgba(5, 150, 105, 0.25)',
    accentColor: '#059669',
    accentBg: '#ecfdf5',
    accentBorder: '#a7f3d0',
    ctaGradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    ctaShadow: 'rgba(5, 150, 105, 0.35)',
  },
  amethyst: {
    headerGradient: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 50%, #4c1d95 100%)',
    headerShadow: 'rgba(124, 58, 237, 0.25)',
    badgeBg: 'rgba(124, 58, 237, 0.12)',
    badgeText: '#5b21b6',
    badgeBorder: 'rgba(124, 58, 237, 0.25)',
    accentColor: '#7c3aed',
    accentBg: '#f5f3ff',
    accentBorder: '#ddd6fe',
    ctaGradient: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
    ctaShadow: 'rgba(124, 58, 237, 0.35)',
  },
  obsidian: {
    headerGradient: 'linear-gradient(135deg, #18181b 0%, #27272a 50%, #09090b 100%)',
    headerShadow: 'rgba(0, 0, 0, 0.35)',
    badgeBg: 'rgba(39, 39, 42, 0.15)',
    badgeText: '#27272a',
    badgeBorder: 'rgba(39, 39, 42, 0.3)',
    accentColor: '#18181b',
    accentBg: '#f4f4f5',
    accentBorder: '#e4e4e7',
    ctaGradient: 'linear-gradient(135deg, #18181b 0%, #27272a 100%)',
    ctaShadow: 'rgba(0, 0, 0, 0.4)',
  },
};

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generate Google Calendar Web URL
 */
export function generateGcalWebUrl(
  title: string,
  isoStart: string,
  durationMinutes: number,
  details: string,
  location: string
): string {
  const startD = new Date(isoStart);
  const endD = new Date(startD.getTime() + durationMinutes * 60 * 1000);
  const toUtcStr = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const t = encodeURIComponent(title);
  const d = encodeURIComponent(details);
  const loc = encodeURIComponent(location);
  const dates = `${toUtcStr(startD)}/${toUtcStr(endD)}`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${t}&dates=${dates}&details=${d}&location=${loc}`;
}

/**
 * Generate luxury responsive HTML email for a scheduled candidate interview
 */
export function generateLuxuryInterviewEmailHtml(params: {
  candidateName: string;
  candidateEmail: string;
  position: string;
  scheduledIsoTime: string;
  durationMinutes: number;
  meetLink: string;
  meetPin?: string;
  trackName?: string;
  assignedInterviewer: string;
  candidateTimezone?: string;
  theme?: LuxuryEmailTheme;
  companyName?: string;
}): string {
  const {
    candidateName,
    candidateEmail,
    position,
    scheduledIsoTime,
    durationMinutes,
    meetLink,
    meetPin = '789 421',
    trackName = 'Engineering Track Alpha',
    assignedInterviewer,
    candidateTimezone = 'Asia/Karachi',
    theme = 'amber',
    companyName = 'Mihora Tech & RecruitSync',
  } = params;

  const styles = LUXURY_EMAIL_THEMES[theme] || LUXURY_EMAIL_THEMES.amber;

  const dateObj = new Date(scheduledIsoTime);
  const pktDateStr = formatPktDateTime(scheduledIsoTime);
  const localDateStr = formatInTimezone(scheduledIsoTime, candidateTimezone, { includeAbbr: true });

  const monthShort = dateObj.toLocaleDateString('en-US', { month: 'short', timeZone: 'Asia/Karachi' }).toUpperCase();
  const dayNum = dateObj.toLocaleDateString('en-US', { day: '2-digit', timeZone: 'Asia/Karachi' });
  const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Karachi' });

  const gcalUrl = generateGcalWebUrl(
    `Technical Interview: ${position} - ${candidateName}`,
    scheduledIsoTime,
    durationMinutes,
    `Interview for ${position} with ${assignedInterviewer}.\nGoogle Meet: ${meetLink}\nCandidate: ${candidateName} (${candidateEmail})`,
    meetLink
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Interview Invitation: ${escapeHtml(position)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <div style="max-width: 640px; margin: 24px auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
    
    <!-- Top Gradient Header -->
    <div style="background: ${styles.headerGradient}; padding: 32px 36px 28px; text-align: left; color: #ffffff;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 800; background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; display: inline-block;">
          ⚡ Official Invitation • ${escapeHtml(companyName)}
        </span>
        <span style="font-size: 11px; background: rgba(0,0,0,0.25); padding: 4px 10px; border-radius: 12px; font-weight: 600;">
          Room: ${escapeHtml(trackName)}
        </span>
      </div>
      <h1 style="margin: 0 0 6px 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; line-height: 1.2;">
        Technical Interview Invitation
      </h1>
      <p style="margin: 0; font-size: 14px; opacity: 0.9; font-weight: 400;">
        Position: <strong style="color: #ffffff;">${escapeHtml(position)}</strong>
      </p>
    </div>

    <!-- Content Body -->
    <div style="padding: 32px 36px;">
      
      <!-- Greeting -->
      <p style="font-size: 16px; line-height: 1.6; margin: 0 0 18px 0; color: #334155;">
        Dear <strong>${escapeHtml(candidateName)}</strong>,
      </p>
      <p style="font-size: 14px; line-height: 1.6; margin: 0 0 24px 0; color: #475569;">
        We were impressed by your profile and are delighted to invite you for a live technical discussion. Below are your scheduled session details and Google Meet video link:
      </p>

      <!-- Date & Time Showcase Card -->
      <div style="background-color: ${styles.accentBg}; border: 1.5px solid ${styles.accentBorder}; border-radius: 16px; padding: 20px; margin-bottom: 24px;">
        <div style="display: flex; align-items: center; gap: 20px;">
          
          <!-- Calendar Date Badge -->
          <div style="background-color: #ffffff; border-radius: 14px; padding: 12px 18px; text-align: center; box-shadow: 0 4px 10px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; min-width: 65px;">
            <div style="font-size: 11px; font-weight: 800; color: ${styles.accentColor}; letter-spacing: 1px;">
              ${monthShort}
            </div>
            <div style="font-size: 26px; font-weight: 900; color: #0f172a; line-height: 1.1;">
              ${dayNum}
            </div>
            <div style="font-size: 10px; font-weight: 600; color: #64748b;">
              ${weekday.slice(0, 3)}
            </div>
          </div>

          <!-- Times Details -->
          <div style="flex: 1;">
            <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">
              ⏰ <strong>Your Local Time:</strong> ${escapeHtml(localDateStr)}
            </div>
            <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">
              🇵🇰 <strong>PKT Standard Time:</strong> ${escapeHtml(pktDateStr)}
            </div>
            <div style="font-size: 12px; color: #64748b;">
              ⏳ <strong>Duration:</strong> ${durationMinutes} Minutes &nbsp;•&nbsp; <strong>Interviewer:</strong> ${escapeHtml(assignedInterviewer)}
            </div>
          </div>
        </div>
      </div>

      <!-- Primary Action Button: JOIN GOOGLE MEET -->
      <div style="text-align: center; margin: 28px 0 24px;">
        <a href="${meetLink}" target="_blank" rel="noopener noreferrer" style="background: ${styles.ctaGradient}; color: #ffffff; text-decoration: none; padding: 16px 36px; border-radius: 14px; font-size: 16px; font-weight: 800; display: inline-block; box-shadow: 0 8px 20px ${styles.ctaShadow}; letter-spacing: 0.3px;">
          👉 JOIN GOOGLE MEET INTERVIEW
        </a>
        <div style="margin-top: 10px; font-size: 12px; color: #64748b;">
          Link: <a href="${meetLink}" style="color: ${styles.accentColor}; text-decoration: underline;">${meetLink}</a>
          ${meetPin ? ` &nbsp;•&nbsp; PIN: <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${meetPin}</code>` : ''}
        </div>
      </div>

      <!-- Google Calendar Sync Bar -->
      <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 12px 18px; text-align: center; margin-bottom: 24px; font-size: 12.5px; color: #334155;">
        📅 Add to schedule: 
        <a href="${gcalUrl}" target="_blank" rel="noopener noreferrer" style="color: ${styles.accentColor}; font-weight: 700; text-decoration: underline; margin-left: 6px;">
          Add to Google Calendar &rarr;
        </a>
      </div>

      <!-- Interview Preparation Checklist -->
      <div style="background-color: #f8fafc; border-radius: 14px; padding: 18px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
        <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #0f172a; margin-bottom: 8px;">
          💡 Session Preparation Checklist
        </div>
        <ul style="margin: 0; padding-left: 18px; font-size: 12.5px; color: #475569; line-height: 1.6;">
          <li>Please join from a laptop or desktop computer with a functional camera &amp; microphone.</li>
          <li>Have your preferred code editor / IDE ready for practical discussion or live architectural diagramming.</li>
          <li>Join the Google Meet room 5 minutes prior to verify audio &amp; video connectivity.</li>
        </ul>
      </div>

      <!-- Signoff -->
      <div style="border-top: 1px solid #e2e8f0; padding-top: 18px; font-size: 13px; color: #64748b;">
        <p style="margin: 0 0 4px 0; font-weight: 700; color: #1e293b;">Best regards,</p>
        <p style="margin: 0; color: #475569;">Talent Acquisition &amp; Engineering Hiring Team</p>
        <p style="margin: 2px 0 0 0; font-size: 11px; color: #94a3b8;">${escapeHtml(companyName)}</p>
      </div>

    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 36px; text-align: center; font-size: 11px; color: #94a3b8;">
      This email was generated via RecruitSync Live Dispatch Engine. For any urgent time adjustments, please reply directly with your availability.
    </div>

  </div>
</body>
</html>`;
}

/**
 * Generate clean formatted Plain Text for WhatsApp / Telegram / Slack / Email fallback
 */
export function generateLuxuryInterviewPlainText(params: {
  candidateName: string;
  position: string;
  scheduledIsoTime: string;
  durationMinutes: number;
  meetLink: string;
  meetPin?: string;
  trackName?: string;
  assignedInterviewer: string;
  candidateTimezone?: string;
}): string {
  const {
    candidateName,
    position,
    scheduledIsoTime,
    durationMinutes,
    meetLink,
    meetPin = '789 421',
    trackName = 'Track Alpha',
    assignedInterviewer,
    candidateTimezone = 'Asia/Karachi',
  } = params;

  const pktDateStr = formatPktDateTime(scheduledIsoTime);
  const localDateStr = formatInTimezone(scheduledIsoTime, candidateTimezone, { includeAbbr: true });

  return `════════════════════════════════════════
🎯 TECHNICAL INTERVIEW INVITATION
════════════════════════════════════════

Candidate: ${candidateName}
Position: ${position}
Track: ${trackName}

⏰ SCHEDULED TIME:
• Your Local Time: ${localDateStr}
• Pakistan Time (PKT / UTC+5): ${pktDateStr}
• Duration: ${durationMinutes} Minutes

📹 GOOGLE MEET VIDEO LINK:
👉 ${meetLink}
🔑 Meeting PIN: ${meetPin}

👨‍💼 Interviewer: ${assignedInterviewer}

💡 PREP CHECKLIST:
• Join 5 minutes early from a laptop/PC with camera & mic
• Be ready with your code editor or portfolio
• Stable internet connection recommended

Organized via RecruitSync PRO Global Recruitment.
════════════════════════════════════════`;
}

/**
 * Generates an RFC 5545 iCalendar (.ics) string for a single or multiple scheduled candidates
 */
export function generateBatchIcsContent(
  allocations: {
    candidateName: string;
    candidateEmail: string;
    candidatePosition: string;
    slotIso: string;
    durationMinutes: number;
    meetLink: string;
    assignedInterviewer: string;
    trackName: string;
  }[]
): string {
  const toUtc = (iso: string) => {
    const d = new Date(iso);
    return isNaN(d.getTime())
      ? new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
      : d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const dtStamp = toUtc(new Date().toISOString());

  const events = allocations
    .map((item, idx) => {
      const startD = new Date(item.slotIso);
      const endD = new Date(startD.getTime() + item.durationMinutes * 60 * 1000);
      const dtStart = toUtc(startD.toISOString());
      const dtEnd = toUtc(endD.toISOString());
      const uid = `interview-${idx}-${Date.now()}@mihora.tech`;

      const summary = `Interview: ${item.candidateName} (${item.candidatePosition})`;
      const desc = `Candidate: ${item.candidateName} (${item.candidateEmail})\\nPosition: ${item.candidatePosition}\\nInterviewer: ${item.assignedInterviewer}\\nRoom: ${item.trackName}\\nMeet Link: ${item.meetLink}`;

      return [
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${dtStamp}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${desc}`,
        `LOCATION:${item.meetLink}`,
        `STATUS:CONFIRMED`,
        `ORGANIZER;CN="Hiring Team":mailto:${item.assignedInterviewer || 'hr@mihora.tech'}`,
        `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;CN="${item.candidateName}":mailto:${item.candidateEmail}`,
        'BEGIN:VALARM',
        'TRIGGER:-PT15M',
        'ACTION:DISPLAY',
        'DESCRIPTION:Interview in 15 minutes',
        'END:VALARM',
        'END:VEVENT',
      ].join('\r\n');
    })
    .join('\r\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Mihora Tech//RecruitSync AI Batch Scheduler//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    events,
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * Triggers a browser download of the batch .ics calendar file
 */
export function downloadBatchIcsFile(
  allocations: {
    candidateName: string;
    candidateEmail: string;
    candidatePosition: string;
    slotIso: string;
    durationMinutes: number;
    meetLink: string;
    assignedInterviewer: string;
    trackName: string;
  }[],
  batchName = 'Batch_Interviews'
): void {
  const icsData = generateBatchIcsContent(allocations);
  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${batchName}_${new Date().toISOString().split('T')[0]}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
