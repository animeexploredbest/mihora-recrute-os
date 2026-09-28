import React, { useState } from 'react';
import {
  InterviewerProfile,
  QuotaAllocationStrategy,
  CandidateAssignmentPreview,
  QuotaAllocationResult,
} from '../lib/interviewer-workload';
import {
  Users,
  Sparkles,
  Scale,
  Target,
  Sliders,
  Award,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Shield,
  Clock,
  Radio,
  RefreshCw,
  Info,
  Check,
} from 'lucide-react';
import { useTheme } from '../lib/theme';

interface InterviewerQuotaManagerProps {
  candidates: {
    id: string;
    name: string;
    position: string;
    location?: string;
    timezone?: string;
    notes?: string;
  }[];
  allocationResult: QuotaAllocationResult;
  currentStrategy: QuotaAllocationStrategy;
  onStrategyChange: (strategy: QuotaAllocationStrategy) => void;
  onQuotaChange: (email: string, newQuota: number) => void;
  onToggleInterviewer: (email: string, enabled: boolean) => void;
  onCandidateOverride: (candidateId: string, interviewerEmail: string) => void;
  onAddInterviewer: (newProfile: {
    name: string;
    email: string;
    role: string;
    seniority: 'Lead' | 'Senior' | 'Mid' | 'HR';
    skills: string[];
    dailyMaxCapacity: number;
    batchTargetQuota: number;
  }) => void;
  onRemoveInterviewer?: (email: string) => void;
}

export const InterviewerQuotaManager: React.FC<InterviewerQuotaManagerProps> = ({
  candidates,
  allocationResult,
  currentStrategy,
  onStrategyChange,
  onQuotaChange,
  onToggleInterviewer,
  onCandidateOverride,
  onAddInterviewer,
  onRemoveInterviewer,
}) => {
  const { colors } = useTheme();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCandidatesPreview, setShowCandidatesPreview] = useState(true);

  // New Interviewer Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('Senior Technical Interviewer');
  const [newSeniority, setNewSeniority] = useState<'Lead' | 'Senior' | 'Mid' | 'HR'>('Senior');
  const [newSkills, setNewSkills] = useState('React, TypeScript, System Design');
  const [newDailyCap, setNewDailyCap] = useState(4);
  const [newBatchQuota, setNewBatchQuota] = useState(2);

  const handleCreateInterviewer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newEmail.includes('@')) return;

    const skillsArray = newSkills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    onAddInterviewer({
      name: newName.trim(),
      email: newEmail.trim().toLowerCase(),
      role: newRole.trim(),
      seniority: newSeniority,
      skills: skillsArray.length > 0 ? skillsArray : ['General Interviewing'],
      dailyMaxCapacity: Number(newDailyCap) || 4,
      batchTargetQuota: Number(newBatchQuota) || 2,
    });

    setNewName('');
    setNewEmail('');
    setShowAddForm(false);
  };

  const getSeniorityBadge = (seniority: InterviewerProfile['seniority']) => {
    switch (seniority) {
      case 'Lead':
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';
      case 'Senior':
        return 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30';
      case 'HR':
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
      default:
        return 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30';
    }
  };

  const totalAssigned = allocationResult.totalAssigned;
  const totalCandidates = candidates.length;
  const isPerfectFit = totalAssigned === totalCandidates && totalCandidates > 0;

  return (
    <div className="space-y-4">
      {/* Top Banner: Workload Overview & Strategy Selector */}
      <div className="p-4 sm:p-5 rounded-2xl bg-linear-to-r from-amber-500/10 via-purple-500/5 to-emerald-500/5 border border-amber-500/20 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                  AI Interviewer Allocation &amp; Quota Engine
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  100% Live DB Sync
                </span>
              </div>
              <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                Automatically calculates exactly which user should get how many interviews based on real-time pipeline workload, seniority &amp; skills.
              </p>
            </div>
          </div>

          {/* Allocation Progress Pill */}
          <div className="flex items-center gap-2 bg-white/80 dark:bg-stone-800/80 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs">
            <span className="text-stone-500 dark:text-stone-400 font-medium">Batch Assignment:</span>
            <span
              className={`font-bold ${
                isPerfectFit
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : totalAssigned < totalCandidates
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-purple-600 dark:text-purple-400'
              }`}
            >
              {totalAssigned} / {totalCandidates} Candidates
            </span>
            {isPerfectFit && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
          </div>
        </div>

        {/* Strategy Selector Buttons */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2">
            Select Allocation Strategy (Kis Hisaab Se Assign Karein):
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              {
                id: 'workload_aware' as const,
                label: 'Workload Aware',
                sublabel: 'Balances Live DB Load',
                icon: Scale,
                badge: 'Recommended',
              },
              {
                id: 'balanced' as const,
                label: 'Equal Split',
                sublabel: 'Even distribution',
                icon: Radio,
              },
              {
                id: 'skill_match' as const,
                label: 'Skill & Role Match',
                sublabel: 'Matches by expertise',
                icon: Target,
              },
              {
                id: 'seniority_weighted' as const,
                label: 'Seniority Weighted',
                sublabel: 'Leads take higher %',
                icon: Award,
              },
              {
                id: 'custom' as const,
                label: 'Custom Quotas',
                sublabel: 'Manual per-user caps',
                icon: Sliders,
              },
            ].map((strat) => {
              const Icon = strat.icon;
              const isSelected = currentStrategy === strat.id;
              return (
                <button
                  key={strat.id}
                  type="button"
                  onClick={() => onStrategyChange(strat.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500/50 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/20'
                      : 'bg-white dark:bg-stone-800/80 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:border-amber-400/50'
                  }`}
                >
                  {strat.badge && (
                    <span className="absolute -top-1.5 -right-1 px-1.5 py-0.2 rounded-full text-[8px] font-extrabold uppercase bg-amber-500 text-white shadow-xs">
                      {strat.badge}
                    </span>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-600 dark:text-amber-400' : 'text-stone-400'}`} />
                    <span className="text-xs font-bold leading-tight">{strat.label}</span>
                  </div>
                  <span className="text-[10px] text-stone-500 dark:text-stone-400 mt-1 block">
                    {strat.sublabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Warnings or notices */}
        {allocationResult.warnings.length > 0 && (
          <div className="space-y-1 pt-1">
            {allocationResult.warnings.map((warn, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800"
              >
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                <span>{warn}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Interviewer Quota Cards Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
              Team Interviewers &amp; Quota Limits ({allocationResult.interviewers.length})
            </h4>
            <span className="text-[11px] text-stone-500 dark:text-stone-400">
              • Quotas update automatically with chosen strategy
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-800 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            {showAddForm ? 'Cancel' : 'Add Team Member'}
          </button>
        </div>

        {/* Add Team Member Inline Form */}
        {showAddForm && (
          <form
            onSubmit={handleCreateInterviewer}
            className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 space-y-3 animate-in fade-in"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-amber-500" />
                Register New Interviewer / User
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Asad Farooq"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full mt-1 text-xs px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/30"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. asad@company.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full mt-1 text-xs px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/30"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase">Role / Specialty</label>
                <input
                  type="text"
                  placeholder="e.g. Backend Lead, System Architect"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full mt-1 text-xs px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/30"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase">Seniority Level</label>
                <select
                  value={newSeniority}
                  onChange={(e) => setNewSeniority(e.target.value as any)}
                  className="w-full mt-1 text-xs px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                >
                  <option value="Lead">Lead / Principal (Weight: 4)</option>
                  <option value="Senior">Senior Interviewer (Weight: 3)</option>
                  <option value="Mid">Mid Engineer (Weight: 2)</option>
                  <option value="HR">HR &amp; Culture (Weight: 3)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase">Daily Max Cap</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={newDailyCap}
                  onChange={(e) => setNewDailyCap(parseInt(e.target.value, 10))}
                  className="w-full mt-1 text-xs px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase">Batch Target</label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={newBatchQuota}
                  onChange={(e) => setNewBatchQuota(parseInt(e.target.value, 10))}
                  className="w-full mt-1 text-xs px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  Save Interviewer
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Cards for each Interviewer */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {allocationResult.interviewers.map((interviewer) => {
            const email = interviewer.email.toLowerCase().trim();
            const isEnabled = interviewer.enabled;
            const assignedCount = interviewer.assignedCountForBatch;
            const targetQuota = interviewer.batchTargetQuota;
            const liveActive = interviewer.liveActiveInterviews;
            const liveToday = interviewer.liveTodayInterviews;

            return (
              <div
                key={interviewer.id || interviewer.email}
                className={`p-3.5 rounded-2xl border transition-all ${
                  isEnabled
                    ? 'bg-white dark:bg-stone-800/90 border-stone-200 dark:border-stone-700 shadow-xs'
                    : 'bg-stone-100 dark:bg-stone-900/60 border-stone-200 dark:border-stone-800 opacity-60'
                }`}
              >
                {/* Header: Avatar, Name, Toggle */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs bg-linear-to-tr ${
                        interviewer.avatarGradient || 'from-amber-500 to-orange-600 text-white'
                      } shadow-xs`}
                    >
                      {interviewer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate max-w-[140px]">
                          {interviewer.name}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded-md text-[9px] font-bold uppercase border ${getSeniorityBadge(
                            interviewer.seniority
                          )}`}
                        >
                          {interviewer.seniority}
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-500 dark:text-stone-400 block truncate max-w-[170px]" title={interviewer.email}>
                        {interviewer.email}
                      </span>
                    </div>
                  </div>

                  {/* Enable/Disable Toggle */}
                  <label className="relative inline-flex items-center cursor-pointer shrink-0" title="Toggle active status for this batch">
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={(e) => onToggleInterviewer(email, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-stone-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                {/* Role and skills preview */}
                <div className="mt-2 text-[10px] text-stone-600 dark:text-stone-400">
                  <span className="font-semibold text-stone-700 dark:text-stone-300">{interviewer.role}</span>
                </div>

                {/* Live Database Metrics Pill */}
                <div className="mt-2.5 pt-2 border-t border-stone-100 dark:border-stone-700/60 flex items-center justify-between text-[10px]">
                  <span className="text-stone-500 dark:text-stone-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-stone-400" />
                    Live in DB:
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="bg-stone-100 dark:bg-stone-700/70 px-1.5 py-0.5 rounded text-[10px] font-semibold text-stone-700 dark:text-stone-300" title="Active scheduled interviews currently in DB">
                      {liveActive} Active
                    </span>
                    <span className="bg-amber-500/10 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded text-[10px] font-semibold" title="Scheduled today">
                      {liveToday} Today
                    </span>
                  </div>
                </div>

                {/* Batch Assignment Quota Controls */}
                <div className="mt-2.5 p-2 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-700/60 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-stone-700 dark:text-stone-300">
                      Batch Target Quota:
                    </span>
                    <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                      {assignedCount} Assigned
                    </span>
                  </div>

                  {/* Stepper with +/- and presets */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={!isEnabled || targetQuota <= 0}
                        onClick={() => onQuotaChange(email, Math.max(0, targetQuota - 1))}
                        className="w-6 h-6 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 font-bold text-xs flex items-center justify-center hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors disabled:opacity-40 cursor-pointer"
                        title="Reduce quota by 1"
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-xs font-bold text-stone-800 dark:text-stone-200">
                        {targetQuota}
                      </span>
                      <button
                        type="button"
                        disabled={!isEnabled}
                        onClick={() => onQuotaChange(email, targetQuota + 1)}
                        className="w-6 h-6 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 font-bold text-xs flex items-center justify-center hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors disabled:opacity-40 cursor-pointer"
                        title="Increase quota by 1"
                      >
                        +
                      </button>
                    </div>

                    {/* Quick Presets */}
                    <div className="flex items-center gap-1">
                      {[1, 2, 4].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          disabled={!isEnabled}
                          onClick={() => onQuotaChange(email, preset)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-all cursor-pointer ${
                            targetQuota === preset
                              ? 'bg-amber-500 text-white border-amber-600'
                              : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quota Fill Visual Bar */}
                  <div className="w-full bg-stone-200 dark:bg-stone-700 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        assignedCount > interviewer.dailyMaxCapacity
                          ? 'bg-rose-500'
                          : 'bg-linear-to-r from-amber-500 to-emerald-500'
                      }`}
                      style={{
                        width: `${Math.min(100, targetQuota > 0 ? (assignedCount / targetQuota) * 100 : 0)}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Candidate-Level Allocation Table with Interactive Overrides */}
      {candidates.length > 0 && (
        <div className="mt-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden shadow-xs">
          <div
            onClick={() => setShowCandidatesPreview(!showCandidatesPreview)}
            className="p-3.5 bg-stone-50 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between cursor-pointer hover:bg-stone-100/70 dark:hover:bg-stone-800/90 transition-colors"
          >
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                Candidate-to-Interviewer Mapping Preview ({candidates.length} candidates)
              </span>
              <span className="text-[10px] text-stone-500 dark:text-stone-400">
                (Click to toggle detailed breakdown)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                {showCandidatesPreview ? 'Hide Mapping' : 'Show Mapping'}
              </span>
              {showCandidatesPreview ? (
                <ChevronUp className="w-4 h-4 text-stone-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-stone-400" />
              )}
            </div>
          </div>

          {showCandidatesPreview && (
            <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-stone-200 dark:border-stone-800 bg-stone-100/60 dark:bg-stone-800/40 text-[10px] uppercase font-bold text-stone-500">
                    <th className="py-2.5 px-3">Candidate</th>
                    <th className="py-2.5 px-3">Position</th>
                    <th className="py-2.5 px-3">Location / Tz</th>
                    <th className="py-2.5 px-3">Assigned Interviewer</th>
                    <th className="py-2.5 px-3">Match Reason &amp; AI Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {candidates.map((cand) => {
                    const assign = allocationResult.assignments[cand.id];
                    return (
                      <tr
                        key={cand.id}
                        className="hover:bg-amber-500/5 transition-colors text-stone-800 dark:text-stone-200"
                      >
                        <td className="py-2 px-3 font-semibold">
                          <span>{cand.name}</span>
                        </td>
                        <td className="py-2 px-3 text-stone-600 dark:text-stone-400 truncate max-w-[150px]">
                          {cand.position || 'Software Engineer'}
                        </td>
                        <td className="py-2 px-3 text-stone-500 dark:text-stone-400 text-[11px]">
                          {cand.location || 'Remote'} {cand.timezone ? `(${cand.timezone.split('/').pop()})` : ''}
                        </td>
                        <td className="py-2 px-3">
                          {/* Dropdown to manually reassign if recruiter wants to override */}
                          <select
                            value={assign?.assignedInterviewerEmail || ''}
                            onChange={(e) => onCandidateOverride(cand.id, e.target.value)}
                            className="text-xs px-2 py-1 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 font-medium text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500/20"
                          >
                            {allocationResult.interviewers
                              .filter((i) => i.enabled)
                              .map((i) => (
                                <option key={i.email} value={i.email}>
                                  {i.name} ({i.role.split(' ')[0]})
                                </option>
                              ))}
                          </select>
                        </td>
                        <td className="py-2 px-3 text-[11px]">
                          {assign ? (
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 shrink-0">
                                {assign.matchScore}% Match
                              </span>
                              <span className="text-stone-500 dark:text-stone-400 truncate max-w-[200px]" title={assign.matchReason}>
                                {assign.matchReason}
                              </span>
                            </div>
                          ) : (
                            <span className="text-amber-600">Pending Assignment</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
