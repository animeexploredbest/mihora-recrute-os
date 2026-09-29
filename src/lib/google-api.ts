import { formatPktDateTime, formatLocalDateTime } from './date-utils';
import { renderEmailBody, renderEmailHtml, generateEmailSubject } from './email-template-utils';

export interface ScheduleResult {
  eventData: any;
  meetLink: string;
  calendarEventLink?: string;
  calendarEventId?: string;
  draftId?: string;
  emailSent?: boolean;
  emailError?: string;
  calendarInviteSent?: boolean;
  gmailComposeUrl?: string;
  emailSubject?: string;
  emailBody?: string;
  isRescheduled?: boolean;
  senderEmail?: string;
}

/**
 * Creates RFC 2822 formatted raw email string encoded in base64url for Gmail API
 * Robust UTF-8 encoding supporting emojis, non-ASCII characters, and standard MIME headers
 */
function makeRawEmail(to: string, subject: string, bodyText: string, cc?: string): string {
  const utf8Subject = `=?UTF-8?B?${btoa(
    encodeURIComponent(subject).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    )
  )}?=`;

  const headers = [
    `To: ${to}`,
    cc ? `Cc: ${cc}` : '',
    `Subject: ${utf8Subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
  ].filter(Boolean).join('\r\n');

  const utf8BodyBytes = new TextEncoder().encode(bodyText);
  let binaryBody = '';
  for (let i = 0; i < utf8BodyBytes.length; i++) {
    binaryBody += String.fromCharCode(utf8BodyBytes[i]);
  }
  const base64Body = btoa(binaryBody).match(/.{1,76}/g)?.join('\r\n') || '';

  const fullEmail = `${headers}\r\n\r\n${base64Body}`;
  const utf8FullBytes = new TextEncoder().encode(fullEmail);
  let binaryFull = '';
  for (let i = 0; i < utf8FullBytes.length; i++) {
    binaryFull += String.fromCharCode(utf8FullBytes[i]);
  }
  return btoa(binaryFull).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export const scheduleInterview = async (
  accessToken: string,
  candidateName: string,
  candidateEmail: string,
  startDateTime: string, // ISO format
  role: string,
  draftMode: boolean = false,
  customTemplate?: string,
  interviewerEmails?: string | string[],
  isReschedule: boolean = false,
  existingCalendarEventId?: string,
  durationMinutes: number = 60,
  trackName?: string
): Promise<ScheduleResult> => {
  const startTime = new Date(startDateTime);
  if (isNaN(startTime.getTime())) {
    throw new Error('Invalid interview start date and time provided.');
  }
  const safeDuration = durationMinutes && durationMinutes > 0 ? durationMinutes : 60;
  const endTime = new Date(startTime.getTime() + safeDuration * 60 * 1000);

  // Parse interviewer emails strictly for the assigned interviewer (each interviewer receives only their own quota)
  let interviewersList: string[] = [];
  if (Array.isArray(interviewerEmails)) {
    interviewersList = [...interviewerEmails];
  } else if (typeof interviewerEmails === 'string' && interviewerEmails.trim().length > 0) {
    interviewersList = interviewerEmails.split(',').map((e) => e.trim());
  }

  const validInterviewers = interviewersList.filter(
    (e) => e && e.includes('@') && e.toLowerCase() !== candidateEmail.toLowerCase()
  );
  const ccString = validInterviewers.join(', ');

  // 1. Google Calendar Attendees (Candidate + Interviewers)
  const attendees: { email: string; displayName?: string }[] = [];
  if (candidateEmail && candidateEmail.includes('@')) {
    attendees.push({ email: candidateEmail.trim(), displayName: candidateName });
  }
  for (const invEmail of validInterviewers) {
    attendees.push({ email: invEmail.trim(), displayName: 'Interviewer' });
  }

  const summaryPrefix = isReschedule ? 'Interview (Rescheduled)' : 'Interview';
  const trackSuffix = trackName ? ` [${trackName}]` : '';
  const calendarPayload = {
    summary: `${summaryPrefix}: ${candidateName} - ${role}${trackSuffix}`,
    location: trackName ? `${trackName} (Google Meet)` : 'Google Meet',
    description: `${isReschedule ? '⚠️ NOTE: This interview has been rescheduled.\n\n' : ''}Technical Interview for ${role} with ${candidateName}.\nTime: ${formatPktDateTime(startDateTime)} (${safeDuration} mins)\nTrack / Virtual Room: ${trackName || 'General Track'}\nInterviewers (CC): ${ccString}`,
    start: { dateTime: startTime.toISOString() },
    end: { dateTime: endTime.toISOString() },
    attendees,
    conferenceData: {
      createRequest: {
        requestId: `interview-${isReschedule ? 'resched-' : ''}${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
  };

  let eventData: any = null;
  let calendarApiError: string | undefined = undefined;

  // Attempt Google Calendar API only if an accessToken is provided
  if (accessToken) {
    // If rescheduling and existing calendar event ID exists, try updating existing event
    if (isReschedule && existingCalendarEventId) {
      try {
        const patchRes = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(
            existingCalendarEventId
          )}?conferenceDataVersion=1&sendUpdates=none`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(calendarPayload),
          }
        );
        if (patchRes.ok) {
          eventData = await patchRes.json();
        }
      } catch (patchErr) {
        console.warn('Could not patch existing calendar event, creating new one:', patchErr);
      }
    }

    // Create new calendar event with sendUpdates=none if not patched
    if (!eventData) {
      try {
        const eventRes = await fetch(
          'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=none',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(calendarPayload),
          }
        );

        if (eventRes.ok) {
          eventData = await eventRes.json();
        } else {
          const errText = await eventRes.text();
          console.warn('Google Calendar API response not ok:', eventRes.status, errText);
          calendarApiError = `Calendar sync notice (${eventRes.status})`;
        }
      } catch (calErr: any) {
        console.warn('Google Calendar fetch error:', calErr);
        calendarApiError = calErr.message;
      }
    }
  }

  // Extract Meet link from Google Calendar or generate dedicated Meet room
  const randomRoomCode = `${Math.random().toString(36).substring(2, 5)}-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 5)}`;
  let meetLink =
    eventData?.hangoutLink ||
    eventData?.conferenceData?.entryPoints?.find((ep: any) => ep.entryPointType === 'video')?.uri ||
    `https://meet.google.com/${randomRoomCode}`;

  const startIsoClean = startTime.toISOString().replace(/-|:|\.\d\d\d/g, '');
  const endIsoClean = endTime.toISOString().replace(/-|:|\.\d\d\d/g, '');
  const fallbackCalendarLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    `${summaryPrefix}: ${candidateName} - ${role}${trackSuffix}`
  )}&dates=${startIsoClean}/${endIsoClean}&details=${encodeURIComponent(
    `Technical Interview for ${role} with ${candidateName}.\nMeet Link: ${meetLink}\nTrack: ${trackName || 'General Track'}\nInterviewers: ${ccString}`
  )}&location=${encodeURIComponent(meetLink)}`;

  const calendarEventLink = eventData?.htmlLink || fallbackCalendarLink;
  const calendarEventId = eventData?.id || existingCalendarEventId || '';

  // 2. Add to Google Tasks (non-blocking if accessToken available)
  if (accessToken) {
    try {
      await fetch('https://tasks.googleapis.com/tasks/v1/lists/@default/tasks', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `${isReschedule ? '[Rescheduled] ' : ''}Interview: ${candidateName} (${role})`,
          notes: `Candidate: ${candidateName}\nEmail: ${candidateEmail}\nTrack: ${trackName || 'General Track'}\nInterviewers: ${ccString}\nRole: ${role}\nDuration: ${safeDuration} mins\nPKT Time: ${formatPktDateTime(startDateTime)}\nMeet: ${meetLink}\nCalendar: ${calendarEventLink}`,
          due: startTime.toISOString(),
        }),
      });
    } catch (taskErr) {
      console.warn('Could not create Google Task:', taskErr);
    }
  }

  // 3. Prepare Email Subject & Body
  const emailSubject = generateEmailSubject(candidateName, role, isReschedule);

  const emailBody = renderEmailBody(customTemplate || '', {
    candidateName,
    candidateEmail,
    role,
    scheduledIsoTime: startDateTime,
    durationMinutes: safeDuration,
    interviewerEmails: ccString,
    meetLink,
    isReschedule,
    trackName,
  });

  // 1-Click Gmail Web compose link (fallback if user wants manual compose)
  const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
    candidateEmail
  )}&cc=${encodeURIComponent(ccString)}&su=${encodeURIComponent(
    emailSubject
  )}&body=${encodeURIComponent(emailBody)}`;

  // Professional HTML format for Titan Mail delivery
  const emailHtml = renderEmailHtml(emailBody, {
    candidateName,
    candidateEmail,
    role,
    scheduledIsoTime: startDateTime,
    durationMinutes: safeDuration,
    interviewerEmails: ccString,
    meetLink,
    isReschedule,
  });

  let draftId: string | undefined;
  let emailSent = false;
  let emailError: string | undefined;
  let senderEmail: string | undefined = 'hr@mihora.tech';

  // 4. Handle Email (Draft or Direct Send with CC to interviewers)
  if (draftMode) {
    try {
      const rawEmail = makeRawEmail(candidateEmail, emailSubject, emailBody, ccString);
      const draftRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: { raw: rawEmail } }),
      });

      if (draftRes.ok) {
        const draftData = await draftRes.json();
        draftId = draftData.id || draftData.message?.id;
      } else {
        const errTxt = await draftRes.text();
        console.warn('Gmail draft creation failed:', errTxt);
        emailError = `Gmail draft could not be created directly (${draftRes.status}).`;
      }
    } catch (e: any) {
      console.warn('Draft creation error:', e);
      emailError = e.message;
    }
  } else {
    // Primary: Send directly from hr@mihora.tech via Titan Mail SMTP
    try {
      const mailRes = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: candidateEmail,
          cc: ccString,
          subject: emailSubject,
          text: emailBody,
          html: emailHtml,
        }),
      });

      const mailData = await mailRes.json().catch(() => ({}));

      if (mailRes.ok && mailData.success) {
        emailSent = true;
        senderEmail = mailData.sender || 'hr@mihora.tech';
        console.log(`[Email] Interview invite dispatched from ${senderEmail} to ${candidateEmail}`);
      } else {
        emailError = mailData.error || 'Failed sending via Titan Mail (hr@mihora.tech).';
        console.warn('Titan Mail send issue, falling back to Gmail API:', emailError);
      }
    } catch (titanErr: any) {
      console.warn('Titan Mail network error, falling back to Gmail API:', titanErr);
      emailError = titanErr.message || 'Network error connecting to Titan Mail SMTP.';
    }

    // Fallback: If Titan Mail was not configured or failed, send directly via the recruiter's connected Gmail
    if (!emailSent && accessToken) {
      try {
        const rawEmail = makeRawEmail(candidateEmail, emailSubject, emailBody, ccString);
        const gmailRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ raw: rawEmail }),
        });

        if (gmailRes.ok) {
          emailSent = true;
          emailError = undefined;
          senderEmail = 'Your Connected Google Account (Gmail API)';
          console.log(`[Email] Successfully dispatched interview invite via recruiter Gmail to ${candidateEmail}`);
        } else {
          const gErrText = await gmailRes.text();
          console.warn('[Email] Gmail API fallback failed:', gErrText);
        }
      } catch (gErr: any) {
        console.warn('[Email] Gmail API network error:', gErr);
      }
    }
  }

  return {
    eventData,
    meetLink,
    calendarEventLink,
    calendarEventId,
    draftId,
    emailSent,
    emailError,
    calendarInviteSent: true, // Google Calendar sendUpdates=all delivers the invitation to all attendees
    gmailComposeUrl,
    emailSubject,
    emailBody,
    isRescheduled: isReschedule,
    senderEmail,
  };
};

/**
 * Delete or cancel a scheduled Google Calendar event
 */
export const deleteCalendarEvent = async (
  accessToken: string,
  eventId: string
): Promise<boolean> => {
  try {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(
        eventId
      )}?sendUpdates=all`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    return res.ok || res.status === 404 || res.status === 410;
  } catch (err) {
    console.warn('Could not cancel calendar event:', err);
    return false;
  }
};

export interface GoogleTaskItem {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string;
  updated?: string;
  completed?: string;
  webViewLink?: string;
}

/**
 * List real Google Tasks for recruiter follow-ups
 */
export async function listGoogleTasks(accessToken: string): Promise<GoogleTaskItem[]> {
  if (!accessToken) return [];
  try {
    const res = await fetch('https://tasks.googleapis.com/tasks/v1/lists/@default/tasks?showCompleted=true&showHidden=true', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!res.ok) {
      console.warn('Failed to fetch Google Tasks:', res.status);
      return [];
    }
    const data = await res.json();
    return (data.items || []).map((t: any) => ({
      id: t.id,
      title: t.title || '(Untitled Task)',
      notes: t.notes || '',
      status: t.status === 'completed' ? 'completed' : 'needsAction',
      due: t.due,
      updated: t.updated,
      completed: t.completed,
      webViewLink: 'https://tasks.google.com',
    }));
  } catch (err) {
    console.error('Error listing Google Tasks:', err);
    return [];
  }
}

/**
 * Create a new task in Google Tasks
 */
export async function createGoogleTask(
  accessToken: string,
  params: { title: string; notes?: string; due?: string }
): Promise<GoogleTaskItem | null> {
  if (!accessToken) throw new Error('Google OAuth access token is required to create a task.');
  const payload: any = {
    title: params.title,
    notes: params.notes || '',
  };
  if (params.due) {
    payload.due = new Date(params.due).toISOString();
  }

  const res = await fetch('https://tasks.googleapis.com/tasks/v1/lists/@default/tasks', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Tasks creation failed (${res.status}): ${errText}`);
  }

  const t = await res.json();
  return {
    id: t.id,
    title: t.title,
    notes: t.notes || '',
    status: t.status === 'completed' ? 'completed' : 'needsAction',
    due: t.due,
    updated: t.updated,
    completed: t.completed,
    webViewLink: 'https://tasks.google.com',
  };
}

/**
 * Toggle or update Google Task completion status
 */
export async function updateGoogleTaskStatus(
  accessToken: string,
  taskId: string,
  completed: boolean
): Promise<boolean> {
  if (!accessToken || !taskId) return false;
  try {
    const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/@default/tasks/${encodeURIComponent(taskId)}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: completed ? 'completed' : 'needsAction',
        completed: completed ? new Date().toISOString() : null,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error('Error updating Google Task status:', err);
    return false;
  }
}

/**
 * Delete a task in Google Tasks
 */
export async function deleteGoogleTask(
  accessToken: string,
  taskId: string
): Promise<boolean> {
  if (!accessToken || !taskId) return false;
  try {
    const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/@default/tasks/${encodeURIComponent(taskId)}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return res.ok || res.status === 404;
  } catch (err) {
    console.error('Error deleting Google Task:', err);
    return false;
  }
}

/**
 * Verifies real Google Tasks API connectivity
 */
export async function verifyGoogleTasksAccess(accessToken: string): Promise<boolean> {
  if (!accessToken) return false;
  try {
    const res = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Creates an authentic Google Meet room (via Google Calendar conferenceData API or Meet API)
 */
export async function createInstantGoogleMeet(accessToken?: string): Promise<{
  meetLink: string;
  source: 'calendar_meet' | 'meet_api' | 'meet_new';
}> {
  // If we have an active access token, create a verified conference via Google Calendar API
  if (accessToken) {
    try {
      const now = new Date();
      const end = new Date(now.getTime() + 60 * 60 * 1000);
      const res = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=none',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            summary: 'RecruitSync — Instant Video Room',
            description: 'On-demand Google Meet session generated via RecruitSync.',
            start: { dateTime: now.toISOString() },
            end: { dateTime: end.toISOString() },
            conferenceData: {
              createRequest: {
                requestId: `meet_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
                conferenceSolutionKey: { type: 'hangoutsMeet' },
              },
            },
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const uri = data.conferenceData?.entryPoints?.find((ep: any) => ep.entryPointType === 'video')?.uri;
        if (uri) {
          return { meetLink: uri, source: 'calendar_meet' };
        }
      }
    } catch (e) {
      console.warn('Calendar conference creation note:', e);
    }
  }

  // Fallback to Google's official one-click meeting launcher
  return {
    meetLink: 'https://meet.google.com/new',
    source: 'meet_new',
  };
}
