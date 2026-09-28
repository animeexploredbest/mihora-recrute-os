// Date & Time utilities with Pakistan Standard Time (PKT / UTC+5) support

export function isValidDate(d: any): boolean {
  return d instanceof Date && !isNaN(d.getTime());
}

/**
 * Converts an ISO 8601 string or Date to local 'YYYY-MM-DDTHH:mm' for datetime-local input
 */
export function isoToLocalInput(isoString?: string | null): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (!isValidDate(d)) return '';
  
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Converts a datetime-local input value ('YYYY-MM-DDTHH:mm') safely to an ISO 8601 string.
 * Returns null if invalid or incomplete.
 */
export function localInputToIso(inputValue: string): string | null {
  if (!inputValue || inputValue.length < 16) return null;
  const d = new Date(inputValue);
  if (!isValidDate(d)) return null;
  return d.toISOString();
}

/**
 * Formats a date in Pakistan Standard Time (Asia/Karachi, UTC+5)
 */
export function formatPktDateTime(isoString?: string | null): string {
  if (!isoString) return 'Date not set';
  const d = new Date(isoString);
  if (!isValidDate(d)) return 'Invalid date';

  try {
    return d.toLocaleString('en-US', {
      timeZone: 'Asia/Karachi',
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }) + ' (PKT)';
  } catch {
    return d.toLocaleString() + ' (PKT)';
  }
}

/**
 * Formats in browser's local timezone or a specified IANA timezone (e.g. Asia/Dubai, America/New_York)
 */
export function formatLocalDateTime(isoString?: string | null, timeZone?: string): string {
  if (!isoString) return 'Date not set';
  const d = new Date(isoString);
  if (!isValidDate(d)) return 'Invalid date';

  try {
    return d.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      ...(timeZone ? { timeZone } : {})
    });
  } catch {
    return d.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }
}

/**
 * Relative friendly time string
 */
export function formatRelativeTime(isoString?: string | null): { text: string; isPast: boolean } {
  if (!isoString) return { text: 'Unscheduled', isPast: false };
  const d = new Date(isoString);
  if (!isValidDate(d)) return { text: 'Invalid date', isPast: false };

  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 0) {
    if (diffMinutes > -60) return { text: `${Math.abs(diffMinutes)}m ago`, isPast: true };
    if (diffHours > -24) return { text: `${Math.abs(diffHours)}h ago`, isPast: true };
    return { text: `${Math.abs(diffDays)}d ago`, isPast: true };
  } else {
    if (diffMinutes === 0) return { text: 'Starting now', isPast: false };
    if (diffMinutes < 60) return { text: `in ${diffMinutes} mins`, isPast: false };
    if (diffHours < 24) return { text: `in ${diffHours} hrs`, isPast: false };
    return { text: `in ${diffDays} days`, isPast: false };
  }
}

/**
 * Checks if an interview time has already passed
 */
export function isInterviewPast(isoString?: string | null): boolean {
  if (!isoString) return false;
  const d = new Date(isoString);
  return isValidDate(d) && d.getTime() < Date.now();
}

/**
 * Finds conflict with existing candidates within a 45-minute window
 */
export function findScheduleConflict(
  isoString: string,
  candidates: { id?: string; name: string; suggestedPktTime: string; status: string }[],
  excludeCandidateId?: string
) {
  if (!isoString) return null;
  const targetTime = new Date(isoString).getTime();
  if (isNaN(targetTime)) return null;

  for (const c of candidates) {
    if (excludeCandidateId && c.id === excludeCandidateId) continue;
    if (c.status === 'Rejected') continue; // Ignored rejected
    const candidateTime = new Date(c.suggestedPktTime).getTime();
    if (isNaN(candidateTime)) continue;

    const diffMinutes = Math.abs(candidateTime - targetTime) / (1000 * 60);
    if (diffMinutes < 50) {
      return {
        candidateName: c.name,
        candidateTime: c.suggestedPktTime,
        diffMinutes: Math.round(diffMinutes),
      };
    }
  }
  return null;
}

/**
 * Deconstructs an ISO string or Date into Pakistan Standard Time (PKT / UTC+5) year, month, date, hour, minute.
 * Always strictly computes UTC+5 regardless of the browser's local timezone.
 */
export function getPktDateComponents(isoOrDate?: string | Date | null) {
  if (!isoOrDate) {
    const now = new Date();
    const pktNow = new Date(now.getTime() + 5 * 60 * 60 * 1000);
    return {
      year: pktNow.getUTCFullYear(),
      month: pktNow.getUTCMonth(),
      date: pktNow.getUTCDate(),
      dayOfWeek: pktNow.getUTCDay(),
      hour: pktNow.getUTCHours(),
      minute: pktNow.getUTCMinutes(),
    };
  }
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (!isValidDate(d)) return null;
  const pkt = new Date(d.getTime() + 5 * 60 * 60 * 1000);
  return {
    year: pkt.getUTCFullYear(),
    month: pkt.getUTCMonth(),
    date: pkt.getUTCDate(),
    dayOfWeek: pkt.getUTCDay(),
    hour: pkt.getUTCHours(),
    minute: pkt.getUTCMinutes(),
  };
}

/**
 * Creates an ISO string from PKT (UTC+5) year, month (0-indexed), date, hour, minute.
 */
export function createPktIso(year: number, month: number, date: number, hour: number, minute: number = 0): string {
  const utcMs = Date.UTC(year, month, date, hour - 5, minute, 0, 0);
  return new Date(utcMs).toISOString();
}
