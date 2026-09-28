/**
 * Verifies real Google Calendar API connectivity and access token validity.
 * Hits https://www.googleapis.com/calendar/v3/users/me/calendarList/primary
 */
export interface CalendarVerificationResult {
  valid: boolean;
  calendarId?: string;
  summary?: string;
  timeZone?: string;
  error?: string;
  statusCode?: number;
}

export async function verifyRealGoogleCalendarAccess(token: string): Promise<CalendarVerificationResult> {
  if (!token) {
    return {
      valid: false,
      error: 'No OAuth access token provided.',
    };
  }

  try {
    const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList/primary', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.ok) {
      const data = await res.json();
      return {
        valid: true,
        calendarId: data.id,
        summary: data.summary,
        timeZone: data.timeZone,
        statusCode: res.status,
      };
    }

    const errData = await res.json().catch(() => ({}));
    const message = errData?.error?.message || `Google Calendar API returned status ${res.status}`;
    return {
      valid: false,
      statusCode: res.status,
      error: message,
    };
  } catch (err: any) {
    return {
      valid: false,
      error: err.message || 'Network error connecting to Google Calendar API',
    };
  }
}
