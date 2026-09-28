import { Candidate } from '../types';

/**
 * Format an ISO date string to iCalendar UTC timestamp: YYYYMMDDTHHmmssZ
 */
function toIcsUtc(isoString: string): string {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) {
    return new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/**
 * Generates an RFC 5545 compliant .ics string for a candidate's scheduled interview.
 */
export function generateIcsContent(candidate: Candidate, organizerEmail = 'hr@mihora.tech'): string {
  const startTimeIso = candidate.suggestedPktTime || new Date().toISOString();
  const durationMin = candidate.durationMinutes || 45;
  const startDate = new Date(startTimeIso);
  const endDate = new Date(startDate.getTime() + durationMin * 60 * 1000);

  const dtStart = toIcsUtc(startDate.toISOString());
  const dtEnd = toIcsUtc(endDate.toISOString());
  const dtStamp = toIcsUtc(new Date().toISOString());
  const uid = `interview-${candidate.id || Math.random().toString(36).substring(2, 9)}-${Date.now()}@mihora.tech`;

  const summary = `Interview: ${candidate.name} (${candidate.position || 'Software Engineer'})`;
  const location = candidate.meetLink || 'Google Meet (Link will be provided)';
  
  const descriptionLines = [
    `Interview with ${candidate.name}`,
    `Position: ${candidate.position || 'Software Engineer'}`,
    `Location / Meet: ${location}`,
    `Scheduled Time (PKT / UTC+5): ${new Date(startTimeIso).toLocaleString('en-US', { timeZone: 'Asia/Karachi' })}`,
    candidate.phone ? `Candidate Phone: ${candidate.phone}` : '',
    candidate.notes ? `Notes: ${candidate.notes}` : '',
    '',
    'Organized via RecruitSync PRO (Mihora Tech Global Recruitment)',
  ].filter(Boolean).join('\\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Mihora Tech//RecruitSync//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${descriptionLines}`,
    `LOCATION:${location}`,
    `ORGANIZER;CN="Mihora Tech HR":mailto:${organizerEmail}`,
    `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;CN="${candidate.name}":mailto:${candidate.email}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Interview in 15 minutes',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * Triggers a browser download of an .ics calendar file for the candidate's interview.
 */
export function downloadIcsFile(candidate: Candidate, organizerEmail?: string): void {
  const icsData = generateIcsContent(candidate, organizerEmail);
  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  const safeName = (candidate.name || 'Candidate').replace(/[^a-zA-Z0-9]/g, '_');
  anchor.download = `Interview_${safeName}.ics`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Generates a direct "Add to Google Calendar" web link.
 */
export function getGoogleCalendarWebLink(candidate: Candidate): string {
  const startTimeIso = candidate.suggestedPktTime || new Date().toISOString();
  const durationMin = candidate.durationMinutes || 45;
  const startDate = new Date(startTimeIso);
  const endDate = new Date(startDate.getTime() + durationMin * 60 * 1000);

  const startUtc = toIcsUtc(startDate.toISOString());
  const endUtc = toIcsUtc(endDate.toISOString());

  const title = encodeURIComponent(`Interview: ${candidate.name} (${candidate.position || 'Software Engineer'})`);
  const details = encodeURIComponent(
    `Interview for ${candidate.position || 'Role'}.\nGoogle Meet: ${candidate.meetLink || 'Online'}\nCandidate: ${candidate.name} (${candidate.email})`
  );
  const location = encodeURIComponent(candidate.meetLink || 'Google Meet');

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startUtc}/${endUtc}&details=${details}&location=${location}`;
}
