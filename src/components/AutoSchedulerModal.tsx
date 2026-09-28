import React, { useState, useMemo } from 'react';
import { Candidate, InterviewTrack } from '../types';
import { useTheme } from '../lib/theme';
import {
  X,
  Zap,
  Calendar,
  Clock,
  Users,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  Check,
  Globe,
  Sliders,
  Play,
  Loader2,
  Trash2,
  Video,
  ShieldCheck,
  ChevronRight,
  Sun,
  Moon,
  Info,
} from 'lucide-react';
import {
  AutoSchedulerConfig,
  ScheduledSlotAllocation,
  AutoSchedulerResult,
  runAutoScheduler,
  commitAutoScheduleBatch,
} from '../lib/auto-scheduler';
import { DEFAULT_INTERVIEW_TRACKS, getTrackById } from '../lib/track-constants';
import { formatPktDateTime } from '../lib/date-utils';

interface AutoSchedulerModalProps {
  isOpen: boolean;
  onClose: () => void;
  allCandidates: Candidate[];
  selectedCandidateIds?: string[];
  onBatchScheduled?: (count: number) => void;
  onViewInCalendar?: () => void;
  currentUserName?: string;
}

export const AutoSchedulerModal: React.FC<AutoSchedulerModalProps> = ({
  isOpen,
  onClose,
  allCandidates,
  selectedCandidateIds = [],
  onBatchScheduled,
  onViewInCalendar,
  currentUserName,
}) => {
  const { colors } = useTheme();

  // Step 1: Configuration, Step 2: Simulation Preview, Step 3: Execution Complete
  const [step, setStep] = useState<'configure' | 'preview' | 'executing' | 'done'>('configure');

  // Candidate scope
  const [candidateScope, setCandidateScope] = useState<'pending' | 'selected' | 'all'>(() => {
    return selectedCandidateIds.length > 0 ? 'selected' : 'pending';
  });

  // Calculate default start date (tomorrow in YYYY-MM-DD)
  const defaultDates = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const end = new Date(tomorrow);
    end.setDate(end.getDate() + 4); // 5 days window

    const pad = (n: number) => String(n).padStart(2, '0');
    const startStr = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;
    const endStr = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`;
    return { startStr, endStr };
  }, []);

  // Configuration state
  const [startDate, setStartDate] = useState<string>(defaultDates.startStr);
  const [endDate, setEndDate] = useState<string>(defaultDates.endStr);
  const [dailyStartTimePkt, setDailyStartTimePkt] = useState<string>('11:00');
  const [dailyEndTimePkt, setDailyEndTimePkt] = useState<string>('21:00');
  const [durationMinutes, setDurationMinutes] = useState<number>(45);
  const [bufferMinutes, setBufferMinutes] = useState<number>(15);
  const [maxConcurrent, setMaxConcurrent] = useState<number>(3);
  const [excludeWeekends, setExcludeWeekends] = useState<boolean>(true);
  const [respectWakingHours, setRespectWakingHours] = useState<boolean>(true);
  const [selectedTracks, setSelectedTracks] = useState<string[]>([
    'track-alpha',
    'track-beta',
    'track-gamma',
  ]);

  // Interviewers state
  const [interviewers, setInterviewers] = useState<string[]>([
    'm.mattiulhasnain@gmail.com',
    'mihora.tech@gmail.com',
  ]);
  const [newInterviewerInput, setNewInterviewerInput] = useState<string>('');

  // Simulation result
  const [simResult, setSimResult] = useState<AutoSchedulerResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionProgress, setExecutionProgress] = useState<number>(0);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [scheduledCount, setScheduledCount] = useState<number>(0);

  // Filter pool candidates
  const targetCandidates = useMemo(() => {
    if (candidateScope === 'selected' && selectedCandidateIds.length > 0) {
      return allCandidates.filter((c) => c.id && selectedCandidateIds.includes(c.id));
    }
    if (candidateScope === 'pending') {
      return allCandidates.filter(
        (c) => c.status !== 'Rejected' && (!c.suggestedPktTime || c.status === 'Pending')
      );
    }
    return allCandidates.filter((c) => c.status !== 'Rejected');
  }, [allCandidates, candidateScope, selectedCandidateIds]);

  if (!isOpen) return null;

  const handleAddInterviewer = () => {
    const clean = newInterviewerInput.trim().toLowerCase();
    if (clean && clean.includes('@') && !interviewers.includes(clean)) {
      setInterviewers((prev) => [...prev, clean]);
      setNewInterviewerInput('');
    }
  };

  const handleRemoveInterviewer = (email: string) => {
    if (interviewers.length > 1) {
      setInterviewers((prev) => prev.filter((e) => e !== email));
    }
  };

  const toggleTrack = (trackId: string) => {
    setSelectedTracks((prev) => {
      if (prev.includes(trackId)) {
        if (prev.length === 1) return prev; // keep at least 1
        return prev.filter((id) => id !== trackId);
      }
      return [...prev, trackId];
    });
  };

  // Run simulation preview
  const handleRunSimulation = () => {
    if (targetCandidates.length === 0) return;
    setIsSimulating(true);

    const config: AutoSchedulerConfig = {
      startDate,
      endDate,
      dailyStartTimePkt,
      dailyEndTimePkt,
      durationMinutes,
      bufferMinutes,
      allowedTrackIds: selectedTracks,
      maxConcurrentPerSlot: maxConcurrent,
      interviewers,
      maxInterviewsPerDayPerInterviewer: 4,
      respectCandidateWakingHours: respectWakingHours,
      excludeWeekends,
      autoStatus: 'Scheduled',
    };

    // Keep non-target candidates as already-existing to prevent conflicts
    const otherCandidates = allCandidates.filter(
      (c) => !targetCandidates.some((tc) => tc.id === c.id)
    );

    setTimeout(() => {
      const result = runAutoScheduler(targetCandidates, otherCandidates, config);
      setSimResult(result);
      setIsSimulating(false);
      setStep('preview');
    }, 250);
  };

  // Execute batch commit
  const handleCommitSchedule = async () => {
    if (!simResult || simResult.allocations.length === 0) return;
    setIsExecuting(true);
    setExecutionError(null);
    setExecutionProgress(20);

    try {
      setExecutionProgress(50);
      const res = await commitAutoScheduleBatch(simResult.allocations, allCandidates, {
        currentUserName,
      });

      setExecutionProgress(100);
      if (res.success) {
        setScheduledCount(res.count);
        setStep('done');
        if (onBatchScheduled) {
          onBatchScheduled(res.count);
        }
      } else {
        setExecutionError(res.error || 'Failed to complete batch schedule');
      }
    } catch (err: any) {
      console.error(err);
      setExecutionError(err?.message || 'Database sync error occurred');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-stone-200 dark:border-stone-800 bg-amber-50/60 dark:bg-amber-950/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-600/20 font-bold">
              <Zap className="w-6 h-6 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold font-display text-stone-900 dark:text-stone-100">
                  Automated Bulk Scheduler
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                  AI Conflict-Free Matrix
                </span>
              </div>
              <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                Automatically allocate multi-track calendar slots, balance interviewer panels, and protect candidate timezones.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          
          {/* STEP 1: CONFIGURE RULES */}
          {step === 'configure' && (
            <div className="space-y-6">
              
              {/* 1. Candidate Selection Pool */}
              <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-amber-600" />
                    Target Candidate Pool
                  </label>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400">
                    {targetCandidates.length} candidate{targetCandidates.length !== 1 ? 's' : ''} queued
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setCandidateScope('pending')}
                    className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                      candidateScope === 'pending'
                        ? 'bg-white dark:bg-stone-800 border-amber-500 shadow-sm ring-2 ring-amber-400/20'
                        : 'bg-white/60 dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:bg-white'
                    }`}
                  >
                    <div className="font-bold text-xs text-stone-900 dark:text-stone-100">
                      Unscheduled / Pending
                    </div>
                    <div className="text-[11px] text-stone-500 mt-0.5">
                      {allCandidates.filter((c) => c.status !== 'Rejected' && (!c.suggestedPktTime || c.status === 'Pending')).length} candidates awaiting slots
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCandidateScope('selected')}
                    disabled={selectedCandidateIds.length === 0}
                    className={`p-3 rounded-xl text-left border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                      candidateScope === 'selected'
                        ? 'bg-white dark:bg-stone-800 border-amber-500 shadow-sm ring-2 ring-amber-400/20'
                        : 'bg-white/60 dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:bg-white'
                    }`}
                  >
                    <div className="font-bold text-xs text-stone-900 dark:text-stone-100">
                      Selected Candidates ({selectedCandidateIds.length})
                    </div>
                    <div className="text-[11px] text-stone-500 mt-0.5">
                      Shortlist checked in directory
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCandidateScope('all')}
                    className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                      candidateScope === 'all'
                        ? 'bg-white dark:bg-stone-800 border-amber-500 shadow-sm ring-2 ring-amber-400/20'
                        : 'bg-white/60 dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:bg-white'
                    }`}
                  >
                    <div className="font-bold text-xs text-stone-900 dark:text-stone-100">
                      All Active Candidates
                    </div>
                    <div className="text-[11px] text-stone-500 mt-0.5">
                      {allCandidates.filter((c) => c.status !== 'Rejected').length} active pipeline records
                    </div>
                  </button>
                </div>
              </div>

              {/* 2. Date Range & Daily PKT Hours Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Date Window */}
                <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-amber-600" />
                    Interview Date Window (PKT)
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[11px] text-stone-500 font-medium">Start Date</span>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full mt-1 px-3 py-2 text-xs font-semibold rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-stone-500 font-medium">End Date</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full mt-1 px-3 py-2 text-xs font-semibold rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={excludeWeekends}
                      onChange={(e) => setExcludeWeekends(e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded-sm border-stone-300 focus:ring-amber-500 cursor-pointer"
                    />
                    <span className="text-xs text-stone-700 dark:text-stone-300 font-medium">
                      Exclude Saturdays & Sundays
                    </span>
                  </label>
                </div>

                {/* Daily Operating Hours in PKT */}
                <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-600" />
                    Daily Operating Hours (PKT / UTC+5)
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[11px] text-stone-500 font-medium">Earliest Start</span>
                      <input
                        type="time"
                        value={dailyStartTimePkt}
                        onChange={(e) => setDailyStartTimePkt(e.target.value)}
                        className="w-full mt-1 px-3 py-2 text-xs font-semibold rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-stone-500 font-medium">Latest End</span>
                      <input
                        type="time"
                        value={dailyEndTimePkt}
                        onChange={(e) => setDailyEndTimePkt(e.target.value)}
                        className="w-full mt-1 px-3 py-2 text-xs font-semibold rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 text-[11px] text-stone-500">
                    <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>RecruitSync automatically aligns times with international timezones.</span>
                  </div>
                </div>
              </div>

              {/* 3. Slot Duration, Buffer & Multi-Track Capacity */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Duration */}
                <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 space-y-2">
                  <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                    Interview Duration
                  </span>
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    {[30, 45, 60].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setDurationMinutes(mins)}
                        className={`py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                          durationMinutes === mins
                            ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                            : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-300 dark:border-stone-700'
                        }`}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                </div>

                {/* Buffer */}
                <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 space-y-2">
                  <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                    Break Between Slots
                  </span>
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    {[0, 10, 15].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setBufferMinutes(mins)}
                        className={`py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                          bufferMinutes === mins
                            ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                            : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-300 dark:border-stone-700'
                        }`}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                </div>

                {/* Parallel Capacity */}
                <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 space-y-2">
                  <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                    Parallel Tracks Capacity
                  </span>
                  <div className="grid grid-cols-4 gap-1 pt-1">
                    {[1, 2, 3, 4].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setMaxConcurrent(c)}
                        className={`py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                          maxConcurrent === c
                            ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                            : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-300 dark:border-stone-700'
                        }`}
                      >
                        {c}×
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 4. Active Tracks & Interviewer Pool */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Virtual Room Tracks */}
                <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-amber-600" />
                    Available Virtual Room Tracks
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {DEFAULT_INTERVIEW_TRACKS.slice(0, 4).map((track) => {
                      const isSelected = selectedTracks.includes(track.id);
                      return (
                        <button
                          key={track.id}
                          type="button"
                          onClick={() => toggleTrack(track.id)}
                          className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-white dark:bg-stone-800 border-amber-500 shadow-xs text-stone-900 dark:text-stone-100'
                              : 'bg-stone-100 dark:bg-stone-900/50 border-stone-200 dark:border-stone-800 text-stone-400'
                          }`}
                        >
                          <span className="truncate">{track.shortCode || track.name}</span>
                          <span
                            className={`w-3 h-3 rounded-full shrink-0 ${
                              isSelected ? 'bg-amber-600' : 'bg-stone-300 dark:bg-stone-700'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Interviewer Panel Pool */}
                <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-amber-600" />
                    Interviewer Workload Pool ({interviewers.length})
                  </label>

                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {interviewers.map((email) => (
                      <span
                        key={email}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 shadow-2xs"
                      >
                        <span className="truncate max-w-[170px]">{email}</span>
                        {interviewers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveInterviewer(email)}
                            className="text-stone-400 hover:text-red-500 cursor-pointer"
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={newInterviewerInput}
                      onChange={(e) => setNewInterviewerInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddInterviewer())}
                      placeholder="Add interviewer email..."
                      className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddInterviewer}
                      className="px-3 py-1.5 text-xs font-bold rounded-xl bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200 hover:bg-stone-300 cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {/* 5. Timezone Safeguard */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                      Daylight Working Hours Protection
                    </h4>
                    <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-0.5">
                      Ensures candidate interviews fall strictly during comfortable waking hours (8:30 AM to 8:30 PM local time).
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={respectWakingHours}
                    onChange={(e) => setRespectWakingHours(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>

            </div>
          )}

          {/* STEP 2: SIMULATION PREVIEW MATRIX */}
          {step === 'preview' && simResult && (
            <div className="space-y-5 animate-in fade-in duration-150">
              
              {/* Summary Stats Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    Allocated Slots
                  </div>
                  <div className="text-2xl font-bold font-display text-emerald-800 dark:text-emerald-300 mt-1">
                    {simResult.stats.allocatedCount} / {simResult.stats.totalCandidates}
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                    100% Conflict-Free
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                    Days Utilized
                  </div>
                  <div className="text-2xl font-bold font-display text-blue-800 dark:text-blue-300 mt-1">
                    {simResult.stats.daysUtilized} Days
                  </div>
                  <div className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5">
                    Across timeline window
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">
                    Parallel Tracks
                  </div>
                  <div className="text-2xl font-bold font-display text-purple-800 dark:text-purple-300 mt-1">
                    {simResult.stats.tracksUtilized} Active
                  </div>
                  <div className="text-[10px] text-purple-600 dark:text-purple-400 mt-0.5">
                    Simultaneous virtual rooms
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    Timezone Match
                  </div>
                  <div className="text-2xl font-bold font-display text-amber-800 dark:text-amber-300 mt-1">
                    {simResult.stats.averageMatchScore}%
                  </div>
                  <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                    Daylight suitability score
                  </div>
                </div>
              </div>

              {/* Allocation Table */}
              <div className="border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-xs">
                <div className="p-3 bg-stone-50 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Proposed Allocation Matrix ({simResult.allocations.length})
                  </span>
                  <span className="text-[11px] text-stone-500">
                    Review candidate times before live commit
                  </span>
                </div>

                <div className="max-h-[380px] overflow-y-auto divide-y divide-stone-200 dark:divide-stone-800">
                  {simResult.allocations.map((alloc, idx) => (
                    <div
                      key={alloc.candidateId}
                      className="p-3.5 hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors flex flex-wrap items-center justify-between gap-3 text-xs"
                    >
                      {/* Candidate info */}
                      <div className="flex items-center gap-3 min-w-[200px]">
                        <span className="w-6 h-6 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold flex items-center justify-center text-[11px] shrink-0">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                            {alloc.candidateName}
                            <span className="text-stone-400 font-normal">({alloc.candidateCountry})</span>
                          </div>
                          <div className="text-[11px] text-stone-500">{alloc.candidatePosition}</div>
                        </div>
                      </div>

                      {/* Scheduled Time (PKT & Local) */}
                      <div className="min-w-[190px]">
                        <div className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>{alloc.slotPktFormatted}</span>
                        </div>
                        <div className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5">
                          <Globe className="w-3 h-3 text-stone-400" />
                          <span>{alloc.candidateLocalTimeFormatted}</span>
                          <span
                            className={`ml-1 px-1.5 py-0.2 rounded text-[9px] font-semibold ${
                              alloc.daylightQuality === 'optimal'
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                : alloc.daylightQuality === 'acceptable'
                                ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
                                : 'bg-red-500/10 text-red-700 dark:text-red-400'
                            }`}
                          >
                            {alloc.daylightLabel}
                          </span>
                        </div>
                      </div>

                      {/* Assigned Track & Interviewer */}
                      <div className="min-w-[180px]">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20">
                            {alloc.trackName}
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-500 mt-1 truncate max-w-[180px]">
                          Interviewer: <span className="font-medium text-stone-700 dark:text-stone-300">{alloc.assignedInterviewer.split('@')[0]}</span>
                        </div>
                      </div>

                      {/* Meet Link Badge */}
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          <Video className="w-3 h-3" />
                          Google Meet
                        </span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                          {alloc.matchScore}% Match
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Unallocated warnings if any */}
              {simResult.unallocated.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="text-xs">
                    <span className="font-bold text-amber-800 dark:text-amber-300">
                      {simResult.unallocated.length} candidate{simResult.unallocated.length > 1 ? 's' : ''} could not be placed:
                    </span>
                    <span className="text-amber-700 dark:text-amber-400 ml-1">
                      Expand your date range or add more parallel tracks to accommodate all candidates.
                    </span>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* STEP 3: DONE SCREEN */}
          {step === 'done' && (
            <div className="p-8 text-center space-y-4 max-w-md mx-auto animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/30">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>
              <h3 className="text-2xl font-bold font-display text-stone-900 dark:text-stone-100">
                Successfully Auto-Scheduled!
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{scheduledCount} interviews</strong> have been conflict-free scheduled across your virtual room tracks.
                Updates have been committed to Firestore and broadcast live to all tabs and databases!
              </p>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                {onViewInCalendar && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onViewInCalendar();
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>View in Calendar View</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          
          <div className="text-xs text-stone-500">
            {step === 'configure' && (
              <span>Targeting <strong>{targetCandidates.length}</strong> candidate{targetCandidates.length !== 1 ? 's' : ''} across <strong>{selectedTracks.length}</strong> tracks.</span>
            )}
            {step === 'preview' && (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                ✓ Ready for instant real-time synchronization.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step === 'preview' && (
              <button
                type="button"
                onClick={() => setStep('configure')}
                disabled={isExecuting}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Adjust Parameters</span>
              </button>
            )}

            {step !== 'done' && (
              <button
                type="button"
                onClick={onClose}
                disabled={isExecuting}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}

            {step === 'configure' && (
              <button
                type="button"
                onClick={handleRunSimulation}
                disabled={isSimulating || targetCandidates.length === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSimulating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Calculating Matrix...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-current" />
                    <span>Run AI Auto-Schedule Matrix</span>
                  </>
                )}
              </button>
            )}

            {step === 'preview' && (
              <button
                type="button"
                onClick={handleCommitSchedule}
                disabled={isExecuting || !simResult || simResult.allocations.length === 0}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Committing & Live Syncing...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Confirm & Live Sync ({simResult?.allocations.length})</span>
                  </>
                )}
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
