import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Zap,
  Calendar,
  Mail,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Video,
  Play,
  Pause,
  RotateCcw,
  ExternalLink,
  Search,
  Filter,
  Users,
  CheckSquare,
  Square,
  ShieldCheck,
  FastForward,
} from 'lucide-react';
import { Candidate } from '../types';
import {
  executeMattiBatchDispatch,
  executeOmemaBatchDispatch,
  MATTI_CANDIDATES_RAW,
  OMEM_CANDIDATES_RAW,
  SLOT_TIMES,
  getDatePlusDays,
} from '../lib/matti-omema-batch';
import { getAccessToken, hasCalendarAccess } from '../lib/auth';
import { formatPktDateTime } from '../lib/date-utils';

interface MattiOmemaBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: Candidate[];
  userId: string;
  onRefresh: () => void;
  showToast: (text: string, type?: 'success' | 'error') => void;
  isCalendarConnected?: boolean;
  onConnectCalendar?: () => Promise<void>;
}

export function MattiOmemaBatchModal({
  isOpen,
  onClose,
  candidates,
  userId,
  onRefresh,
  showToast,
  isCalendarConnected = false,
  onConnectCalendar,
}: MattiOmemaBatchModalProps) {
  // Track selection
  const [activeTrack, setActiveTrack] = useState<'matti' | 'omema'>('matti');

  // Schedule Configuration: default starting date 5th of October 2026
  const [startDate, setStartDate] = useState('2026-10-05');
  const [clearOld, setClearOld] = useState(false);

  // Dispatch mode: 'selection' (fauran email / selective) vs 'drip' (30 emails / 30 mins)
  const [dispatchMode, setDispatchMode] = useState<'selection' | 'drip'>('selection');

  // Selection state
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'scheduled'>('pending');
  const [searchTerm, setSearchTerm] = useState('');

  // Execution state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState('');

  // 30-min Drip Automation State
  const [isDripActive, setIsDripActive] = useState(false);
  const [dripTimerSeconds, setDripTimerSeconds] = useState(1800); // 30 minutes = 1800 seconds
  const [isDripPaused, setIsDripPaused] = useState(false);
  const [dripBatchNumber, setDripBatchNumber] = useState(1);
  const [dripStatusNotice, setDripStatusNotice] = useState('');
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Raw candidates for active track
  const currentRawList = activeTrack === 'matti' ? MATTI_CANDIDATES_RAW : OMEM_CANDIDATES_RAW;

  // Augment raw candidates with live database statuses
  const augmentedCandidates = currentRawList.map((raw, index) => {
    const existing = candidates.find(
      (c) => c.email && c.email.trim().toLowerCase() === raw.email.trim().toLowerCase()
    );
    const dayOffset = Math.floor(index / 10);
    const slotIndex = index % 10;
    const targetDate = getDatePlusDays(startDate, dayOffset);
    const slot = SLOT_TIMES[slotIndex];
    const suggestedPktTime = `${targetDate}T${slot.start}:00+05:00`;

    const isScheduled = Boolean(
      existing &&
        (existing.status === 'Scheduled' ||
          existing.status === 'Rescheduled' ||
          existing.status === 'Interviewed' ||
          existing.status === 'Selected' ||
          existing.meetLink)
    );

    return {
      ...raw,
      canonicalIndex: index,
      suggestedPktTime: existing?.suggestedPktTime || suggestedPktTime,
      status: existing ? existing.status : 'Pending',
      isScheduled,
      meetLink: existing?.meetLink,
      calendarEventLink: existing?.calendarEventLink,
      existingId: existing?.id,
    };
  });

  // Filter augmented candidates
  const filteredCandidates = augmentedCandidates.filter((c) => {
    if (filterTab === 'pending' && c.isScheduled) return false;
    if (filterTab === 'scheduled' && !c.isScheduled) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.role.toLowerCase().includes(q) ||
        (c.location && c.location.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const pendingCount = augmentedCandidates.filter((c) => !c.isScheduled).length;
  const scheduledCount = augmentedCandidates.filter((c) => c.isScheduled).length;

  // Auto-select pending candidates helper
  const handleSelectAllPending = () => {
    const pendingEmails = augmentedCandidates
      .filter((c) => !c.isScheduled)
      .map((c) => c.email.toLowerCase());
    setSelectedEmails(new Set(pendingEmails));
  };

  const handleSelectFirst30Pending = () => {
    const pendingEmails = augmentedCandidates
      .filter((c) => !c.isScheduled)
      .slice(0, 30)
      .map((c) => c.email.toLowerCase());
    setSelectedEmails(new Set(pendingEmails));
  };

  const handleClearSelection = () => {
    setSelectedEmails(new Set());
  };

  const handleToggleSelectCandidate = (email: string) => {
    const clean = email.toLowerCase();
    setSelectedEmails((prev) => {
      const next = new Set(prev);
      if (next.has(clean)) {
        next.delete(clean);
      } else {
        next.add(clean);
      }
      return next;
    });
  };

  // Dispatch runner
  const runDispatch = async (targetEmails?: string[]) => {
    setIsProcessing(true);
    try {
      const token = await getAccessToken();
      const dispatcher = activeTrack === 'matti' ? executeMattiBatchDispatch : executeOmemaBatchDispatch;

      const res = await dispatcher(
        candidates,
        userId,
        startDate,
        clearOld,
        (msg) => setProgressText(msg),
        targetEmails,
        token
      );

      if (res.success) {
        showToast(
          `Successfully scheduled ${res.count} candidate(s), created real Google Calendar events & Meet links, and dispatched invitations!`,
          'success'
        );
        onRefresh();
        // Clear processed emails from current selection
        setSelectedEmails((prev) => {
          const next = new Set(prev);
          if (targetEmails) {
            targetEmails.forEach((e) => next.delete(e.toLowerCase()));
          } else {
            next.clear();
          }
          return next;
        });
        return res;
      } else {
        showToast(`Batch dispatch error: ${res.error}`, 'error');
        return res;
      }
    } catch (err: any) {
      showToast(`Batch error: ${err.message}`, 'error');
      return { success: false, count: 0, totalPendingRemaining: 0, dispatched: [], error: err.message };
    } finally {
      setIsProcessing(false);
      setProgressText('');
    }
  };

  // Instant / Selection Dispatch
  const handleDispatchSelected = async () => {
    if (selectedEmails.size === 0) {
      showToast('Please select at least 1 candidate to dispatch.', 'error');
      return;
    }
    const emailsToProcess = Array.from(selectedEmails) as string[];
    await runDispatch(emailsToProcess);
  };

  // Full Track Dispatch
  const handleDispatchAllTrack = async () => {
    const pendingEmails = augmentedCandidates
      .filter((c) => !c.isScheduled)
      .map((c) => c.email.toLowerCase());

    if (pendingEmails.length === 0) {
      showToast('All candidates in this track are already scheduled & emailed!', 'success');
      return;
    }

    await runDispatch(pendingEmails);
  };

  // Drip Runner (30 Emails every 30 Minutes until all completed)
  const startDripScheduler = async () => {
    const unscheduled = augmentedCandidates.filter((c) => !c.isScheduled);
    if (unscheduled.length === 0) {
      showToast('All candidates are already scheduled! No pending emails.', 'success');
      return;
    }

    setIsDripActive(true);
    setIsDripPaused(false);
    setDripBatchNumber(1);

    // Process Batch 1: first 30 pending
    const batch1 = unscheduled.slice(0, 30).map((c) => c.email.toLowerCase());
    setDripStatusNotice(`Dispatching Batch 1 (${batch1.length} candidates)...`);
    const res = await runDispatch(batch1);

    if (res.success) {
      const remaining = augmentedCandidates.filter((c) => !c.isScheduled && !batch1.includes(c.email.toLowerCase()));
      if (remaining.length === 0) {
        setIsDripActive(false);
        setDripStatusNotice('All candidate appointments complete!');
        showToast('🎉 All appointments successfully scheduled and invitations delivered!', 'success');
      } else {
        setDripStatusNotice(
          `Batch 1 complete (${batch1.length} emailed). Next batch of ${Math.min(30, remaining.length)} candidates in 30 minutes.`
        );
        setDripTimerSeconds(1800); // 30 minutes
      }
    } else {
      setIsDripActive(false);
    }
  };

  // Trigger next batch in drip immediately (skip timer)
  const triggerNextDripBatchNow = async () => {
    const remaining = augmentedCandidates.filter((c) => !c.isScheduled);
    if (remaining.length === 0) {
      setIsDripActive(false);
      showToast('All candidate appointments have been scheduled!', 'success');
      return;
    }

    const nextBatch = remaining.slice(0, 30).map((c) => c.email.toLowerCase());
    setDripBatchNumber((b) => b + 1);
    setDripStatusNotice(`Dispatching Next Batch (${nextBatch.length} candidates)...`);

    const res = await runDispatch(nextBatch);
    if (res.success) {
      const stillRemaining = augmentedCandidates.filter(
        (c) => !c.isScheduled && !nextBatch.includes(c.email.toLowerCase())
      );
      if (stillRemaining.length === 0) {
        setIsDripActive(false);
        setDripStatusNotice('All candidate appointments complete!');
        showToast('🎉 All appointments successfully scheduled and invitations delivered!', 'success');
      } else {
        setDripStatusNotice(
          `Batch dispatched (${nextBatch.length} emailed). Next batch of ${Math.min(30, stillRemaining.length)} in 30 minutes.`
        );
        setDripTimerSeconds(1800);
      }
    }
  };

  const stopDripScheduler = () => {
    setIsDripActive(false);
    setIsDripPaused(false);
    setDripTimerSeconds(1800);
    setDripStatusNotice('');
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
  };

  // Timer countdown effect for Drip Automation
  useEffect(() => {
    if (!isDripActive || isDripPaused || isProcessing) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      return;
    }

    timerIntervalRef.current = setInterval(() => {
      setDripTimerSeconds((prev) => {
        if (prev <= 1) {
          // Timer expired: trigger next batch!
          triggerNextDripBatchNow();
          return 1800;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isDripActive, isDripPaused, isProcessing, augmentedCandidates]);

  if (!isOpen) return null;

  // Format seconds to mm:ss
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const isCalendarActive = isCalendarConnected || hasCalendarAccess();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/70 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-600 to-indigo-600 text-white flex items-center justify-center shadow-lg">
              <Zap className="w-5 h-5 fill-current text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100">
                  Mihora Tech Intelligent Interview Dispatcher
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
                  Starting Day 5 Oct • Old Timings (2:00 PM – 7:00 PM PKT)
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Real Google Calendar appointments, live Google Meet rooms, and customizable batching rules.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="w-9 h-9 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Google Calendar Notice Bar */}
        <div className="px-5 py-3 border-b border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/40 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            {isCalendarActive ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  Live Google Calendar Connected:
                </span>
                <span className="text-stone-600 dark:text-stone-300">
                  Official Google Calendar events & genuine Google Meet rooms (<code className="bg-stone-200 dark:bg-stone-700 px-1 rounded text-[11px]">meet.google.com/...</code>) will be created live.
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="font-semibold text-amber-700 dark:text-amber-400">
                  Google Calendar Not Connected:
                </span>
                <span className="text-stone-600 dark:text-stone-300">
                  Connect your Google account to create live Google Calendar invitations and verified Google Meet rooms.
                </span>
              </>
            )}
          </div>
          {!isCalendarActive && onConnectCalendar && (
            <button
              type="button"
              onClick={onConnectCalendar}
              className="px-3 py-1.5 rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white transition-colors cursor-pointer shrink-0 shadow-xs"
            >
              Connect Google Calendar Now
            </button>
          )}
        </div>

        {/* Track Switcher Tabs */}
        <div className="px-5 pt-4 pb-2 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTrack('matti');
                handleClearSelection();
              }}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTrack === 'matti'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Track A: Matti (36 Candidates)</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/20">
                CC: m.mattiulhasnain@gmail.com
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTrack('omema');
                handleClearSelection();
              }}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTrack === 'omema'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Track B: Omema (35 Candidates)</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/20">
                Interviewer: mihora.tech@gmail.com
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-stone-500">Starting Date:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={isProcessing || isDripActive}
              className="px-2.5 py-1 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 font-bold text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Mode Selector & Action Header */}
        <div className="p-4 bg-stone-50/70 dark:bg-stone-800/30 border-b border-stone-100 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Dispatch Mode Tabs */}
          <div className="flex items-center gap-1.5 bg-stone-200/70 dark:bg-stone-800 p-1 rounded-2xl w-fit">
            <button
              type="button"
              onClick={() => setDispatchMode('selection')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                dispatchMode === 'selection'
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              Custom Pick / Instant Email
            </button>
            <button
              type="button"
              onClick={() => setDispatchMode('drip')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                dispatchMode === 'drip'
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>30-Min Drip Rule (30 Emails / 30 Mins)</span>
            </button>
          </div>

          {/* Action Trigger Buttons based on mode */}
          <div className="flex items-center gap-2">
            {dispatchMode === 'selection' ? (
              <>
                <button
                  type="button"
                  disabled={isProcessing || selectedEmails.size === 0}
                  onClick={handleDispatchSelected}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Send Instant Invitations ({selectedEmails.size})</span>
                </button>
                <button
                  type="button"
                  disabled={isProcessing || pendingCount === 0}
                  onClick={handleDispatchAllTrack}
                  className="px-3.5 py-2 rounded-xl bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-200 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                  title="Dispatch all remaining unscheduled candidates for this track"
                >
                  Dispatch All Pending ({pendingCount})
                </button>
              </>
            ) : (
              /* Drip Automation Controls */
              <div className="flex items-center gap-2">
                {!isDripActive ? (
                  <button
                    type="button"
                    disabled={isProcessing || pendingCount === 0}
                    onClick={startDripScheduler}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Start 30-Min Drip Automation</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => setIsDripPaused(!isDripPaused)}
                      className="px-3 py-1.5 rounded-xl bg-amber-100 text-amber-900 font-bold text-xs flex items-center gap-1.5 cursor-pointer hover:bg-amber-200"
                    >
                      {isDripPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                      <span>{isDripPaused ? 'Resume' : 'Pause'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing || pendingCount === 0}
                      onClick={triggerNextDripBatchNow}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer hover:bg-indigo-700"
                      title="Dispatch the next batch immediately without waiting for the timer"
                    >
                      <FastForward className="w-3 h-3" />
                      <span>Dispatch Next Batch Now</span>
                    </button>
                    <button
                      type="button"
                      onClick={stopDripScheduler}
                      className="px-3 py-1.5 rounded-xl bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer hover:bg-rose-200"
                    >
                      <span>Stop Drip</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Drip Automation Active Banner */}
        {isDripActive && (
          <div className="px-5 py-3 bg-amber-500/10 border-b border-amber-500/20 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center font-mono font-bold text-xs animate-pulse">
                {formatTimer(dripTimerSeconds)}
              </div>
              <div>
                <span className="font-bold text-amber-950 dark:text-amber-200">
                  Drip Automation Active (Batch #{dripBatchNumber})
                </span>
                <p className="text-[11px] text-amber-800 dark:text-amber-300">
                  {dripStatusNotice || `Dispatches 30 emails every 30 minutes until all ${augmentedCandidates.length} appointments are completed.`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-stone-500">
                Pending Remaining: <strong className="text-amber-600">{pendingCount}</strong>
              </span>
            </div>
          </div>
        )}

        {/* Processing State Indicator */}
        {isProcessing && (
          <div className="px-5 py-3 bg-indigo-50 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900 flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600 shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-bold text-indigo-900 dark:text-indigo-200">Dispatching in progress...</p>
              <p className="text-[11px] text-indigo-700 dark:text-indigo-300 mt-0.5">{progressText}</p>
            </div>
          </div>
        )}

        {/* List Controls: Search & Tabs */}
        <div className="px-5 py-3 border-b border-stone-100 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-stone-900">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterTab('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterTab === 'pending'
                  ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
            >
              <Clock className="w-3 h-3 text-amber-600" />
              <span>Pending Invitation ({pendingCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('scheduled')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterTab === 'scheduled'
                  ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Scheduled & Emailed ({scheduledCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterTab === 'all'
                  ? 'bg-stone-200 dark:bg-stone-700 text-stone-900 dark:text-stone-100'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
            >
              <span>All ({augmentedCandidates.length})</span>
            </button>
          </div>

          {/* Quick Select & Search */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Search candidates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500 w-44"
              />
            </div>

            <div className="flex items-center gap-1 border-l border-stone-200 dark:border-stone-700 pl-2">
              <button
                type="button"
                onClick={handleSelectFirst30Pending}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300 transition-colors cursor-pointer"
                title="Select first 30 pending candidates"
              >
                Select First 30
              </button>
              <button
                type="button"
                onClick={handleSelectAllPending}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300 transition-colors cursor-pointer"
              >
                Select All Pending
              </button>
              {selectedEmails.size > 0 && (
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="px-2 py-1 rounded-lg text-[11px] font-semibold text-stone-400 hover:text-stone-600 transition-colors cursor-pointer"
                >
                  Clear ({selectedEmails.size})
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Candidate List Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredCandidates.length === 0 ? (
            <div className="text-center py-12 text-stone-400 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto opacity-70" />
              <p className="text-sm font-semibold">No candidates match this filter.</p>
              {filterTab === 'pending' && (
                <p className="text-xs text-stone-500">
                  All candidates in this track are already scheduled and received their invitations!
                </p>
              )}
            </div>
          ) : (
            filteredCandidates.map((c) => {
              const isSelected = selectedEmails.has(c.email.toLowerCase());
              return (
                <div
                  key={c.email}
                  onClick={() => !isProcessing && handleToggleSelectCandidate(c.email)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-amber-50/80 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800'
                      : c.isScheduled
                      ? 'bg-emerald-50/30 dark:bg-emerald-950/10 border-stone-200 dark:border-stone-800 opacity-90'
                      : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-amber-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleSelectCandidate(c.email);
                      }}
                      className="text-stone-400 hover:text-amber-600 transition-colors cursor-pointer shrink-0"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-amber-600" />
                      ) : (
                        <Square className="w-4 h-4 text-stone-300 dark:text-stone-600" />
                      )}
                    </button>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-stone-900 dark:text-stone-100">
                          {c.name}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                          Slot #{c.canonicalIndex + 1}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
                        <span className="font-medium text-stone-700 dark:text-stone-300">{c.role}</span>
                        <span>•</span>
                        <span>{c.email}</span>
                        {c.location && (
                          <>
                            <span>•</span>
                            <span>{c.location}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1 justify-end">
                        <Calendar className="w-3.5 h-3.5 text-amber-600" />
                        <span>{formatPktDateTime(c.suggestedPktTime)}</span>
                      </div>
                      <div className="text-[11px] text-stone-500 mt-0.5">
                        Duration: 30 mins
                      </div>
                    </div>

                    {c.isScheduled ? (
                      <div className="flex flex-col items-end gap-1">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Scheduled & Emailed</span>
                        </span>
                        {c.meetLink && (
                          <a
                            href={c.meetLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 underline"
                          >
                            <Video className="w-3 h-3" />
                            <span>Join Meet</span>
                          </a>
                        )}
                      </div>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Pending Invitation</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-50 dark:bg-stone-800/80 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs text-stone-500">
          <div className="flex items-center gap-3">
            <span>
              Selected: <strong>{selectedEmails.size}</strong> candidate(s)
            </span>
            <span>•</span>
            <span>
              Unsent Pending: <strong>{pendingCount}</strong>
            </span>
            <span>•</span>
            <span>
              Already Emailed: <strong>{scheduledCount}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 font-bold rounded-xl bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200 hover:bg-stone-300 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
