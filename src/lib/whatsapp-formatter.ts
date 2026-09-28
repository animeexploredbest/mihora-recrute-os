import { Candidate } from '../types';
import { formatPktDateTime } from './date-utils';
import { detectCandidateGeo } from './geo-utils';

export interface WhatsAppFormatOptions {
  style: 'detailed' | 'compact' | 'invite';
  includeMeetLinks: boolean;
  includeDuration: boolean;
  includeLocalTime: boolean;
  includePanel: boolean;
  includeLocation: boolean;
  includeNotes: boolean;
  customInterviewerEmails?: string;
}

export const DEFAULT_WHATSAPP_OPTIONS: WhatsAppFormatOptions = {
  style: 'detailed',
  includeMeetLinks: true,
  includeDuration: true,
  includeLocalTime: true,
  includePanel: true,
  includeLocation: true,
  includeNotes: false,
};

/**
 * Creates an individual, customized WhatsApp invitation message for a single candidate.
 */
export function formatSingleCandidateInvite(
  candidate: Candidate,
  options?: Partial<WhatsAppFormatOptions>
): string {
  const geo = detectCandidateGeo(candidate);
  const pktTime = formatPktDateTime(candidate.suggestedPktTime);
  const duration = candidate.durationMinutes || 45;
  const meetLink = candidate.meetLink || 'Will be shared shortly via Google Meet';
  const role = candidate.position || 'Candidate';
  const interviewers =
    options?.customInterviewerEmails ||
    'm.mattiulhasnain@gmail.com, mihora.tech@gmail.com';

  // Compute local time in candidate timezone if available
  let localTimeStr = '';
  if (candidate.suggestedPktTime && geo.timezone) {
    try {
      const d = new Date(candidate.suggestedPktTime);
      localTimeStr = d.toLocaleString('en-US', {
        timeZone: geo.timezone,
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      localTimeStr = '';
    }
  }

  return `*🎉 INTERVIEW INVITATION — RecruitSync*
━━━━━━━━━━━━━━━━━━━━
Dear *${candidate.name}*,

We are pleased to invite you to your interview for the position of *${role}*.

🗓️ *Date & Time (PKT):* ${pktTime}
${localTimeStr ? `🌐 *Your Local Time:* ${localTimeStr} (${geo.timezoneLabel || geo.country})\n` : ''}⏱️ *Meeting Duration:* ${duration} minutes
🔗 *Google Meet Link:* ${meetLink}
👥 *Interview Panel (CC):* ${interviewers}
${candidate.location ? `📍 *Location:* ${geo.flag} ${candidate.location}\n` : ''}
━━━━━━━━━━━━━━━━━━━━
📌 *Instructions for Candidate:*
• Please join using a stable internet connection in a quiet setting.
• Please open the Google Meet link 2–3 minutes prior to the start time.
• If you have questions or need to reschedule, reply directly to this message.

_Best regards,_
*Talent Acquisition & Engineering Team*`;
}

/**
 * Formats a list of candidates into a clean, WhatsApp-friendly text block with emojis & bold headers.
 */
export function formatCandidateListWhatsApp(
  candidates: Candidate[],
  options: WhatsAppFormatOptions = DEFAULT_WHATSAPP_OPTIONS
): string {
  if (!candidates || candidates.length === 0) {
    return `*📋 RECRUITSYNC INTERVIEW SCHEDULE*\n\n_No candidates currently found in this filter._`;
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const interviewers =
    options.customInterviewerEmails ||
    'm.mattiulhasnain@gmail.com, mihora.tech@gmail.com';

  // 1. Compact Agenda Style
  if (options.style === 'compact') {
    let output = `*🚀 INTERVIEWS AGENDA SUMMARY*\n`;
    output += `📅 *Date:* ${today}\n`;
    output += `👥 *Total Interviews:* ${candidates.length}\n`;
    output += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    candidates.forEach((c, index) => {
      const geo = detectCandidateGeo(c);
      const pktFormatted = formatPktDateTime(c.suggestedPktTime).replace(' (PKT)', '');
      const duration = c.durationMinutes || 45;
      const role = c.position ? `(${c.position})` : '';

      output += `*${index + 1}. ${c.name.trim()}* ${role} ${geo.flag}\n`;
      output += `   🕒 ${pktFormatted} PKT • ${duration}m\n`;
      if (options.includeMeetLinks && c.meetLink) {
        output += `   🔗 Meet: ${c.meetLink}\n`;
      }
      output += `\n`;
    });

    output += `━━━━━━━━━━━━━━━━━━━━\n`;
    if (options.includePanel) {
      output += `👥 *Panel:* ${interviewers}\n`;
    }
    output += `_Prepared via RecruitSync HR Management_`;
    return output;
  }

  // 2. Individual Invite Style (when 1 candidate is focused)
  if (options.style === 'invite' && candidates.length === 1) {
    return formatSingleCandidateInvite(candidates[0], options);
  }

  // 3. Detailed Master Schedule Style (Default)
  let output = `*📋 RECRUITSYNC PRO — INTERVIEWS MASTER LIST*\n`;
  output += `━━━━━━━━━━━━━━━━━━━━\n`;
  output += `📅 *Date Generated:* ${today}\n`;
  output += `👥 *Total Scheduled:* ${candidates.length}\n`;
  output += `━━━━━━━━━━━━━━━━━━━━\n\n`;

  const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

  candidates.forEach((c, index) => {
    const geo = detectCandidateGeo(c);
    const pktTime = formatPktDateTime(c.suggestedPktTime);
    const duration = c.durationMinutes || 45;
    const role = c.position || 'Software Engineer';

    let localTimeStr = '';
    if (options.includeLocalTime && c.suggestedPktTime && geo.timezone) {
      try {
        const d = new Date(c.suggestedPktTime);
        localTimeStr = d.toLocaleString('en-US', {
          timeZone: geo.timezone,
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
      } catch {
        localTimeStr = '';
      }
    }

    const numBadge = numberEmojis[index] || `*#${index + 1}*`;

    output += `${numBadge} *${c.name.trim()}* — *${role}*\n`;
    if (options.includeLocation) {
      output += `📍 *Location:* ${geo.flag} ${c.city ? `${c.city}, ` : ''}${geo.country}\n`;
    }
    output += `🕒 *PKT Time:* ${pktTime}\n`;
    if (options.includeLocalTime && localTimeStr) {
      output += `🌐 *Local Time:* ${localTimeStr} (${geo.timezoneLabel || geo.country})\n`;
    }
    if (options.includeDuration) {
      output += `⏱️ *Duration:* ${duration} minutes\n`;
    }
    if (options.includeMeetLinks) {
      output += `🔗 *Meet Link:* ${c.meetLink || 'Pending link generation'}\n`;
    }
    if (c.phone) {
      output += `📞 *Phone/WhatsApp:* ${c.phone}\n`;
    }
    if (c.email) {
      output += `✉️ *Email:* ${c.email}\n`;
    }
    output += `📌 *Status:* ${c.status}\n`;
    if (options.includeNotes && c.notes) {
      output += `📝 *Notes:* ${c.notes}\n`;
    }
    output += `----------------------------------------\n\n`;
  });

  output += `━━━━━━━━━━━━━━━━━━━━\n`;
  if (options.includePanel) {
    output += `👥 *Interview Panel (CC):* ${interviewers}\n`;
  }
  output += `_✨ Official Schedule — Powered by RecruitSync HR_`;

  return output;
}

/**
 * Normalizes any local or international phone number into standard WhatsApp digits format.
 * Intelligently handles Pakistan mobile numbers (e.g. "0300 1234567" -> "923001234567")
 * and international codes without breaking WhatsApp web links.
 */
export function normalizePhoneNumberForWhatsApp(phone?: string, countryHint?: string): string {
  if (!phone || phone.trim() === '' || phone.trim().toUpperCase() === 'N/A') return '';
  
  // Strip spaces, dashes, dots, brackets, slashes
  let cleaned = phone.trim().replace(/[\s\-\.\(\)\/\\]/g, '');
  
  // Replace leading 00 with +
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.substring(2);
  }

  // If already starts with '+', strip '+' and return remaining digits
  if (cleaned.startsWith('+')) {
    return cleaned.replace(/[^0-9]/g, '');
  }

  const digits = cleaned.replace(/[^0-9]/g, '');
  if (!digits) return '';

  const countryLower = (countryHint || '').toLowerCase();

  // Case 1: Pakistani mobile number starting with 03 (11 digits: e.g. 03001234567)
  if (digits.startsWith('03') && digits.length === 11) {
    return '92' + digits.substring(1);
  }

  // Case 2: Pakistani number without leading zero (10 digits: e.g. 3001234567)
  if (digits.startsWith('3') && digits.length === 10) {
    return '92' + digits;
  }

  // Case 3: Pakistani number already having 92 prefix (e.g. 923001234567, 12 digits)
  if (digits.startsWith('92') && digits.length === 12) {
    return digits;
  }

  // Case 4: UK mobile number (starts with 07 and 11 digits, e.g. 07123456789)
  if ((digits.startsWith('07') && digits.length === 11) || (countryLower.includes('uk') && digits.startsWith('0'))) {
    return '44' + digits.substring(1);
  }

  // Case 5: UAE mobile number (starts with 05 and 10 digits, e.g. 0501234567)
  if ((digits.startsWith('05') && digits.length === 10) || (countryLower.includes('uae') && digits.startsWith('0'))) {
    return '971' + digits.substring(1);
  }

  // Case 6: US/Canada 10-digit number
  if ((countryLower.includes('united states') || countryLower.includes('usa') || countryLower.includes('canada')) && digits.length === 10) {
    return '1' + digits;
  }

  // Case 7: General leading zero with countryHint Pakistan (or default)
  if (digits.startsWith('0')) {
    return '92' + digits.substring(1);
  }

  return digits;
}

/**
 * Cleans phone numbers for WhatsApp api links (retains backwards compatibility)
 */
export function cleanPhoneNumber(phone?: string, countryHint?: string): string {
  return normalizePhoneNumberForWhatsApp(phone, countryHint);
}

/**
 * Validates whether a phone number can be successfully opened in WhatsApp
 */
export function validateWhatsAppPhone(phone?: string, countryHint?: string): {
  isValid: boolean;
  normalized: string;
  display: string;
  message: string;
} {
  const normalized = normalizePhoneNumberForWhatsApp(phone, countryHint);
  if (!normalized) {
    return {
      isValid: false,
      normalized: '',
      display: '',
      message: 'No recipient phone number provided',
    };
  }

  // WhatsApp numbers are international digits: typically 9 to 15 digits
  if (normalized.length < 8 || normalized.length > 16) {
    return {
      isValid: false,
      normalized,
      display: '+' + normalized,
      message: 'Invalid phone length for international WhatsApp delivery',
    };
  }

  return {
    isValid: true,
    normalized,
    display: '+' + normalized,
    message: 'Valid international WhatsApp format',
  };
}

/**
 * Generates an https://api.whatsapp.com/send URL for direct 1-click web dispatch.
 */
export function generateWhatsAppUrl(text: string, phone?: string, countryHint?: string): string {
  const cleanedPhone = normalizePhoneNumberForWhatsApp(phone, countryHint);
  const encodedText = encodeURIComponent(text);
  if (cleanedPhone) {
    return `https://api.whatsapp.com/send?phone=${cleanedPhone}&text=${encodedText}`;
  }
  return `https://api.whatsapp.com/send?text=${encodedText}`;
}
