import { formatPktDateTime, formatLocalDateTime } from './date-utils';
import { formatInTimezone } from './timezone-utils';

export interface EmailTemplateParams {
  candidateName: string;
  candidateEmail?: string;
  role: string;
  scheduledIsoTime: string;
  candidateTimezone?: string;
  durationMinutes: number;
  interviewerEmails: string;
  meetLink?: string;
  isReschedule?: boolean;
  trackName?: string;
}

export const DEFAULT_INVITATION_TEMPLATE = `Hi {name},

We are pleased to invite you to an interview for the {role} position.

Interview Details:
- Candidate Local Time: {time}
- Pakistan Standard Time (PKT / UTC+5): {date}
- Duration: {duration}
- Video Meeting Link: {meetLink}
- Interview Panel (CC): {interviewers}

Please join the Google Meet link 5 minutes prior to the scheduled time. If this time slot does not work for you, please reply to this email (keeping the interviewers in CC) to reschedule.

Best regards,
The Hiring Team`;

export const DEFAULT_RESCHEDULE_TEMPLATE = `Hi {name},

Please note that your interview for the {role} position has been rescheduled.

Updated Interview Details:
- Candidate Local Time: {time}
- Pakistan Standard Time (PKT / UTC+5): {date}
- Duration: {duration}
- Video Meeting Link: {meetLink}
- Interview Panel (CC): {interviewers}

Please join the Google Meet link 5 minutes prior to the scheduled time. If this updated time slot does not work for you, please reply directly to this email to coordinate an alternate time.

Best regards,
The Hiring Team`;

export interface TemplatePlaceholder {
  token: string;
  label: string;
  description: string;
  sampleValue: string;
}

export const TEMPLATE_PLACEHOLDERS: TemplatePlaceholder[] = [
  { token: '{name}', label: 'Candidate Name', description: 'Full name of the candidate', sampleValue: 'Alex Smith' },
  { token: '{role}', label: 'Position / Role', description: 'Job role applying for', sampleValue: 'Senior Frontend Engineer' },
  { token: '{time}', label: 'Candidate Local Time', description: 'Interview time in candidate’s timezone', sampleValue: 'Mon, Sep 28, 2026, 10:00 AM EDT' },
  { token: '{date}', label: 'PKT Time (UTC+5)', description: 'Interview time in Pakistan Standard Time', sampleValue: 'Mon, Sep 28, 2026, 7:00 PM (PKT)' },
  { token: '{duration}', label: 'Duration', description: 'Length of the interview meeting', sampleValue: '45 minutes' },
  { token: '{meetLink}', label: 'Meeting Link', description: 'Google Meet video URL', sampleValue: 'https://meet.google.com/abc-defg-hij' },
  { token: '{interviewers}', label: 'Assigned Interviewer (CC)', description: 'Assigned interviewer email for this specific candidate quota', sampleValue: 'm.mattiulhasnain@gmail.com' },
  { token: '{track}', label: 'Interview Track / Room', description: 'Assigned interview track or panel', sampleValue: 'Track A (Engineering Alpha)' },
];

export function getDefaultEmailTemplate(isReschedule: boolean): string {
  return isReschedule ? DEFAULT_RESCHEDULE_TEMPLATE : DEFAULT_INVITATION_TEMPLATE;
}

export function generateEmailSubject(candidateName: string, role: string, isReschedule: boolean): string {
  const safeRole = role.trim() || 'Software Engineer';
  const safeName = candidateName.trim() || 'Candidate';
  return isReschedule
    ? `Interview Rescheduled: ${safeRole} - ${safeName}`
    : `Interview Invitation: ${safeRole} - ${safeName}`;
}

export function renderEmailBody(template: string, params: EmailTemplateParams): string {
  const {
    candidateName,
    role,
    scheduledIsoTime,
    candidateTimezone,
    durationMinutes,
    interviewerEmails,
    meetLink,
    isReschedule,
  } = params;

  const safeRole = role.trim() || 'Software Engineer';
  const safeName = candidateName.trim() || 'Candidate';
  const pktFormatted = formatPktDateTime(scheduledIsoTime);
  const localFormatted = candidateTimezone
    ? formatInTimezone(scheduledIsoTime, candidateTimezone, { includeAbbr: true })
    : formatLocalDateTime(scheduledIsoTime);
  const durationFormatted = `${durationMinutes || 45} minutes`;
  const effectiveMeetLink = meetLink || '(Google Meet link generated automatically)';
  // Each interviewer only receives their own quota of candidate emails (never combined)
  const effectiveInterviewers = interviewerEmails?.trim() || 'm.mattiulhasnain@gmail.com';

  let rendered = (template || getDefaultEmailTemplate(Boolean(isReschedule)))
    .replace(/{name}/g, safeName)
    .replace(/{role}/g, safeRole)
    .replace(/{date}/g, pktFormatted)
    .replace(/{time}/g, localFormatted)
    .replace(/{duration}/g, durationFormatted)
    .replace(/{meetLink}/g, effectiveMeetLink)
    .replace(/{interviewers}/g, effectiveInterviewers)
    .replace(/{track}/g, params.trackName || 'General Track')
    .replace(/{email}/g, params.candidateEmail || '');

  // If rescheduling and user didn't mention reschedule, prepend alert
  if (isReschedule && !rendered.toLowerCase().includes('reschedule')) {
    rendered = `Please note: This interview has been rescheduled to the updated time slot below.\n\n${rendered}`;
  }

  return rendered;
}

export function renderEmailHtml(renderedBodyText: string, params: EmailTemplateParams): string {
  const {
    candidateName,
    role,
    scheduledIsoTime,
    candidateTimezone,
    durationMinutes,
    interviewerEmails,
    meetLink,
    isReschedule,
  } = params;

  const safeRole = role.trim() || 'Software Engineer';
  const safeName = candidateName.trim() || 'Candidate';
  const pktFormatted = formatPktDateTime(scheduledIsoTime);
  const localFormatted = candidateTimezone
    ? formatInTimezone(scheduledIsoTime, candidateTimezone, { includeAbbr: true })
    : formatLocalDateTime(scheduledIsoTime);
  const durationFormatted = `${durationMinutes || 45} minutes`;
  const effectiveMeetLink = meetLink || 'https://meet.google.com/new';
  // Each interviewer only receives their own quota of candidate emails
  const effectiveInterviewers = interviewerEmails?.trim() || 'm.mattiulhasnain@gmail.com';

  // Split renderedBodyText into clean paragraphs for HTML rendering
  const paragraphs = renderedBodyText
    .split('\n\n')
    .map((p) => p.trim())
    .filter(Boolean);

  const formattedParagraphs = paragraphs
    .map((p) => {
      // If it looks like bullet points
      if (p.includes('- ') || p.includes('• ')) {
        const lines = p.split('\n');
        const items = lines
          .map((line) => line.replace(/^[-•]\s*/, '').trim())
          .filter(Boolean)
          .map((item) => `<li style="margin: 6px 0; font-size: 14px; line-height: 1.5;">${escapeHtml(item)}</li>`)
          .join('');
        return `<ul style="margin: 14px 0; padding-left: 20px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 20px 14px 34px;">${items}</ul>`;
      }
      return `<p style="font-size: 14.5px; line-height: 1.6; margin: 0 0 14px 0; color: #334155;">${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`;
    })
    .join('');

  return `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
    <div style="border-bottom: 2px solid #4f46e5; padding-bottom: 14px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between;">
      <div>
        <h2 style="color: #4f46e5; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.02em;">Mihora Tech</h2>
        <p style="margin: 3px 0 0 0; font-size: 12px; color: #64748b; font-weight: 500;">Talent Acquisition &amp; Recruitment</p>
      </div>
      <div style="text-align: right;">
        <span style="display: inline-block; padding: 4px 10px; font-size: 11px; font-weight: 600; border-radius: 9999px; ${
          isReschedule
            ? 'background-color: #fef3c7; color: #92400e; border: 1px solid #fde68a;'
            : 'background-color: #e0e7ff; color: #3730a3; border: 1px solid #c7d2fe;'
        }">
          ${isReschedule ? '⚠️ Rescheduled Interview' : '📅 Interview Invitation'}
        </span>
      </div>
    </div>

    ${formattedParagraphs}

    <!-- Call to action button -->
    <div style="text-align: center; margin: 26px 0; padding: 18px 0; background: linear-gradient(to bottom, #f8fafc, #f1f5f9); border-radius: 10px; border: 1px solid #e2e8f0;">
      <a href="${effectiveMeetLink}" target="_blank" rel="noopener noreferrer" style="background-color: #4f46e5; color: #ffffff; padding: 13px 30px; border-radius: 8px; font-size: 15px; font-weight: 600; text-decoration: none; display: inline-block; box-shadow: 0 3px 6px rgba(79, 70, 229, 0.25);">
        🎥 Join Google Meet Interview
      </a>
      <p style="margin-top: 10px; font-size: 12px; color: #64748b;">
        Meeting Link: <a href="${effectiveMeetLink}" style="color: #4f46e5; word-break: break-all;">${effectiveMeetLink}</a>
      </p>
    </div>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 20px;">
      <p style="margin: 0; font-size: 12px; color: #475569; line-height: 1.5;">
        <strong>Quick Tip:</strong> Please verify your microphone and camera ahead of time. You may also join 5 minutes early to test your setup.
      </p>
    </div>

    <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 12px; color: #94a3b8; display: flex; justify-content: space-between; align-items: flex-end;">
      <div>
        <p style="margin: 0 0 2px 0; font-weight: 600; color: #334155;">Mihora Tech Hiring Team</p>
        <p style="margin: 0; color: #64748b;">hr@mihora.tech &bull; Automated Interview Dispatcher</p>
      </div>
      <div style="text-align: right; font-size: 11px; color: #94a3b8;">
        RecruitSync Pipeline
      </div>
    </div>
  </div>
  `;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
