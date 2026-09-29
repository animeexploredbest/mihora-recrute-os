import React, { useState } from 'react';
import { Candidate } from '../types';
import {
  X,
  Bell,
  Clock,
  MessageCircle,
  Mail,
  Copy,
  Check,
  Video,
  Send,
  ExternalLink,
  Calendar,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { formatPktDateTime, formatLocalDateTime } from '../lib/date-utils';
import { detectCandidateGeo } from '../lib/geo-utils';
import { getAccessToken } from '../lib/auth';

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: Candidate;
  onReminderSent?: (candidateId: string) => Promise<void>;
}

export const ReminderModal: React.FC<ReminderModalProps> = ({
  isOpen,
  onClose,
  candidate,
  onReminderSent,
}) => {
  const [reminderType, setReminderType] = useState<'1h' | '24h' | 'now'>('1h');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const candidateGeo = detectCandidateGeo(candidate.location || candidate.country);
  const role = candidate.position || 'Software Engineer';
  const pktTime = candidate.suggestedPktTime
    ? formatPktDateTime(candidate.suggestedPktTime)
    : 'Scheduled Time';
  const localTime = candidate.suggestedPktTime
    ? formatLocalDateTime(candidate.suggestedPktTime, candidateGeo.timezone)
    : '';
  const meetLink = candidate.meetLink || 'Google Meet link provided in calendar invite';

  const getMessageContent = () => {
    if (reminderType === '1h') {
      return (
        `⏰ *Interview Reminder — Starting in 1 Hour!*\n\n` +
        `Hi ${candidate.name},\n\n` +
        `This is a quick reminder that your interview for the *${role}* position is starting in *1 hour*.\n\n` +
        `🗓 *Time:* ${pktTime} (PKT / UTC+5)\n` +
        (localTime ? `🌍 *Your Local Time:* ${localTime}\n` : '') +
        `🔗 *Google Meet Link:* ${meetLink}\n\n` +
        `Please ensure your camera and microphone are ready and join 5 minutes early. See you soon!\n\n` +
        `— RecruitSync Hiring Team`
      );
    } else if (reminderType === '24h') {
      return (
        `📅 *Upcoming Interview Reminder — Tomorrow!*\n\n` +
        `Hi ${candidate.name},\n\n` +
        `We are looking forward to our interview tomorrow for the *${role}* role.\n\n` +
        `🗓 *Date & Time:* ${pktTime} (PKT / UTC+5)\n` +
        (localTime ? `🌍 *Your Local Time:* ${localTime}\n` : '') +
        `🔗 *Google Meet Link:* ${meetLink}\n\n` +
        `If you have any questions or need to reschedule, please let us know in advance.\n\n` +
        `— RecruitSync Hiring Team`
      );
    } else {
      return (
        `🚀 *Your Interview is Starting NOW!*\n\n` +
        `Hi ${candidate.name},\n\n` +
        `The interview panel for *${role}* is waiting for you in the meeting room.\n\n` +
        `🔗 *Join Here:* ${meetLink}\n\n` +
        `See you inside!\n\n` +
        `— RecruitSync Hiring Team`
      );
    }
  };

  const messageText = getMessageContent();

  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const handleCopy = async () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (candidate.id && onReminderSent) {
      await onReminderSent(candidate.id);
    }
  };

  const handleOpenWhatsApp = async () => {
    // Sanitize phone number (strip spaces, dashes, parentheses)
    const cleanPhone = candidate.phone ? candidate.phone.replace(/[^0-9+]/g, '') : '';
    const encoded = encodeURIComponent(messageText);
    const url = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone.replace('+', '')}&text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;
    try {
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      window.location.href = url;
    }
    if (candidate.id && onReminderSent) {
      await onReminderSent(candidate.id);
    }
  };

  const handleSendDirectEmail = async () => {
    setIsSendingEmail(true);
    setEmailError(null);
    setEmailSuccess(null);

    const subject = `Interview Reminder: ${role} - ${candidate.name}`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1c1917; max-width: 600px; margin: 0 auto; border: 1px solid #e7e5e4; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #d97706; padding: 18px 24px; color: #ffffff;">
          <h2 style="margin: 0; font-size: 18px;">Interview Reminder: ${role}</h2>
        </div>
        <div style="padding: 24px; background-color: #ffffff;">
          <p style="margin-top: 0;">Hi <strong>${candidate.name}</strong>,</p>
          <p>${reminderType === 'now' ? 'The interview panel is waiting for you in the meeting room.' : reminderType === '1h' ? 'This is a reminder that your interview is starting in <strong>1 hour</strong>.' : 'This is a reminder for your upcoming interview tomorrow.'}</p>
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 14px 16px; margin: 18px 0; border-radius: 6px;">
            <p style="margin: 0; font-size: 14px; font-weight: bold; color: #92400e;">🗓 Date & Time: ${pktTime} (PKT / UTC+5)</p>
            ${localTime ? `<p style="margin: 4px 0 0 0; font-size: 13px; color: #78350f;">🌍 Your Local Time: ${localTime}</p>` : ''}
          </div>
          <p style="margin: 20px 0 8px 0;"><strong>Join Google Meet:</strong></p>
          <p style="margin: 0 0 20px 0;">
            <a href="${meetLink}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">
              Join Interview Call
            </a>
          </p>
          <p style="font-size: 12px; color: #78716c;">Link: ${meetLink}</p>
          <hr style="border: none; border-top: 1px solid #e7e5e4; margin: 20px 0;" />
          <p style="margin-bottom: 0; font-size: 13px; color: #57534e;">RecruitSync Hiring Team</p>
        </div>
      </div>
    `;

    try {
      // 1. Try sending via backend Titan Mail SMTP
      const mailRes = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: candidate.email,
          subject,
          text: messageText,
          html: emailHtml,
        }),
      });

      const mailData = await mailRes.json().catch(() => ({}));
      if (mailRes.ok && mailData.success) {
        setEmailSuccess(`Reminder delivered to ${candidate.email} via ${mailData.sender || 'Titan Mail'}!`);
        if (candidate.id && onReminderSent) await onReminderSent(candidate.id);
        setIsSendingEmail(false);
        return;
      }

      // 2. Fallback: Recruiter's connected Google account (Gmail API)
      const token = await getAccessToken();
      if (token) {
        // RFC 2822 email format with standard UTF-8 base64 encoding
        const utf8Subject = `=?utf-8?B?${btoa(
          encodeURIComponent(subject).replace(/%([0-9A-F]{2})/g, (_, p1) =>
            String.fromCharCode(parseInt(p1, 16))
          )
        )}?=`;

        const utf8HtmlBytes = new TextEncoder().encode(emailHtml);
        let binaryHtml = '';
        for (let i = 0; i < utf8HtmlBytes.length; i++) {
          binaryHtml += String.fromCharCode(utf8HtmlBytes[i]);
        }
        const base64Html = btoa(binaryHtml).match(/.{1,76}/g)?.join('\r\n') || '';

        const emailParts = [
          `To: ${candidate.email}`,
          `Subject: ${utf8Subject}`,
          'MIME-Version: 1.0',
          'Content-Type: text/html; charset=utf-8',
          'Content-Transfer-Encoding: base64',
          '',
          base64Html,
        ];

        const fullRaw = emailParts.join('\r\n');
        const utf8FullBytes = new TextEncoder().encode(fullRaw);
        let binaryFull = '';
        for (let i = 0; i < utf8FullBytes.length; i++) {
          binaryFull += String.fromCharCode(utf8FullBytes[i]);
        }
        const rawEmail = btoa(binaryFull)
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        const gmailRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ raw: rawEmail }),
        });

        if (gmailRes.ok) {
          setEmailSuccess(`Reminder delivered to ${candidate.email} via your Google account!`);
          if (candidate.id && onReminderSent) await onReminderSent(candidate.id);
          setIsSendingEmail(false);
          return;
        }
      }

      // 3. If direct sending fails, fallback to opening mailto client
      const mailtoUrl = `mailto:${candidate.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(messageText)}`;
      const mailtoLink = document.createElement('a');
      mailtoLink.href = mailtoUrl;
      document.body.appendChild(mailtoLink);
      mailtoLink.click();
      document.body.removeChild(mailtoLink);
      setEmailSuccess(`Opened in your mail client for ${candidate.email}`);
      if (candidate.id && onReminderSent) await onReminderSent(candidate.id);
    } catch (err: any) {
      console.warn('Direct email send error:', err);
      const mailtoUrl = `mailto:${candidate.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(messageText)}`;
      const mailtoLink = document.createElement('a');
      mailtoLink.href = mailtoUrl;
      document.body.appendChild(mailtoLink);
      mailtoLink.click();
      document.body.removeChild(mailtoLink);
      setEmailSuccess(`Opened in your mail client`);
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="p-5 border-b border-stone-200 dark:border-stone-800 bg-amber-50/60 dark:bg-amber-950/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-600/20">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                Send Interview Reminder
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                To: <strong className="text-stone-800 dark:text-stone-200">{candidate.name}</strong> ({candidate.email})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Dual-Timezone Comparison & Schedule Verification Banner */}
          <div className="p-3.5 bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700/80 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-600" />
                Scheduled Interview Time
              </span>
              <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">
                {candidateGeo.flag} {candidateGeo.country} ({candidateGeo.timezoneLabel})
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-white dark:bg-stone-900 rounded-lg border border-amber-200 dark:border-amber-900/50 shadow-2xs">
                <div className="text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">🇵🇰 Recruiter (PKT / UTC+5)</div>
                <div className="font-mono font-bold text-stone-900 dark:text-stone-100 text-xs mt-1">{pktTime}</div>
              </div>
              <div className="p-2.5 bg-white dark:bg-stone-900 rounded-lg border border-indigo-200 dark:border-indigo-900/50 shadow-2xs">
                <div className="text-[10px] font-bold text-indigo-800 dark:text-indigo-400 uppercase tracking-wider">{candidateGeo.flag} Candidate Local</div>
                <div className="font-mono font-bold text-stone-900 dark:text-stone-100 text-xs mt-1">{localTime || 'Not Scheduled'}</div>
              </div>
            </div>
          </div>

          {/* Template Selector */}
          <div>
            <label className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider block mb-2">
              Select Reminder Timing
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setReminderType('1h')}
                className={`py-2 px-3 rounded-xl border text-center transition-all cursor-pointer ${
                  reminderType === '1h'
                    ? 'bg-amber-600 text-white border-amber-700 shadow-md font-bold'
                    : 'bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-amber-50'
                }`}
              >
                <div className="text-xs">⏰ 1 Hour Before</div>
                <div className="text-[10px] opacity-80 mt-0.5">Most Popular</div>
              </button>

              <button
                type="button"
                onClick={() => setReminderType('24h')}
                className={`py-2 px-3 rounded-xl border text-center transition-all cursor-pointer ${
                  reminderType === '24h'
                    ? 'bg-amber-600 text-white border-amber-700 shadow-md font-bold'
                    : 'bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-amber-50'
                }`}
              >
                <div className="text-xs">📅 24 Hours (Day Before)</div>
                <div className="text-[10px] opacity-80 mt-0.5">Preparation</div>
              </button>

              <button
                type="button"
                onClick={() => setReminderType('now')}
                className={`py-2 px-3 rounded-xl border text-center transition-all cursor-pointer ${
                  reminderType === 'now'
                    ? 'bg-rose-600 text-white border-rose-700 shadow-md font-bold'
                    : 'bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-rose-50'
                }`}
              >
                <div className="text-xs">🚀 Starting Now</div>
                <div className="text-[10px] opacity-80 mt-0.5">Urgent Ping</div>
              </button>
            </div>
          </div>

          {/* Message Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                Formatted Reminder Preview
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Text'}</span>
              </button>
            </div>
            <pre className="text-xs p-3.5 rounded-xl bg-stone-900 text-stone-100 font-mono whitespace-pre-wrap leading-relaxed max-h-52 overflow-y-auto border border-stone-800">
              {messageText}
            </pre>
          </div>

          {/* Feedback message */}
          {emailSuccess && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{emailSuccess}</span>
            </div>
          )}

          {/* Direct Dispatch Actions */}
          <div className="pt-2 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleSendDirectEmail}
                disabled={isSendingEmail}
                className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                {isSendingEmail ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending Email...</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    <span>Send Reminder Email</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 fill-current" />
                <span>Send via WhatsApp</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="w-full py-2 px-3 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Formatted Text'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
