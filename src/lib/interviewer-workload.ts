import { Candidate } from '../types';
import { saveStaffMemberToFirestore } from './firebase-operations';

export interface InterviewerProfile {
  id: string; // unique identifier (email or uuid)
  name: string;
  email: string;
  role: string; // e.g. "Senior Full-Stack Lead", "Frontend Specialist", "Backend & Systems", "HR / Culture"
  seniority: 'Lead' | 'Senior' | 'Mid' | 'HR';
  skills: string[]; // e.g. ['React', 'TypeScript', 'Node.js', 'System Architecture', 'HR']
  avatarGradient?: string;
  enabled: boolean; // whether active for assignment
  // Live Database Workload (computed in real-time from Firestore candidate records)
  liveActiveInterviews: number; // Currently Scheduled or Rescheduled in Firestore
  liveCompletedInterviews: number; // Completed / Interviewed / Selected in Firestore
  liveTodayInterviews: number; // Scheduled for current date (UTC/PKT)
  // Quotas & Batch Settings
  dailyMaxCapacity: number; // Max interviews per day to prevent burnout (default: 4)
  batchTargetQuota: number; // Configured target interviews to assign from current batch
  weight: number; // 1 to 5 priority weight for automated distribution
  assignedCountForBatch: number; // How many are assigned in current calculation
}

export type QuotaAllocationStrategy =
  | 'workload_aware' // Auto-prioritizes interviewers with lowest active DB count
  | 'balanced' // Divides candidates evenly among enabled interviewers
  | 'skill_match' // Matches candidate position/skills to interviewer specializations
  | 'seniority_weighted' // Leads & Seniors take higher/custom proportion
  | 'custom'; // Recruiter manually enters/tweaks target numbers

export interface CandidateAssignmentPreview {
  candidateId: string;
  candidateName: string;
  candidatePosition: string;
  candidateLocation?: string;
  candidateTimezone?: string;
  assignedInterviewerEmail: string;
  assignedInterviewerName: string;
  matchReason: string;
  matchScore: number;
}

export interface QuotaAllocationResult {
  interviewers: InterviewerProfile[];
  assignments: Record<string, CandidateAssignmentPreview>; // candidateId -> assignment
  totalCandidates: number;
  totalQuotaConfigured: number;
  totalAssigned: number;
  unassignedCount: number;
  strategyUsed: QuotaAllocationStrategy;
  isOverCapacity: boolean;
  warnings: string[];
}

/**
 * Standard default team interviewers to initialize workspace with
 */
export const DEFAULT_TEAM_INTERVIEWERS: Omit<
  InterviewerProfile,
  'liveActiveInterviews' | 'liveCompletedInterviews' | 'liveTodayInterviews' | 'assignedCountForBatch'
>[] = [
  {
    id: 'm.mattiulhasnain@gmail.com',
    name: 'Matti Ul Hasnain',
    email: 'm.mattiulhasnain@gmail.com',
    role: 'Principal Engineer & Tech Lead',
    seniority: 'Lead',
    skills: ['System Design', 'Full-Stack', 'Architecture', 'Leadership', 'TypeScript', 'Node.js', 'Python'],
    avatarGradient: 'from-amber-500 to-orange-600 text-white',
    enabled: true,
    dailyMaxCapacity: 4,
    batchTargetQuota: 3,
    weight: 4,
  },
  {
    id: 'mihora.tech@gmail.com',
    name: 'Mihora Tech Panel',
    email: 'mihora.tech@gmail.com',
    role: 'Senior Technical Evaluator',
    seniority: 'Senior',
    skills: ['Frontend', 'React', 'Mobile', 'UI/UX', 'Algorithms', 'JavaScript', 'Database'],
    avatarGradient: 'from-purple-500 to-indigo-600 text-white',
    enabled: true,
    dailyMaxCapacity: 4,
    batchTargetQuota: 3,
    weight: 3,
  },
  {
    id: 'omema19022026@gmail.com',
    name: 'Omema (Admin & Talent)',
    email: 'omema19022026@gmail.com',
    role: 'Talent Acquisition & Hiring Manager',
    seniority: 'HR',
    skills: ['Screening', 'Behavioral', 'Culture Fit', 'HR', 'Management', 'Compensation'],
    avatarGradient: 'from-emerald-500 to-teal-600 text-white',
    enabled: true,
    dailyMaxCapacity: 5,
    batchTargetQuota: 2,
    weight: 3,
  },
];

const LOCAL_STORAGE_INTERVIEWERS_KEY = 'recruitsync_interviewers_config_v2';

/**
 * Loads cached custom interviewers from local storage, falling back to defaults
 */
export function loadSavedInterviewerProfiles(): Omit<
  InterviewerProfile,
  'liveActiveInterviews' | 'liveCompletedInterviews' | 'liveTodayInterviews' | 'assignedCountForBatch'
>[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_INTERVIEWERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return DEFAULT_TEAM_INTERVIEWERS;
}

/**
 * Saves interviewer configuration so custom team members persist across sessions
 */
export function saveInterviewerProfiles(profiles: InterviewerProfile[]): void {
  try {
    const toSave = profiles.map((p) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      role: p.role,
      seniority: p.seniority,
      skills: p.skills,
      avatarGradient: p.avatarGradient,
      enabled: p.enabled,
      dailyMaxCapacity: p.dailyMaxCapacity,
      batchTargetQuota: p.batchTargetQuota,
      weight: p.weight,
    }));
    localStorage.setItem(LOCAL_STORAGE_INTERVIEWERS_KEY, JSON.stringify(toSave));

    // Also persist each staff member profile into Firestore staffMembers collection
    toSave.forEach((member) => {
      saveStaffMemberToFirestore(member).catch((err) => {
        console.warn('Firestore staff save notice:', err?.message);
      });
    });
  } catch {}
}

/**
 * Computes live database workloads for each interviewer from the real-time Firestore candidates collection
 */
export function computeLiveInterviewerWorkloads(
  candidates: Candidate[],
  savedProfiles?: Omit<
    InterviewerProfile,
    'liveActiveInterviews' | 'liveCompletedInterviews' | 'liveTodayInterviews' | 'assignedCountForBatch'
  >[],
  currentAuthUser?: { email?: string | null; displayName?: string | null }
): InterviewerProfile[] {
  const baseProfiles = savedProfiles && savedProfiles.length > 0 ? savedProfiles : loadSavedInterviewerProfiles();

  // Map of email -> InterviewerProfile
  const profileMap = new Map<string, InterviewerProfile>();

  baseProfiles.forEach((p) => {
    const emailKey = p.email.toLowerCase().trim();
    profileMap.set(emailKey, {
      ...p,
      liveActiveInterviews: 0,
      liveCompletedInterviews: 0,
      liveTodayInterviews: 0,
      assignedCountForBatch: 0,
    });
  });

  // If current logged-in user is not in the list, auto-add them
  if (currentAuthUser?.email) {
    const curEmail = currentAuthUser.email.toLowerCase().trim();
    if (!profileMap.has(curEmail)) {
      profileMap.set(curEmail, {
        id: curEmail,
        name: currentAuthUser.displayName || curEmail.split('@')[0],
        email: curEmail,
        role: 'Recruiter & Hiring Lead',
        seniority: 'Lead',
        skills: ['Screening', 'Engineering', 'Culture Fit'],
        avatarGradient: 'from-blue-500 to-cyan-600 text-white',
        enabled: true,
        dailyMaxCapacity: 4,
        batchTargetQuota: 2,
        weight: 3,
        liveActiveInterviews: 0,
        liveCompletedInterviews: 0,
        liveTodayInterviews: 0,
        assignedCountForBatch: 0,
      });
    }
  }

  // Scan live candidates to tally active, today, and completed counts
  const todayStr = new Date().toISOString().split('T')[0];

  candidates.forEach((cand) => {
    if (cand.status === 'Rejected') return;

    // Check interviewer match
    const assigned = cand.assignedInterviewer?.toLowerCase().trim() || '';
    const emails = Array.isArray(cand.interviewerEmails)
      ? cand.interviewerEmails.map((e) => e.toLowerCase().trim())
      : [];
    const matchedEmails = new Set<string>();
    if (assigned) matchedEmails.add(assigned);
    emails.forEach((e) => matchedEmails.add(e));

    matchedEmails.forEach((email) => {
      if (!profileMap.has(email) && email.includes('@')) {
        // Discovered an active interviewer in DB not previously registered
        profileMap.set(email, {
          id: email,
          name: email.split('@')[0],
          email,
          role: 'Team Interviewer',
          seniority: 'Senior',
          skills: ['Technical Interviewing', 'General Assessment'],
          avatarGradient: 'from-stone-500 to-stone-700 text-white',
          enabled: true,
          dailyMaxCapacity: 4,
          batchTargetQuota: 2,
          weight: 2,
          liveActiveInterviews: 0,
          liveCompletedInterviews: 0,
          liveTodayInterviews: 0,
          assignedCountForBatch: 0,
        });
      }

      const prof = profileMap.get(email);
      if (prof) {
        if (cand.status === 'Scheduled' || cand.status === 'Rescheduled') {
          prof.liveActiveInterviews += 1;
          if (cand.suggestedPktTime && cand.suggestedPktTime.startsWith(todayStr)) {
            prof.liveTodayInterviews += 1;
          }
        } else if (cand.status === 'Interviewed' || cand.status === 'Selected') {
          prof.liveCompletedInterviews += 1;
        }
      }
    });
  });

  return Array.from(profileMap.values());
}

/**
 * Calculates candidate affinity score for an interviewer based on skills & position
 */
export function scoreCandidateInterviewerMatch(
  candidate: { position?: string; notes?: string; name?: string },
  interviewer: InterviewerProfile
): { score: number; reason: string } {
  let score = 50; // base score
  const reasons: string[] = [];

  const textToScan = `${candidate.position || ''} ${candidate.notes || ''}`.toLowerCase();

  // Check role & skill matches
  let skillMatches = 0;
  interviewer.skills.forEach((skill) => {
    const sLower = skill.toLowerCase();
    if (textToScan.includes(sLower)) {
      skillMatches++;
      reasons.push(skill);
    }
  });

  if (skillMatches > 0) {
    score += Math.min(35, skillMatches * 15);
  }

  // Position alignment
  const posLower = (candidate.position || '').toLowerCase();
  if (
    (posLower.includes('frontend') || posLower.includes('ui') || posLower.includes('react')) &&
    interviewer.role.toLowerCase().includes('frontend')
  ) {
    score += 20;
    reasons.push('Frontend specialization match');
  } else if (
    (posLower.includes('backend') || posLower.includes('api') || posLower.includes('database') || posLower.includes('system')) &&
    (interviewer.role.toLowerCase().includes('backend') || interviewer.role.toLowerCase().includes('systems') || interviewer.role.toLowerCase().includes('tech lead'))
  ) {
    score += 20;
    reasons.push('Backend/Systems architecture match');
  } else if (
    (posLower.includes('lead') || posLower.includes('manager') || posLower.includes('principal') || posLower.includes('senior')) &&
    (interviewer.seniority === 'Lead' || interviewer.seniority === 'Senior')
  ) {
    score += 15;
    reasons.push('Seniority level alignment');
  } else if (
    (posLower.includes('hr') || posLower.includes('people') || posLower.includes('talent') || posLower.includes('culture')) &&
    interviewer.seniority === 'HR'
  ) {
    score += 25;
    reasons.push('HR & People operations match');
  }

  // Workload factor: penalize interviewers with high live DB load to balance team fatigue
  if (interviewer.liveActiveInterviews > 6) {
    score -= 20;
  } else if (interviewer.liveActiveInterviews <= 2) {
    score += 10;
    reasons.push('Available bandwidth in DB');
  }

  const finalScore = Math.max(10, Math.min(100, score));
  const summaryReason =
    reasons.length > 0 ? reasons.slice(0, 3).join(', ') : `${interviewer.role} allocation`;

  return { score: finalScore, reason: summaryReason };
}

/**
 * Intelligent AI Interviewer Quota Allocation Engine
 * Solves: "kis user ko kitny interviews assign krny chye"
 * Takes into account:
 *  - Live database workload of each interviewer
 *  - Daily fatigue limits (dailyMaxCapacity)
 *  - Chosen distribution strategy (Workload-aware, Balanced, Skill-match, Seniority-weighted, or Custom)
 *  - Specific candidate-level overrides
 */
export function calculateSmartInterviewAssignments(params: {
  candidates: { id: string; name: string; position: string; location?: string; timezone?: string; notes?: string }[];
  interviewers: InterviewerProfile[];
  strategy: QuotaAllocationStrategy;
  manualQuotas?: Record<string, number>;
  candidateOverrides?: Record<string, string>; // candidateId -> interviewerEmail
}): QuotaAllocationResult {
  const { candidates, interviewers, strategy, manualQuotas = {}, candidateOverrides = {} } = params;

  const totalCandidates = candidates.length;
  const enabledInterviewers = interviewers.filter((i) => i.enabled);
  const warnings: string[] = [];

  if (enabledInterviewers.length === 0) {
    return {
      interviewers: interviewers.map((i) => ({ ...i, assignedCountForBatch: 0 })),
      assignments: {},
      totalCandidates,
      totalQuotaConfigured: 0,
      totalAssigned: 0,
      unassignedCount: totalCandidates,
      strategyUsed: strategy,
      isOverCapacity: false,
      warnings: ['No active interviewers selected! Enable at least one team interviewer.'],
    };
  }

  // Clone interviewers to avoid mutating input
  const updatedProfiles = interviewers.map((i) => ({
    ...i,
    assignedCountForBatch: 0,
  }));

  // Helper map for quick lookup
  const profileMap = new Map<string, InterviewerProfile>();
  updatedProfiles.forEach((p) => profileMap.set(p.email.toLowerCase().trim(), p));

  // STEP 1: Determine Target Quota for each interviewer based on Strategy
  const calculatedQuotas: Record<string, number> = {};

  if (strategy === 'custom') {
    // Recruiter explicitly specified exact numbers per interviewer
    enabledInterviewers.forEach((i) => {
      const email = i.email.toLowerCase().trim();
      calculatedQuotas[email] = Math.max(0, manualQuotas[email] ?? i.batchTargetQuota ?? 0);
    });
  } else if (strategy === 'balanced') {
    // Distribute N candidates as evenly as possible
    const count = enabledInterviewers.length;
    const basePerInterviewer = Math.floor(totalCandidates / count);
    let remainder = totalCandidates % count;

    enabledInterviewers.forEach((i) => {
      const email = i.email.toLowerCase().trim();
      let quota = basePerInterviewer;
      if (remainder > 0) {
        quota += 1;
        remainder--;
      }
      calculatedQuotas[email] = quota;
    });
  } else if (strategy === 'workload_aware') {
    // Distribute inversely proportional to current active interviews in DB
    // Interviewer with 1 active in DB gets more than interviewer with 6 active
    const maxActive = Math.max(...enabledInterviewers.map((i) => i.liveActiveInterviews), 1);
    const capacityScores = enabledInterviewers.map((i) => {
      const remainingToday = Math.max(0, i.dailyMaxCapacity - i.liveTodayInterviews);
      const freeSlotsScore = maxActive - i.liveActiveInterviews + 1;
      return {
        email: i.email.toLowerCase().trim(),
        score: Math.max(1, freeSlotsScore * Math.max(1, remainingToday)),
      };
    });

    const totalScore = capacityScores.reduce((sum, cs) => sum + cs.score, 0);
    let assignedSoFar = 0;

    capacityScores.forEach((cs, idx) => {
      if (idx === capacityScores.length - 1) {
        // Last one takes exact balance to match total
        calculatedQuotas[cs.email] = Math.max(0, totalCandidates - assignedSoFar);
      } else {
        const share = Math.round((cs.score / totalScore) * totalCandidates);
        calculatedQuotas[cs.email] = share;
        assignedSoFar += share;
      }
    });
  } else if (strategy === 'seniority_weighted') {
    // Leads: weight 3, Seniors: weight 2, Mid/HR: weight 1.5
    const totalWeights = enabledInterviewers.reduce((sum, i) => sum + Math.max(1, i.weight), 0);
    let assignedSoFar = 0;

    enabledInterviewers.forEach((i, idx) => {
      const email = i.email.toLowerCase().trim();
      if (idx === enabledInterviewers.length - 1) {
        calculatedQuotas[email] = Math.max(0, totalCandidates - assignedSoFar);
      } else {
        const share = Math.round((Math.max(1, i.weight) / totalWeights) * totalCandidates);
        calculatedQuotas[email] = share;
        assignedSoFar += share;
      }
    });
  } else if (strategy === 'skill_match') {
    // Initial dynamic estimate, will be resolved during candidate assignment
    const base = Math.ceil(totalCandidates / enabledInterviewers.length);
    enabledInterviewers.forEach((i) => {
      calculatedQuotas[i.email.toLowerCase().trim()] = base + 1; // flexible ceiling
    });
  }

  // Update batchTargetQuota on profiles to reflect calculated numbers
  updatedProfiles.forEach((p) => {
    const email = p.email.toLowerCase().trim();
    if (calculatedQuotas[email] !== undefined) {
      p.batchTargetQuota = calculatedQuotas[email];
    }
  });

  const totalQuotaConfigured = Object.values(calculatedQuotas).reduce((a, b) => a + b, 0);

  // STEP 2: Assign Candidates to Interviewers
  const assignments: Record<string, CandidateAssignmentPreview> = {};
  const currentAssignedCounts: Record<string, number> = {};
  enabledInterviewers.forEach((i) => {
    currentAssignedCounts[i.email.toLowerCase().trim()] = 0;
  });

  // Track remaining quota per interviewer
  const remainingQuota: Record<string, number> = { ...calculatedQuotas };

  // Phase 2A: Apply explicit candidate overrides first (if recruiter manually pinned a candidate)
  candidates.forEach((cand) => {
    const overrideEmail = candidateOverrides[cand.id]?.toLowerCase().trim();
    if (overrideEmail && profileMap.has(overrideEmail)) {
      const interviewer = profileMap.get(overrideEmail)!;
      assignments[cand.id] = {
        candidateId: cand.id,
        candidateName: cand.name,
        candidatePosition: cand.position,
        candidateLocation: cand.location,
        candidateTimezone: cand.timezone,
        assignedInterviewerEmail: interviewer.email,
        assignedInterviewerName: interviewer.name,
        matchReason: 'Manual recruiter assignment override',
        matchScore: 100,
      };
      currentAssignedCounts[overrideEmail] = (currentAssignedCounts[overrideEmail] || 0) + 1;
      remainingQuota[overrideEmail] = Math.max(0, (remainingQuota[overrideEmail] || 0) - 1);
    }
  });

  // Phase 2B: Assign remaining candidates based on strategy & quotas
  const unassignedCandidates = candidates.filter((c) => !assignments[c.id]);

  for (const cand of unassignedCandidates) {
    let bestInterviewer: InterviewerProfile | null = null;
    let bestScore = -1;
    let bestReason = '';

    for (const interviewer of enabledInterviewers) {
      const email = interviewer.email.toLowerCase().trim();
      const quotaRemaining = remainingQuota[email] ?? 0;

      // In custom/balanced mode, respect quota limit unless all are full
      if (strategy !== 'skill_match' && quotaRemaining <= 0) {
        continue;
      }

      // Check daily fatigue limit
      const todayTotal = interviewer.liveTodayInterviews + (currentAssignedCounts[email] || 0);
      if (todayTotal >= interviewer.dailyMaxCapacity * 2) {
        // Very heavy fatigue safeguard
        continue;
      }

      const match = scoreCandidateInterviewerMatch(cand, interviewer);

      // Add strategy bonus
      let adjustedScore = match.score;
      if (strategy === 'workload_aware') {
        // Boost interviewer with lowest assigned so far in this batch
        adjustedScore += Math.max(0, 20 - (currentAssignedCounts[email] || 0) * 5);
      } else if (strategy === 'seniority_weighted') {
        adjustedScore += interviewer.weight * 5;
      }

      if (adjustedScore > bestScore) {
        bestScore = adjustedScore;
        bestInterviewer = interviewer;
        bestReason = match.reason;
      }
    }

    // Fallback: if all enabled interviewers reached their target quota, assign to interviewer with lowest batch load
    if (!bestInterviewer) {
      const sortedByLoad = [...enabledInterviewers].sort(
        (a, b) =>
          (currentAssignedCounts[a.email.toLowerCase().trim()] || 0) -
          (currentAssignedCounts[b.email.toLowerCase().trim()] || 0)
      );
      bestInterviewer = sortedByLoad[0];
      bestReason = 'Capacity overflow fallback (balanced to least loaded)';
      bestScore = 60;
    }

    if (bestInterviewer) {
      const email = bestInterviewer.email.toLowerCase().trim();
      assignments[cand.id] = {
        candidateId: cand.id,
        candidateName: cand.name,
        candidatePosition: cand.position,
        candidateLocation: cand.location,
        candidateTimezone: cand.timezone,
        assignedInterviewerEmail: bestInterviewer.email,
        assignedInterviewerName: bestInterviewer.name,
        matchReason: bestReason,
        matchScore: bestScore,
      };

      currentAssignedCounts[email] = (currentAssignedCounts[email] || 0) + 1;
      remainingQuota[email] = Math.max(0, (remainingQuota[email] || 0) - 1);
    }
  }

  // Update assigned count on each profile
  updatedProfiles.forEach((p) => {
    const email = p.email.toLowerCase().trim();
    p.assignedCountForBatch = currentAssignedCounts[email] || 0;
  });

  const totalAssigned = Object.keys(assignments).length;
  const unassignedCount = Math.max(0, totalCandidates - totalAssigned);

  // Health and fatigue checks
  updatedProfiles.forEach((p) => {
    if (p.enabled) {
      const combinedActive = p.liveActiveInterviews + p.assignedCountForBatch;
      if (combinedActive > 8) {
        warnings.push(`⚠️ ${p.name} will have ${combinedActive} active interviews in the pipeline! Consider reallocating.`);
      }
      if (p.assignedCountForBatch > p.dailyMaxCapacity) {
        warnings.push(`⚡ ${p.name} batch quota (${p.assignedCountForBatch}) exceeds standard daily capacity (${p.dailyMaxCapacity}).`);
      }
    }
  });

  if (totalQuotaConfigured < totalCandidates && strategy === 'custom') {
    warnings.push(`Notice: Configured quotas sum to ${totalQuotaConfigured}, but ${totalCandidates} candidates were parsed.`);
  }

  return {
    interviewers: updatedProfiles,
    assignments,
    totalCandidates,
    totalQuotaConfigured,
    totalAssigned,
    unassignedCount,
    strategyUsed: strategy,
    isOverCapacity: totalQuotaConfigured > totalCandidates,
    warnings,
  };
}
