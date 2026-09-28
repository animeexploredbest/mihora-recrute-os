import React from 'react';
import { UserSettings, updateUserSettings } from '../lib/firebase-operations';
import { HARD_BLOCKED_EMAILS } from '../lib/auth';
import { DEFAULT_INTERVIEW_TRACKS } from '../lib/track-constants';
import { X, Save, Clock, ShieldAlert, UserX, Layers } from 'lucide-react';

interface SettingsModalProps {
  userId: string;
  settings: UserSettings;
  onClose: () => void;
  onSave: (settings: UserSettings) => void;
  onOpenStaffModal?: () => void;
}

export function SettingsModal({ userId, settings, onClose, onSave, onOpenStaffModal }: SettingsModalProps) {
  const [template, setTemplate] = React.useState(settings.emailTemplate);
  const [interviewerEmails, setInterviewerEmails] = React.useState(
    settings.interviewerEmails || 'm.mattiulhasnain@gmail.com, mihora.tech@gmail.com'
  );
  const [defaultDurationMinutes, setDefaultDurationMinutes] = React.useState<number>(
    settings.defaultDurationMinutes || 45
  );
  const [maxConcurrentSlots, setMaxConcurrentSlots] = React.useState<number>(
    settings.maxConcurrentSlots || 4
  );
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [emailConfig, setEmailConfig] = React.useState<{ configured: boolean; email: string; provider: string } | null>(null);

  React.useEffect(() => {
    fetch('/api/email-config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setEmailConfig(data);
      })
      .catch((e) => console.warn('Failed to load email config:', e));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateUserSettings(userId, {
        emailTemplate: template,
        interviewerEmails: interviewerEmails.trim(),
        defaultDurationMinutes,
        maxConcurrentSlots,
      });
      onSave({
        ...settings,
        emailTemplate: template,
        interviewerEmails: interviewerEmails.trim(),
        defaultDurationMinutes,
        maxConcurrentSlots,
      });
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to save settings');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 overflow-hidden animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        <div className="p-5 sm:p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold font-display text-gray-900">Interview &amp; Workspace Settings</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center justify-between">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-red-500 hover:text-red-800 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Team Staff Accounts Manager */}
          {onOpenStaffModal && (
            <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-blue-950 block">
                  Team &amp; Staff User Accounts
                </span>
                <p className="text-[11px] text-blue-800">
                  Register next team members with Username and Password, or assign roles.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenStaffModal();
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
              >
                Manage Staff
              </button>
            </div>
          )}

          {/* Hard-Blocked Accounts & Access Control Status */}
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                Access Control &amp; Hard-Blocked Emails
              </span>
              <span className="text-[10px] font-bold text-rose-800 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded-full">
                {HARD_BLOCKED_EMAILS.length} Blocked
              </span>
            </div>
            <p className="text-[11px] text-rose-900 leading-relaxed">
              These accounts are strictly blocked at both the <strong>Firestore Security Rules</strong> database layer and the authentication gate. All database operations, token validation, and pipeline access are rejected.
            </p>
            <div className="space-y-1 mt-1">
              {HARD_BLOCKED_EMAILS.map((email) => (
                <div
                  key={email}
                  className="flex items-center justify-between px-2.5 py-1.5 bg-white border border-rose-200 rounded-lg text-xs"
                >
                  <div className="flex items-center gap-2">
                    <UserX className="w-3.5 h-3.5 text-rose-600" />
                    <span className="font-mono text-stone-800 font-semibold">{email}</span>
                  </div>
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                    Hard Blocked
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Titan Mail Server Integration Status */}
          <div className={`border rounded-xl p-3.5 space-y-1 ${
            emailConfig?.configured
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-amber-50 border-amber-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold flex items-center gap-1.5 ${
                emailConfig?.configured ? 'text-emerald-950' : 'text-amber-950'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  emailConfig?.configured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`} />
                Corporate HR Dispatcher: Titan Mail
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                emailConfig?.configured
                  ? 'text-emerald-800 bg-emerald-100 border-emerald-300'
                  : 'text-amber-800 bg-amber-100 border-amber-300'
              }`}>
                {emailConfig?.configured ? 'Active & Configured' : 'Credentials Pending'}
              </span>
            </div>
            <p className={`text-xs ${emailConfig?.configured ? 'text-emerald-900' : 'text-amber-900'}`}>
              Sender Account: <span className="font-mono font-bold">{emailConfig?.email || 'hr@mihora.tech'}</span> (smtp.titan.email:465)
            </p>
            <p className={`text-[11px] ${emailConfig?.configured ? 'text-emerald-700' : 'text-amber-800'}`}>
              {emailConfig?.configured
                ? 'All interview invitations and rescheduling notices are automatically dispatched directly from hr@mihora.tech.'
                : 'Server is awaiting TITAN_EMAIL and TITAN_PASSWORD environment credentials. Direct sending will fallback to recruiter account or webmail.'}
            </p>
          </div>

          {/* Interviewers CC field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
              Default Interviewer Guests &amp; CC Emails
            </label>
            <input
              type="text"
              value={interviewerEmails}
              onChange={(e) => setInterviewerEmails(e.target.value)}
              placeholder="m.mattiulhasnain@gmail.com, mihora.tech@gmail.com"
              className="w-full border-gray-300 rounded-xl shadow-xs focus:border-indigo-500 focus:ring-indigo-500 text-xs p-2.5 border font-mono bg-white text-gray-900 placeholder:text-gray-500 font-medium"
            />
            <p className="text-[11px] text-gray-500">
              These emails will automatically be invited as meeting guests in Google Calendar and CC&apos;d on all interview invitations.
            </p>
          </div>

          {/* Default Meeting Duration */}
          <div className="space-y-2 bg-amber-50/50 border border-amber-200/70 rounded-xl p-3.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-700" />
                Default Meeting Duration
              </label>
              <span className="text-xs font-mono font-bold text-amber-900 bg-amber-100/90 border border-amber-300 px-2 py-0.5 rounded-md">
                {defaultDurationMinutes} mins
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {[15, 30, 45, 60, 90, 120].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDefaultDurationMinutes(mins)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                    defaultDurationMinutes === mins
                      ? 'bg-amber-600 text-white border-amber-700 shadow-xs ring-2 ring-amber-400/40'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-amber-50 hover:border-amber-300'
                  }`}
                >
                  {mins < 60 ? `${mins}m` : mins === 60 ? '1 hr' : `${mins / 60} hrs`}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-amber-800/80">
              New scheduling requests will default to this duration when calculating calendar end times and invites.
            </p>
          </div>

          {/* Multi-Track Concurrent Interview Capacity & Rooms */}
          <div className="space-y-3 bg-gradient-to-br from-indigo-50/70 to-purple-50/50 border border-indigo-200/90 rounded-xl p-3.5 sm:p-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                Concurrent Capacity (Parallel Slots)
              </label>
              <span className="text-xs font-mono font-bold text-indigo-900 bg-indigo-100/90 border border-indigo-300 px-2 py-0.5 rounded-md">
                {maxConcurrentSlots} Concurrent Interviews Max
              </span>
            </div>
            <p className="text-[11px] text-indigo-900/80 leading-relaxed">
              Maximum simultaneous interviews allowed in the exact same hour slot across distinct tracks and interviewers.
            </p>
            <div className="grid grid-cols-5 gap-1.5">
              {[1, 2, 3, 4, 6].map((cap) => (
                <button
                  key={cap}
                  type="button"
                  onClick={() => setMaxConcurrentSlots(cap)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                    maxConcurrentSlots === cap
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs ring-2 ring-indigo-400/40'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-indigo-50 hover:border-indigo-300'
                  }`}
                >
                  {cap === 1 ? '1 (Single)' : `${cap} Parallel`}
                </button>
              ))}
            </div>

            {/* Configured Interview Tracks & Rooms */}
            <div className="pt-2 border-t border-indigo-100 space-y-2">
              <span className="text-[11px] font-bold text-indigo-950 uppercase tracking-wider block">
                Active Virtual Rooms &amp; Panels ({DEFAULT_INTERVIEW_TRACKS.length})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DEFAULT_INTERVIEW_TRACKS.map((track) => (
                  <div
                    key={track.id}
                    className="p-2.5 rounded-lg bg-white border border-indigo-100 text-xs shadow-2xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${track.badgeBg} ${track.badgeBorder}`}>
                        {track.shortCode}
                      </span>
                      <span className="text-[10px] font-semibold text-gray-500">1 candidate/room</span>
                    </div>
                    <div className="font-bold text-gray-800 text-[11px]">{track.panelName}</div>
                    <div className="text-[10px] text-gray-500 leading-tight">{track.description}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Email template */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
              Candidate Invitation Template
            </label>
            <p className="text-xs text-gray-500">
              Placeholders: <code>{`{name}`}</code>, <code>{`{date}`}</code>, <code>{`{time}`}</code>, <code>{`{duration}`}</code>, <code>{`{meetLink}`}</code>, <code>{`{role}`}</code>, and <code>{`{interviewers}`}</code>.
            </p>
            <textarea
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              rows={7}
              className="w-full border-gray-300 rounded-xl shadow-xs focus:border-indigo-500 focus:ring-indigo-500 font-mono text-xs p-3 border bg-white text-gray-900 placeholder:text-gray-500"
            />
          </div>
        </div>

        {/* Pinned Action Footer */}
        <div className="flex justify-end space-x-3 p-4 sm:p-5 border-t border-gray-100 bg-gray-50/80 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 font-medium transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 text-sm text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 font-medium flex items-center shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            {saving ? 'Saving...' : <><Save className="w-4 h-4 mr-1.5" /> Save Settings</>}
          </button>
        </div>
      </div>
    </div>
  );
}
