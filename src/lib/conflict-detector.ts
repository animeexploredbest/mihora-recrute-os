import { Candidate } from '../types';
import { DEFAULT_INTERVIEW_TRACKS, InterviewTrack, getTrackById } from './track-constants';

export interface ScheduleConflict {
  conflictingCandidate: Candidate;
  startIso: string;
  endIso: string;
  durationMinutes: number;
  reason: 'same_track' | 'same_interviewer' | 'capacity_exceeded' | 'overlap';
  details: string;
}

export interface MultiTrackSlotEvaluation {
  proposedTimeIso: string;
  proposedDurationMinutes: number;
  overlappingCandidates: Candidate[];
  concurrentCount: number;
  maxCapacity: number;
  isCapacityExceeded: boolean;

  // Track specific
  proposedTrack: InterviewTrack;
  isProposedTrackOccupied: boolean;
  occupyingCandidateForTrack?: Candidate;
  availableTracks: InterviewTrack[];
  occupiedTracks: { track: InterviewTrack; candidate: Candidate }[];

  // Interviewer specific
  hasInterviewerCollision: boolean;
  collidingInterviewerEmail?: string;
  collidingCandidate?: Candidate;

  // Final verdict
  hasHardConflict: boolean;
  isAllowedConcurrent: boolean;
  statusMessage: string;
}

/**
 * Checks if candidate is in an active or scheduled calendar state.
 * Includes candidates scheduled, rescheduled, interviewed, or selected
 * (excluding rejected or candidates without any time assigned).
 */
export function isCandidateScheduled(c: Candidate): boolean {
  if (!c.suggestedPktTime || c.status === 'Rejected') return false;
  return (
    c.status === 'Scheduled' ||
    c.status === 'Rescheduled' ||
    c.status === 'Interviewed' ||
    c.status === 'Selected' ||
    Boolean(c.meetLink)
  );
}

/**
 * Normalizes email list from candidate or comma-separated string
 */
function extractInterviewerEmails(interviewerData?: string | string[]): string[] {
  if (!interviewerData) return [];
  if (Array.isArray(interviewerData)) {
    return interviewerData.map((e) => e.trim().toLowerCase()).filter(Boolean);
  }
  return interviewerData
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Returns candidate's effective track ID, defaulting to 'track-alpha' if unspecified
 */
export function getCandidateTrackId(candidate: Candidate): string {
  return candidate.trackId || 'track-alpha';
}

/**
 * Finds all scheduled candidates whose interview time window overlaps with the target time window.
 */
export function getOverlappingCandidates(
  targetTimeIso: string,
  targetDurationMinutes: number,
  allCandidates: Candidate[],
  ignoreCandidateId?: string
): Candidate[] {
  if (!targetTimeIso) return [];

  const targetStart = new Date(targetTimeIso).getTime();
  const targetEnd = targetStart + targetDurationMinutes * 60 * 1000;
  if (isNaN(targetStart)) return [];

  const overlapping: Candidate[] = [];

  for (const c of allCandidates) {
    if (c.id && ignoreCandidateId && c.id === ignoreCandidateId) continue;
    if (!isCandidateScheduled(c)) continue;

    const cStart = new Date(c.suggestedPktTime).getTime();
    if (isNaN(cStart)) continue;

    const cDuration = c.durationMinutes || 45;
    const cEnd = cStart + cDuration * 60 * 1000;

    // Overlap condition:
    // candidate starts before target ends AND candidate ends after target starts
    if (cStart < targetEnd && cEnd > targetStart) {
      overlapping.push(c);
    }
  }

  return overlapping;
}

/**
 * Comprehensive Multi-Track Evaluation for a proposed interview slot, track, and interviewer panel.
 */
export function evaluateMultiTrackSlot(
  targetTimeIso: string,
  targetDurationMinutes: number,
  proposedTrackId: string,
  proposedInterviewerEmails: string | string[] | undefined,
  allCandidates: Candidate[],
  ignoreCandidateId?: string,
  maxCapacity: number = 4
): MultiTrackSlotEvaluation {
  const overlapping = getOverlappingCandidates(
    targetTimeIso,
    targetDurationMinutes,
    allCandidates,
    ignoreCandidateId
  );

  const proposedTrack = getTrackById(proposedTrackId);
  const proposedEmails = extractInterviewerEmails(proposedInterviewerEmails);

  const occupiedTracks: { track: InterviewTrack; candidate: Candidate }[] = [];
  const occupiedTrackIdSet = new Set<string>();
  let occupyingCandidateForTrack: Candidate | undefined;

  let hasInterviewerCollision = false;
  let collidingInterviewerEmail: string | undefined;
  let collidingCandidate: Candidate | undefined;

  for (const c of overlapping) {
    const cTrackId = getCandidateTrackId(c);
    const cTrack = getTrackById(cTrackId);
    occupiedTracks.push({ track: cTrack, candidate: c });
    occupiedTrackIdSet.add(cTrackId);

    if (cTrackId === proposedTrack.id && !occupyingCandidateForTrack) {
      occupyingCandidateForTrack = c;
    }

    // Check interviewer collisions
    if (proposedEmails.length > 0) {
      const cEmails = extractInterviewerEmails(c.interviewerEmails || c.assignedInterviewer);
      for (const pEmail of proposedEmails) {
        if (cEmails.includes(pEmail)) {
          hasInterviewerCollision = true;
          collidingInterviewerEmail = pEmail;
          collidingCandidate = c;
          break;
        }
      }
    }
  }

  const isProposedTrackOccupied = Boolean(occupyingCandidateForTrack);
  const availableTracks = DEFAULT_INTERVIEW_TRACKS.filter(
    (t) => !occupiedTrackIdSet.has(t.id)
  );
  const isCapacityExceeded = overlapping.length >= maxCapacity;

  // Determine conflict status
  const hasHardConflict =
    isCapacityExceeded || isProposedTrackOccupied || hasInterviewerCollision;

  const isAllowedConcurrent = !hasHardConflict && overlapping.length > 0;

  let statusMessage = '';
  if (isCapacityExceeded) {
    statusMessage = `Maximum capacity reached (${overlapping.length}/${maxCapacity} parallel tracks occupied in this slot).`;
  } else if (isProposedTrackOccupied) {
    statusMessage = `${proposedTrack.shortCode} is already booked by ${occupyingCandidateForTrack?.name}. Switch to an available track.`;
  } else if (hasInterviewerCollision) {
    statusMessage = `Interviewer ${collidingInterviewerEmail} is already interviewing ${collidingCandidate?.name} in this time window.`;
  } else if (isAllowedConcurrent) {
    statusMessage = `Allowed parallel interview: ${overlapping.length} of ${maxCapacity} concurrent tracks active. ${proposedTrack.shortCode} is free!`;
  } else {
    statusMessage = `Slot is completely open. ${proposedTrack.shortCode} available.`;
  }

  return {
    proposedTimeIso: targetTimeIso,
    proposedDurationMinutes: targetDurationMinutes,
    overlappingCandidates: overlapping,
    concurrentCount: overlapping.length,
    maxCapacity,
    isCapacityExceeded,
    proposedTrack,
    isProposedTrackOccupied,
    occupyingCandidateForTrack,
    availableTracks,
    occupiedTracks,
    hasInterviewerCollision,
    collidingInterviewerEmail,
    collidingCandidate,
    hasHardConflict,
    isAllowedConcurrent,
    statusMessage,
  };
}

/**
 * Intelligent slot conflict detector that accounts for multi-track parallel capability.
 * An overlap is only a true conflict if:
 * 1. Both candidates share the same track, OR
 * 2. Both candidates share the same interviewer, OR
 * 3. The slot exceeds maximum parallel capacity.
 */
export function findSlotConflicts(
  targetTimeIso: string,
  targetDurationMinutes: number,
  allCandidates: Candidate[],
  ignoreCandidateId?: string,
  proposedTrackId?: string,
  proposedInterviewerEmails?: string | string[],
  maxCapacity: number = 4
): ScheduleConflict[] {
  if (!targetTimeIso) return [];

  const targetStart = new Date(targetTimeIso).getTime();
  const targetEnd = targetStart + targetDurationMinutes * 60 * 1000;
  if (isNaN(targetStart)) return [];

  const effectiveTrackId = proposedTrackId || 'track-alpha';
  const proposedEmails = extractInterviewerEmails(proposedInterviewerEmails);

  const overlapping = getOverlappingCandidates(
    targetTimeIso,
    targetDurationMinutes,
    allCandidates,
    ignoreCandidateId
  );

  const conflicts: ScheduleConflict[] = [];

  // 1. Check overall slot capacity
  if (overlapping.length >= maxCapacity) {
    for (const c of overlapping) {
      const cDuration = c.durationMinutes || 45;
      const cEnd = new Date(c.suggestedPktTime).getTime() + cDuration * 60 * 1000;
      conflicts.push({
        conflictingCandidate: c,
        startIso: c.suggestedPktTime,
        endIso: new Date(cEnd).toISOString(),
        durationMinutes: cDuration,
        reason: 'capacity_exceeded',
        details: `Slot reached maximum parallel capacity (${overlapping.length}/${maxCapacity})`,
      });
    }
    return conflicts;
  }

  // 2. Check track or interviewer conflicts against overlapping candidates
  for (const c of overlapping) {
    const cTrackId = getCandidateTrackId(c);
    const cDuration = c.durationMinutes || 45;
    const cEnd = new Date(c.suggestedPktTime).getTime() + cDuration * 60 * 1000;

    // Track conflict: both assigned to the same track
    if (cTrackId === effectiveTrackId) {
      const trackObj = getTrackById(cTrackId);
      conflicts.push({
        conflictingCandidate: c,
        startIso: c.suggestedPktTime,
        endIso: new Date(cEnd).toISOString(),
        durationMinutes: cDuration,
        reason: 'same_track',
        details: `Track Collision: ${trackObj.shortCode} is already booked by ${c.name}`,
      });
      continue;
    }

    // Interviewer collision: same interviewer booked for two candidates at once
    if (proposedEmails.length > 0) {
      const cEmails = extractInterviewerEmails(c.interviewerEmails || c.assignedInterviewer);
      const sharedEmail = proposedEmails.find((e) => cEmails.includes(e));
      if (sharedEmail) {
        conflicts.push({
          conflictingCandidate: c,
          startIso: c.suggestedPktTime,
          endIso: new Date(cEnd).toISOString(),
          durationMinutes: cDuration,
          reason: 'same_interviewer',
          details: `Interviewer Collision: ${sharedEmail} is already booked with ${c.name}`,
        });
      }
    }
  }

  return conflicts;
}

/**
 * Finds all candidate IDs that have scheduling conflicts with at least one other candidate.
 * Recognizes that candidates on distinct tracks with distinct interviewers are valid concurrent sessions.
 */
export function getConflictCandidateIdSet(
  allCandidates: Candidate[],
  maxCapacity: number = 4
): Set<string> {
  const conflictIds = new Set<string>();
  const scheduled = allCandidates.filter(isCandidateScheduled);

  for (let i = 0; i < scheduled.length; i++) {
    const c1 = scheduled[i];
    const s1 = new Date(c1.suggestedPktTime).getTime();
    const d1 = c1.durationMinutes || 45;
    const e1 = s1 + d1 * 60 * 1000;
    const t1 = getCandidateTrackId(c1);
    const emails1 = extractInterviewerEmails(c1.interviewerEmails || c1.assignedInterviewer);

    let overlapCount = 1;

    for (let j = i + 1; j < scheduled.length; j++) {
      const c2 = scheduled[j];
      const s2 = new Date(c2.suggestedPktTime).getTime();
      const d2 = c2.durationMinutes || 45;
      const e2 = s2 + d2 * 60 * 1000;

      // Check if time windows overlap
      if (s1 < e2 && e1 > s2) {
        overlapCount++;
        const t2 = getCandidateTrackId(c2);
        const emails2 = extractInterviewerEmails(c2.interviewerEmails || c2.assignedInterviewer);

        const isSameTrack = t1 === t2;
        const sharedInterviewer = emails1.find((e) => emails2.includes(e));

        if (isSameTrack || sharedInterviewer) {
          if (c1.id) conflictIds.add(c1.id);
          if (c2.id) conflictIds.add(c2.id);
        }
      }
    }

    if (overlapCount > maxCapacity) {
      if (c1.id) conflictIds.add(c1.id);
    }
  }

  return conflictIds;
}

export interface FreeSlotSuggestion {
  slotIso: string;
  trackId: string;
  trackName: string;
}

/**
 * Intelligently suggests the next available free slot and track,
 * evaluating parallel tracks in the same slot before advancing in time.
 * Always ensures suggested slot is in the future.
 */
export function findNextFreeSlotAndTrack(
  currentTimeIso: string,
  durationMinutes: number,
  allCandidates: Candidate[],
  ignoreCandidateId?: string,
  preferredTrackId?: string,
  maxCapacity: number = 4
): FreeSlotSuggestion {
  const now = Date.now();
  let proposedStart = new Date(currentTimeIso).getTime();
  if (isNaN(proposedStart) || proposedStart < now) {
    // Snap to next 30-min mark in the future (minimum 15 mins from now)
    proposedStart = Math.ceil((now + 15 * 60 * 1000) / (30 * 60 * 1000)) * (30 * 60 * 1000);
  }

  const tracks = DEFAULT_INTERVIEW_TRACKS;

  for (let attempt = 0; attempt < 48; attempt++) {
    const proposedIso = new Date(proposedStart).toISOString();

    // Check preferred track first if provided
    const candidateTracks = preferredTrackId
      ? [getTrackById(preferredTrackId), ...tracks.filter((t) => t.id !== preferredTrackId)]
      : tracks;

    for (const t of candidateTracks) {
      const conflicts = findSlotConflicts(
        proposedIso,
        durationMinutes,
        allCandidates,
        ignoreCandidateId,
        t.id,
        undefined,
        maxCapacity
      );
      if (conflicts.length === 0) {
        return {
          slotIso: proposedIso,
          trackId: t.id,
          trackName: t.name,
        };
      }
    }

    // Advance by 30 mins
    proposedStart += 30 * 60 * 1000;
  }

  const fallbackIso = new Date(proposedStart).toISOString();
  return {
    slotIso: fallbackIso,
    trackId: preferredTrackId || 'track-alpha',
    trackName: getTrackById(preferredTrackId || 'track-alpha').name,
  };
}

/**
 * Intelligently suggests the next available free slot ISO,
 * accounting for track availability or advancing when all tracks are booked.
 */
export function findNextFreeSlot(
  currentTimeIso: string,
  durationMinutes: number,
  allCandidates: Candidate[],
  ignoreCandidateId?: string,
  trackId?: string
): string {
  const res = findNextFreeSlotAndTrack(
    currentTimeIso,
    durationMinutes,
    allCandidates,
    ignoreCandidateId,
    trackId
  );
  return res.slotIso;
}
