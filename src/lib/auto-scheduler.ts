import { Candidate, InterviewTrack } from '../types';
import { createPktIso, formatPktDateTime, formatLocalDateTime, getPktDateComponents } from './date-utils';
import { resolveCandidateTimezone, formatInTimezone, evaluateCandidateWorkingHours } from './timezone-utils';
import { DEFAULT_INTERVIEW_TRACKS, getTrackById } from './track-constants';
import { batchUpdateCandidates } from './firebase-operations';
import { broadcastLiveSync } from './cross-tab-sync';
import { syncCandidatesToHeroku } from './heroku-db';

export interface AutoSchedulerConfig {
  startDate: string; // YYYY-MM-DD (in PKT)
  endDate: string; // YYYY-MM-DD (in PKT)
  dailyStartTimePkt: string; // "11:00" (PKT / UTC+5)
  dailyEndTimePkt: string; // "21:00" (PKT / UTC+5)
  durationMinutes: number; // 30, 45, 60
  bufferMinutes: number; // 0, 10, 15
  allowedTrackIds: string[]; // e.g. ['track-alpha', 'track-beta', 'track-gamma', 'track-delta']
  maxConcurrentPerSlot: number; // 1 to 4
  interviewers: string[]; // Panel emails
  maxInterviewsPerDayPerInterviewer?: number; // e.g. 4
  respectCandidateWakingHours: boolean; // Prefer candidate local daylight hours (08:30 - 20:30)
  excludeWeekends: boolean; // Skip Saturday/Sunday
  autoStatus: Candidate['status']; // Default 'Scheduled'
  candidateInterviewerOverrides?: Record<string, string>; // candidateId -> interviewerEmail
  interviewerQuotas?: Record<string, number>; // interviewerEmail -> max quota for this batch
}

export interface ScheduledSlotAllocation {
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  candidatePosition: string;
  candidateCountry: string;
  candidateTimezone: string;
  candidateTimezoneLabel: string;
  candidateLocalTimeFormatted: string;
  daylightQuality: 'optimal' | 'acceptable' | 'off-hours';
  daylightLabel: string;
  slotIso: string;
  slotPktFormatted: string;
  durationMinutes: number;
  trackId: string;
  trackName: string;
  trackColor: string;
  assignedInterviewer: string;
  interviewerEmails: string[];
  matchScore: number;
  matchReason: string;
  meetLink: string;
}

export interface AutoSchedulerResult {
  allocations: ScheduledSlotAllocation[];
  unallocated: { candidate: Candidate; reason: string }[];
  stats: {
    totalCandidates: number;
    allocatedCount: number;
    unallocatedCount: number;
    daysUtilized: number;
    tracksUtilized: number;
    averageMatchScore: number;
    interviewerCounts: Record<string, number>;
  };
}

/**
 * Parses "HH:mm" string into hour and minute numbers
 */
function parseTimeStr(timeStr: string): { hour: number; minute: number } {
  const [h, m] = timeStr.split(':').map((s) => parseInt(s, 10));
  return {
    hour: isNaN(h) ? 11 : Math.max(0, Math.min(23, h)),
    minute: isNaN(m) ? 0 : Math.max(0, Math.min(59, m)),
  };
}

/**
 * Generates all discrete slot time instances in PKT across the configured date range
 */
export function generateSlotTimeline(config: AutoSchedulerConfig): string[] {
  const {
    startDate,
    endDate,
    dailyStartTimePkt,
    dailyEndTimePkt,
    durationMinutes,
    bufferMinutes,
    excludeWeekends,
  } = config;

  const startParsed = startDate.split('-').map(Number);
  const endParsed = endDate.split('-').map(Number);

  if (startParsed.length < 3 || endParsed.length < 3) return [];

  const startD = new Date(Date.UTC(startParsed[0], startParsed[1] - 1, startParsed[2], 6, 0, 0));
  const endD = new Date(Date.UTC(endParsed[0], endParsed[1] - 1, endParsed[2], 6, 0, 0));

  const startDaily = parseTimeStr(dailyStartTimePkt);
  const endDaily = parseTimeStr(dailyEndTimePkt);

  const startDailyMinutes = startDaily.hour * 60 + startDaily.minute;
  const endDailyMinutes = endDaily.hour * 60 + endDaily.minute;
  const stepMinutes = Math.max(15, durationMinutes + bufferMinutes);

  const slots: string[] = [];

  const currentD = new Date(startD);
  while (currentD <= endD) {
    const pktComp = getPktDateComponents(currentD);
    if (pktComp) {
      const isWeekend = pktComp.dayOfWeek === 0 || pktComp.dayOfWeek === 6; // Sunday or Saturday
      if (!excludeWeekends || !isWeekend) {
        for (
          let curMin = startDailyMinutes;
          curMin + durationMinutes <= endDailyMinutes;
          curMin += stepMinutes
        ) {
          const slotHour = Math.floor(curMin / 60);
          const slotMinute = curMin % 60;
          const slotIso = createPktIso(
            pktComp.year,
            pktComp.month,
            pktComp.date,
            slotHour,
            slotMinute
          );
          // Only include future slots (or slots at least 15 mins from now)
          if (new Date(slotIso).getTime() > Date.now() + 15 * 60 * 1000) {
            slots.push(slotIso);
          }
        }
      }
    }
    // Advance by 1 day
    currentD.setUTCDate(currentD.getUTCDate() + 1);
  }

  return slots;
}

/**
 * Evaluates candidate timezone waking hour comfort for a given PKT slot
 */
export function evaluateCandidateTimezoneSlot(
  candidate: Candidate,
  slotIso: string
): {
  score: number;
  quality: 'optimal' | 'acceptable' | 'off-hours';
  label: string;
  localTimeFormatted: string;
  reason: string;
} {
  const tzInfo = resolveCandidateTimezone(candidate);
  const localTimeFormatted = formatLocalDateTime(slotIso, tzInfo.tz);

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tzInfo.tz,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });
    const parts = formatter.formatToParts(new Date(slotIso));
    const hourPart = parts.find((p) => p.type === 'hour');
    const localHour = hourPart ? parseInt(hourPart.value === '24' ? '0' : hourPart.value, 10) : 12;

    // Ideal daylight working hours: 09:00 - 18:30 (Optimal)
    if (localHour >= 9 && localHour < 19) {
      return {
        score: 100,
        quality: 'optimal',
        label: `☀️ Daylight (${localHour > 12 ? localHour - 12 : localHour}:00 ${localHour >= 12 ? 'PM' : 'AM'} local)`,
        localTimeFormatted,
        reason: 'Optimal working hours in candidate local time zone.',
      };
    }

    // Extended comfortable hours: 08:00 - 09:00 or 19:00 - 21:00 (Acceptable)
    if ((localHour >= 8 && localHour < 9) || (localHour >= 19 && localHour <= 21)) {
      return {
        score: 82,
        quality: 'acceptable',
        label: `🌤 Twilight/Evening (${localHour > 12 ? localHour - 12 : localHour}:00 ${localHour >= 12 ? 'PM' : 'AM'} local)`,
        localTimeFormatted,
        reason: 'Acceptable overlap with candidate morning or early evening.',
      };
    }

    // Off-hours / Night: 22:00 - 07:59
    return {
      score: 35,
      quality: 'off-hours',
      label: `🌙 Night/Late (${localHour > 12 ? localHour - 12 : localHour}:00 ${localHour >= 12 ? 'PM' : 'AM'} local)`,
      localTimeFormatted,
      reason: 'Late night / outside standard waking hours for candidate.',
    };
  } catch {
    return {
      score: 75,
      quality: 'acceptable',
      label: 'Standard Overlap',
      localTimeFormatted,
      reason: 'Standard timezone overlap calculated.',
    };
  }
}

function resolveInitialMeetUrl(candidate: Candidate): string {
  // Never fabricate dummy or fake Google Meet links.
  // Real Google Meet links are generated when creating Google Calendar events via Google Calendar API.
  return candidate.meetLink || '';
}

/**
 * Runs the intelligent auto-scheduling algorithm
 */
export function runAutoScheduler(
  candidatesToSchedule: Candidate[],
  existingCandidates: Candidate[],
  config: AutoSchedulerConfig
): AutoSchedulerResult {
  const timelineSlots = generateSlotTimeline(config);

  const tracksToUse: InterviewTrack[] = config.allowedTrackIds
    .map((id) => getTrackById(id))
    .filter(Boolean);

  const effectiveTracks = tracksToUse.length > 0 ? tracksToUse : DEFAULT_INTERVIEW_TRACKS;
  const maxTracksPerSlot = Math.min(config.maxConcurrentPerSlot, effectiveTracks.length);

  // Set up existing occupied track slots map: `slotIso_trackId` -> candidateId
  // Also track occupied interviewer slots so an interviewer cannot be booked in parallel tracks at the same time!
  const occupiedSlots = new Set<string>();
  const occupiedInterviewerSlots = new Set<string>();

  existingCandidates.forEach((c) => {
    if (c.status !== 'Rejected' && c.suggestedPktTime) {
      const slotTimeMs = new Date(c.suggestedPktTime).getTime();
      const trackId = c.trackId || 'track-alpha';
      const interviewer = (c.assignedInterviewer || c.scheduledInterviewerId || '').toLowerCase().trim();

      // Mark 45m window around this slot as occupied on this track
      occupiedSlots.add(`${c.suggestedPktTime}_${trackId}`);
      if (interviewer) {
        occupiedInterviewerSlots.add(`${c.suggestedPktTime}_${interviewer}`);
      }

      // Also check overlapping window
      timelineSlots.forEach((slotIso) => {
        const diffMs = Math.abs(new Date(slotIso).getTime() - slotTimeMs);
        if (diffMs < (config.durationMinutes - 5) * 60 * 1000) {
          occupiedSlots.add(`${slotIso}_${trackId}`);
          if (interviewer) {
            occupiedInterviewerSlots.add(`${slotIso}_${interviewer}`);
          }
        }
      });
    }
  });

  const interviewersList =
    config.interviewers && config.interviewers.length > 0
      ? config.interviewers
      : ['m.mattiulhasnain@gmail.com', 'mihora.tech@gmail.com'];

  // Track daily interviewer workload: `YYYY-MM-DD_interviewerEmail` -> count
  const interviewerWorkload = new Map<string, number>();
  const totalInterviewerAssignments: Record<string, number> = {};
  interviewersList.forEach((e) => (totalInterviewerAssignments[e] = 0));

  let interviewerIndex = 0;

  const allocations: ScheduledSlotAllocation[] = [];
  const unallocated: { candidate: Candidate; reason: string }[] = [];
  const usedDays = new Set<string>();
  const usedTracks = new Set<string>();

  // Process candidates prioritizing those with timezone constraints
  const sortedCandidates = [...candidatesToSchedule].sort((a, b) => {
    const tzA = resolveCandidateTimezone(a);
    const tzB = resolveCandidateTimezone(b);
    // Prioritize candidates furthest from PKT (UTC+5) to fit them in narrow daylight overlap windows
    const diffA = Math.abs(tzA.utcOffsetMinutes - 300);
    const diffB = Math.abs(tzB.utcOffsetMinutes - 300);
    return diffB - diffA;
  });

  for (const candidate of sortedCandidates) {
    if (!candidate.id && !candidate.name) continue;

    // Check if this candidate has an assigned interviewer pre-selected
    const preferredInterviewer = (
      config.candidateInterviewerOverrides?.[candidate.id || ''] ||
      candidate.assignedInterviewer ||
      ''
    ).toLowerCase().trim();

    let bestAllocation: ScheduledSlotAllocation | null = null;
    let highestScore = -1;

    // Search for the best clash-free slot & track
    for (const slotIso of timelineSlots) {
      const dateKey = slotIso.split('T')[0];

      // Try available tracks up to maxTracksPerSlot
      for (let tIdx = 0; tIdx < maxTracksPerSlot; tIdx++) {
        const track = effectiveTracks[tIdx];
        const slotKey = `${slotIso}_${track.id}`;

        if (occupiedSlots.has(slotKey)) {
          continue; // Slot already taken on this track
        }

        // Determine candidate interviewer for this attempt
        let candidateInterviewer = '';
        if (preferredInterviewer && interviewersList.includes(preferredInterviewer)) {
          candidateInterviewer = preferredInterviewer;
        } else {
          // Select interviewer respecting batch quotas
          const availableInterviewers = interviewersList.filter((email) => {
            const quota = config.interviewerQuotas?.[email];
            if (quota !== undefined) {
              return (totalInterviewerAssignments[email] || 0) < quota;
            }
            return true;
          });

          const poolToUse = availableInterviewers.length > 0 ? availableInterviewers : interviewersList;
          candidateInterviewer = poolToUse[interviewerIndex % poolToUse.length];
        }

        // Check if interviewer is already booked in another track at this exact slot
        const interviewerSlotKey = `${slotIso}_${candidateInterviewer.toLowerCase().trim()}`;
        if (occupiedInterviewerSlots.has(interviewerSlotKey)) {
          continue; // Interviewer is in another room at this time!
        }

        // Check daily workload cap for this interviewer
        const dayWorkloadKey = `${dateKey}_${candidateInterviewer}`;
        const currentDayCount = interviewerWorkload.get(dayWorkloadKey) || 0;
        const maxDailyCap = config.maxInterviewsPerDayPerInterviewer || 5;
        if (currentDayCount >= maxDailyCap && interviewersList.length > 1) {
          continue; // Daily limit reached for this interviewer
        }

        // Evaluate candidate timezone daylight quality
        const tzEval = evaluateCandidateTimezoneSlot(candidate, slotIso);

        // If respectCandidateWakingHours is enabled and slot is off-hours, skip unless desperate
        if (config.respectCandidateWakingHours && tzEval.quality === 'off-hours') {
          continue;
        }

        const candidateTzInfo = resolveCandidateTimezone(candidate);
        let matchScore = tzEval.score;

        // Boost score if this matches preferred interviewer
        if (preferredInterviewer && candidateInterviewer === preferredInterviewer) {
          matchScore += 10;
        }

        if (matchScore > highestScore) {
          highestScore = matchScore;
          bestAllocation = {
            candidateId: candidate.id || `temp_${Math.random()}`,
            candidateName: candidate.name,
            candidateEmail: candidate.email,
            candidatePosition: candidate.position || 'Software Engineer',
            candidateCountry: candidate.country || candidateTzInfo.country,
            candidateTimezone: candidateTzInfo.tz,
            candidateTimezoneLabel: candidateTzInfo.label,
            candidateLocalTimeFormatted: tzEval.localTimeFormatted,
            daylightQuality: tzEval.quality,
            daylightLabel: tzEval.label,
            slotIso,
            slotPktFormatted: formatPktDateTime(slotIso),
            durationMinutes: config.durationMinutes,
            trackId: track.id,
            trackName: track.name,
            trackColor: track.color,
            assignedInterviewer: candidateInterviewer,
            interviewerEmails: [candidateInterviewer],
            matchScore,
            matchReason: tzEval.reason,
            meetLink: resolveInitialMeetUrl(candidate),
          };

          // If score is optimal (>= 95), lock in this slot
          if (highestScore >= 95) {
            break;
          }
        }
      }

      if (highestScore >= 95) {
        break;
      }
    }

    if (bestAllocation) {
      // Reserve the slot on this track
      const slotKey = `${bestAllocation.slotIso}_${bestAllocation.trackId}`;
      occupiedSlots.add(slotKey);

      // Reserve interviewer in this slot to prevent double-booking
      const interviewerSlotKey = `${bestAllocation.slotIso}_${bestAllocation.assignedInterviewer.toLowerCase().trim()}`;
      occupiedInterviewerSlots.add(interviewerSlotKey);

      // Reserve window
      timelineSlots.forEach((s) => {
        const diff = Math.abs(new Date(s).getTime() - new Date(bestAllocation!.slotIso).getTime());
        if (diff < (config.durationMinutes - 5) * 60 * 1000) {
          occupiedSlots.add(`${s}_${bestAllocation!.trackId}`);
          occupiedInterviewerSlots.add(`${s}_${bestAllocation!.assignedInterviewer.toLowerCase().trim()}`);
        }
      });

      // Update interviewer workload
      const dateKey = bestAllocation.slotIso.split('T')[0];
      const dayWorkloadKey = `${dateKey}_${bestAllocation.assignedInterviewer}`;
      interviewerWorkload.set(
        dayWorkloadKey,
        (interviewerWorkload.get(dayWorkloadKey) || 0) + 1
      );
      totalInterviewerAssignments[bestAllocation.assignedInterviewer] =
        (totalInterviewerAssignments[bestAllocation.assignedInterviewer] || 0) + 1;

      interviewerIndex++;
      usedDays.add(dateKey);
      usedTracks.add(bestAllocation.trackId);
      allocations.push(bestAllocation);
    } else {
      unallocated.push({
        candidate,
        reason: 'No conflict-free slot found within configured date range and daytime window.',
      });
    }
  }

  const averageMatchScore =
    allocations.length > 0
      ? Math.round(allocations.reduce((acc, a) => acc + a.matchScore, 0) / allocations.length)
      : 0;

  return {
    allocations,
    unallocated,
    stats: {
      totalCandidates: candidatesToSchedule.length,
      allocatedCount: allocations.length,
      unallocatedCount: unallocated.length,
      daysUtilized: usedDays.size,
      tracksUtilized: usedTracks.size,
      averageMatchScore,
      interviewerCounts: totalInterviewerAssignments,
    },
  };
}

/**
 * Commits the allocations atomically to Firestore and broadcasts real-time updates across all tabs
 */
export async function commitAutoScheduleBatch(
  allocations: ScheduledSlotAllocation[],
  allCandidates: Candidate[],
  options: {
    sendEmailsImmediately?: boolean;
    currentUserName?: string;
  } = {}
): Promise<{ success: boolean; count: number; error?: string }> {
  if (!allocations || allocations.length === 0) {
    return { success: true, count: 0 };
  }

  try {
    const actor = options.currentUserName || 'Recruiter (AI Batch Scheduler)';
    const timestamp = new Date().toISOString();

    const updates = allocations.map((alloc) => {
      const existing = allCandidates.find((c) => c.id === alloc.candidateId);
      const existingActivities = existing?.activities || [];

      const newActivity = {
        id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp,
        type: 'scheduled' as const,
        title: 'Auto-Scheduled Interview',
        details: `Auto-scheduled to ${alloc.slotPktFormatted} on ${alloc.trackName} with ${alloc.assignedInterviewer}.`,
        actor,
      };

      return {
        id: alloc.candidateId,
        data: {
          status: 'Scheduled' as const,
          suggestedPktTime: alloc.slotIso,
          durationMinutes: alloc.durationMinutes,
          trackId: alloc.trackId,
          trackName: alloc.trackName,
          assignedInterviewer: alloc.assignedInterviewer,
          interviewerEmails: alloc.interviewerEmails,
          meetLink: alloc.meetLink,
          timezone: alloc.candidateTimezone,
          timezoneLabel: alloc.candidateTimezoneLabel,
          country: alloc.candidateCountry,
          activities: [newActivity, ...existingActivities],
        },
      };
    });

    // 1. Commit atomically to Firestore database via writeBatch
    await batchUpdateCandidates(updates);

    // 2. Synchronize in background to Heroku/Postgres server DB
    try {
      const updatedList = allCandidates.map((c) => {
        const matched = updates.find((u) => u.id === c.id);
        if (matched) {
          return { ...c, ...matched.data };
        }
        return c;
      });
      syncCandidatesToHeroku(updatedList).catch((err) => {
        console.warn('[Heroku/Postgres Sync Notice]:', err?.message);
      });
    } catch {}

    // 3. Broadcast real-time live event across all open tabs, windows, and views
    broadcastLiveSync('BATCH_SCHEDULE_COMPLETED', {
      count: allocations.length,
      timestamp: Date.now(),
      allocationsSummary: allocations.map((a) => ({
        id: a.candidateId,
        time: a.slotIso,
        track: a.trackName,
      })),
    });

    return { success: true, count: allocations.length };
  } catch (err: any) {
    console.error('Batch commit failed:', err);
    return { success: false, count: 0, error: err?.message || 'Database batch commit failed.' };
  }
}
