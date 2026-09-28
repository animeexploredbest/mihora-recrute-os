import React, { useState, useMemo, useEffect } from 'react';
import { Candidate } from '../types';
import {
  X,
  Copy,
  Check,
  Share2,
  ExternalLink,
  MessageCircle,
  Clock,
  Video,
  Globe,
  Users,
  Calendar,
  Send,
  Sliders,
  Filter,
  CheckSquare,
  Square,
  Sparkles,
  Phone,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import {
  WhatsAppFormatOptions,
  DEFAULT_WHATSAPP_OPTIONS,
  formatCandidateListWhatsApp,
  formatSingleCandidateInvite,
  generateWhatsAppUrl,
  cleanPhoneNumber,
  validateWhatsAppPhone,
} from '../lib/whatsapp-formatter';
import { detectCandidateGeo } from '../lib/geo-utils';
import { recordWhatsAppSent } from '../lib/firebase-operations';

interface WhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  allCandidates: Candidate[];
  defaultInterviewerEmails?: string;
  initialSelectedCandidate?: Candidate;
  onWhatsAppSent?: (candidateId: string) => void;
}

export const WhatsAppShareModal: React.FC<WhatsAppShareModalProps> = ({
  isOpen,
  onClose,
  allCandidates,
  defaultInterviewerEmails,
  initialSelectedCandidate,
  onWhatsAppSent,
}) => {
  // Scope filter: 'scheduled' | 'today' | 'all' | 'custom'
  const [scope, setScope] = useState<'scheduled' | 'today' | 'all' | 'custom'>(
    initialSelectedCandidate ? 'custom' : 'scheduled'
  );

  // Selected candidate IDs for custom selection
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    if (initialSelectedCandidate?.id) {
      return [initialSelectedCandidate.id];
    }
    // Default to scheduled candidates
    return allCandidates
      .filter((c) => c.status === 'Scheduled' || c.status === 'Rescheduled' || c.meetLink)
      .map((c) => c.id || c.name);
  });

  // Formatting options
  const [options, setOptions] = useState<WhatsAppFormatOptions>({
    ...DEFAULT_WHATSAPP_OPTIONS,
    customInterviewerEmails: defaultInterviewerEmails || 'm.mattiulhasnain@gmail.com, mihora.tech@gmail.com',
  });

  // Copy success state
  const [copied, setCopied] = useState(false);

  // Filter candidates based on scope
  const targetCandidates = useMemo(() => {
    if (scope === 'custom') {
      return allCandidates.filter((c) => selectedIds.includes(c.id || c.name));
    }
    if (scope === 'scheduled') {
      return allCandidates.filter(
        (c) => c.status === 'Scheduled' || c.status === 'Rescheduled' || Boolean(c.meetLink)
      );
    }
    if (scope === 'today') {
      const todayStr = new Date().toISOString().split('T')[0];
      return allCandidates.filter((c) => {
        if (!c.suggestedPktTime) return false;
        return c.suggestedPktTime.startsWith(todayStr);
      });
    }
    // 'all'
    return allCandidates;
  }, [allCandidates, scope, selectedIds]);

  // Single targeted candidate
  const singleCandidate = targetCandidates.length === 1 ? targetCandidates[0] : null;

  // Recipient phone state
  const [recipientPhone, setRecipientPhone] = useState<string>(
    initialSelectedCandidate?.phone && initialSelectedCandidate.phone !== 'N/A'
      ? initialSelectedCandidate.phone
      : ''
  );

  useEffect(() => {
    if (singleCandidate?.phone && singleCandidate.phone !== 'N/A') {
      setRecipientPhone(singleCandidate.phone);
    } else if (targetCandidates.length !== 1 && !initialSelectedCandidate) {
      setRecipientPhone('');
    }
  }, [singleCandidate, initialSelectedCandidate, targetCandidates.length]);

  const phoneValidation = useMemo(() => {
    if (!recipientPhone.trim()) return null;
    return validateWhatsAppPhone(recipientPhone, singleCandidate?.country);
  }, [recipientPhone, singleCandidate]);

  // Generated WhatsApp message text
  const formattedText = useMemo(() => {
    if (options.style === 'invite' && targetCandidates.length === 1) {
      return formatSingleCandidateInvite(targetCandidates[0], options);
    }
    return formatCandidateListWhatsApp(targetCandidates, options);
  }, [targetCandidates, options]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  };

  const handleOpenWhatsApp = (phoneToUse?: string) => {
    const rawPhone = phoneToUse !== undefined ? phoneToUse : recipientPhone;
    const url = generateWhatsAppUrl(formattedText, rawPhone, singleCandidate?.country);
    try {
      const w = window.open(url, '_blank', 'noopener,noreferrer');
      if (!w) {
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch {
      window.location.href = url;
    }

    if (singleCandidate?.id) {
      recordWhatsAppSent(singleCandidate.id).catch((err) => {
        console.warn('Could not record WhatsApp dispatch in Firestore:', err);
      });
      if (onWhatsAppSent) {
        onWhatsAppSent(singleCandidate.id);
      }
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === allCandidates.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allCandidates.map((c) => c.id || c.name));
    }
  };

  const toggleCandidate = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
              <MessageCircle className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                WhatsApp & Chat Formatted Schedule
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                  Ready to Share
                </span>
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Instantly generate beautiful, copyable WhatsApp text with emojis, Meet links, and PKT/local timings
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          
          {/* Top Controls Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* 1. Scope Filter */}
            <div className="space-y-2 bg-stone-50 dark:bg-stone-800/40 p-3.5 rounded-xl border border-stone-200 dark:border-stone-800">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-emerald-600" />
                Select Candidates to Include
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => setScope('scheduled')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    scope === 'scheduled'
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-400/30'
                      : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-100'
                  }`}
                >
                  Scheduled ({allCandidates.filter(c => c.status === 'Scheduled' || c.status === 'Rescheduled' || c.meetLink).length})
                </button>
                <button
                  type="button"
                  onClick={() => setScope('today')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    scope === 'today'
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-400/30'
                      : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-100'
                  }`}
                >
                  Today's Agenda
                </button>
                <button
                  type="button"
                  onClick={() => setScope('all')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    scope === 'all'
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-400/30'
                      : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-100'
                  }`}
                >
                  All ({allCandidates.length})
                </button>
                <button
                  type="button"
                  onClick={() => setScope('custom')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    scope === 'custom'
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-400/30'
                      : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-100'
                  }`}
                >
                  Custom Pick ({selectedIds.length})
                </button>
              </div>

              {/* Custom selection list if active */}
              {scope === 'custom' && (
                <div className="pt-2 border-t border-stone-200 dark:border-stone-700 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-stone-500">
                    <span>Select candidates manually:</span>
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="text-emerald-600 hover:underline font-bold cursor-pointer"
                    >
                      {selectedIds.length === allCandidates.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                    {allCandidates.map((c) => {
                      const id = c.id || c.name;
                      const isSelected = selectedIds.includes(id);
                      return (
                        <div
                          key={id}
                          onClick={() => toggleCandidate(id)}
                          className={`flex items-center gap-2 px-2.5 py-1 rounded-md text-xs cursor-pointer border transition-colors ${
                            isSelected
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-200 font-semibold'
                              : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300'
                          }`}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
                          )}
                          <span className="truncate">{c.name}</span>
                          <span className="text-[10px] text-stone-400 ml-auto flex-shrink-0">
                            {c.position || 'Candidate'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Format Template Style */}
            <div className="space-y-2 bg-stone-50 dark:bg-stone-800/40 p-3.5 rounded-xl border border-stone-200 dark:border-stone-800">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                Format Layout Style
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setOptions((prev) => ({ ...prev, style: 'detailed' }))}
                  className={`py-2 px-2 rounded-lg text-xs font-semibold border text-center transition-all cursor-pointer ${
                    options.style === 'detailed'
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-400/30'
                      : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <div className="font-bold">📋 Master List</div>
                  <div className="text-[10px] opacity-80 mt-0.5">Full Details</div>
                </button>
                <button
                  type="button"
                  onClick={() => setOptions((prev) => ({ ...prev, style: 'compact' }))}
                  className={`py-2 px-2 rounded-lg text-xs font-semibold border text-center transition-all cursor-pointer ${
                    options.style === 'compact'
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-400/30'
                      : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <div className="font-bold">⚡ Compact</div>
                  <div className="text-[10px] opacity-80 mt-0.5">Quick Agenda</div>
                </button>
                <button
                  type="button"
                  onClick={() => setOptions((prev) => ({ ...prev, style: 'invite' }))}
                  className={`py-2 px-2 rounded-lg text-xs font-semibold border text-center transition-all cursor-pointer ${
                    options.style === 'invite'
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-400/30'
                      : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <div className="font-bold">✉️ Invitation</div>
                  <div className="text-[10px] opacity-80 mt-0.5">For Candidate</div>
                </button>
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-2 text-[11px] text-stone-600 dark:text-stone-300 font-medium">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.includeMeetLinks}
                    onChange={(e) =>
                      setOptions((prev) => ({ ...prev, includeMeetLinks: e.target.checked }))
                    }
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Meet Links</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.includeDuration}
                    onChange={(e) =>
                      setOptions((prev) => ({ ...prev, includeDuration: e.target.checked }))
                    }
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Duration</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.includeLocalTime}
                    onChange={(e) =>
                      setOptions((prev) => ({ ...prev, includeLocalTime: e.target.checked }))
                    }
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Local Time</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.includeLocation}
                    onChange={(e) =>
                      setOptions((prev) => ({ ...prev, includeLocation: e.target.checked }))
                    }
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Flag/Location</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.includePanel}
                    onChange={(e) =>
                      setOptions((prev) => ({ ...prev, includePanel: e.target.checked }))
                    }
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Interviewers</span>
                </label>
              </div>
            </div>
          </div>

          {/* Recipient Phone & Direct Dispatch Target */}
          <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/60 rounded-xl p-3 sm:p-4 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-emerald-600" />
                Recipient WhatsApp Number
                {singleCandidate && (
                  <span className="font-normal text-stone-500 dark:text-stone-400">
                    ({singleCandidate.name})
                  </span>
                )}
              </label>

              {phoneValidation && (
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                    phoneValidation.isValid
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-700'
                      : 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-700'
                  }`}
                >
                  {phoneValidation.isValid ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>{phoneValidation.display} (Ready)</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3 h-3 text-amber-600" />
                      <span>{phoneValidation.message}</span>
                    </>
                  )}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder="e.g. 0300 1234567 or +92 300 1234567"
                  className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {phoneValidation?.isValid && (
                <button
                  type="button"
                  onClick={() => handleOpenWhatsApp(phoneValidation.normalized)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              )}
            </div>

            <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-normal">
              💡 <strong>Smart auto-formatting:</strong> Automatically converts Pakistani mobile numbers (e.g. <code className="text-emerald-700 font-mono">0300...</code> &rarr; <code className="text-emerald-700 font-mono">+92 300...</code>) and international codes so WhatsApp web links never produce &quot;invalid number&quot; errors.
            </p>
          </div>

          {/* WhatsApp Chat Preview Container */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                  Live WhatsApp Preview
                </span>
                <span className="text-[11px] font-mono text-stone-500">
                  ({targetCandidates.length} {targetCandidates.length === 1 ? 'interview' : 'interviews'})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    copied
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 dark:bg-emerald-950 dark:hover:bg-emerald-900 dark:text-emerald-200'
                  }`}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied to Clipboard!' : 'Copy Formatted Text'}</span>
                </button>
              </div>
            </div>

            {/* Simulated WhatsApp Chat Room Screen */}
            <div className="relative rounded-2xl p-4 sm:p-5 bg-[#efeae2] dark:bg-[#0b141a] border border-stone-300 dark:border-stone-800 shadow-inner font-sans min-h-[260px] max-h-[380px] overflow-y-auto">
              {/* WhatsApp message bubble */}
              <div className="max-w-xl mx-auto bg-white dark:bg-[#202c33] text-stone-800 dark:text-[#e9edef] rounded-2xl p-4 shadow-sm border border-stone-200/50 dark:border-stone-700/50 relative">
                
                {/* Bubble tiny tail effect */}
                <div className="absolute top-0 right-4 -translate-y-1/2 w-3 h-3 bg-white dark:bg-[#202c33] rotate-45 border-l border-t border-stone-200/50 dark:border-stone-700/50" />

                <pre className="font-mono text-xs whitespace-pre-wrap break-words leading-relaxed select-all">
                  {formattedText}
                </pre>

                <div className="mt-2 text-right text-[10px] text-stone-400 dark:text-stone-500 font-sans flex items-center justify-end gap-1">
                  <span>Just now</span>
                  <span className="text-emerald-500 font-bold">✓✓</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer / Direct Actions */}
        <div className="p-4 sm:p-5 border-t border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/80 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-stone-500 dark:text-stone-400">
            {targetCandidates.length === 0 ? (
              <span className="text-amber-600 font-semibold">No candidates selected for export</span>
            ) : (
              <span>Formatted with bolding (<code className="text-emerald-600 font-bold">*text*</code>), emojis, and Google Meet hyperlinks.</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {/* If recipient phone is provided and valid, offer direct send */}
            {phoneValidation?.isValid && (
              <button
                type="button"
                onClick={() => handleOpenWhatsApp(phoneValidation.normalized)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-md transition-all cursor-pointer"
                title={`Open WhatsApp chat with ${phoneValidation.display}`}
              >
                <Send className="w-4 h-4" />
                <span>
                  {singleCandidate
                    ? `Send to ${singleCandidate.name.split(' ')[0]}`
                    : `Send to ${phoneValidation.display}`}
                </span>
              </button>
            )}

            {/* Open WhatsApp Web / App */}
            <button
              type="button"
              onClick={() => handleOpenWhatsApp()}
              disabled={targetCandidates.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open in WhatsApp</span>
            </button>

            {/* Primary Copy Button */}
            <button
              type="button"
              onClick={handleCopy}
              disabled={targetCandidates.length === 0}
              className={`inline-flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl text-white shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                copied
                  ? 'bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-400/50'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Schedule for WhatsApp'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
