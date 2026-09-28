import { Candidate } from '../types';
import { getPktDateComponents, createPktIso } from './date-utils';
import { isCandidateScheduled } from './conflict-detector';

export type HeatmapIntensity = 'optimal_open' | 'low_demand' | 'moderate_demand' | 'peak_saturated';

export type HeatmapViewMode = 'balanced' | 'live_capacity' | 'historical_patterns';

export interface HeatmapSlotEvaluation {
  dayOfWeek: number; // 0=Sunday, 1=Monday, ...
  dayName: string;
  hour: number;
  hourLabel: string;
  slotIso: string;
  activeCandidateCount: number;
  maxConcurrentAllowed: number;
  capacityUtilization: number; // 0 to 1
  historicalBookingFrequency: number;
  historicalDensityPercentile: number; // 0 to 100
  intensity: HeatmapIntensity;
  isPeak: boolean;
  isOpen: boolean;
  isSaturated: boolean;
  availableTracksCount: number;
  statusLabel: string;
  recommendationReason: string;
}

export interface RecommendedWindow {
  dayLabel: string;
  dateNumber: number;
  hour: number;
  hourLabel: string;
  openTracks: number;
  historicalRating: string;
  reason: string;
  suggestedIso: string;
}

export interface HourlyHistoricalMetric {
  hour: number;
  hourLabel: string;
  historicalCount: number;
  avgLoadPercentage: number;
  isPeak: boolean;
  isOptimal: boolean;
}

export interface DayOfWeekMetric {
  dayIndex: number;
  dayName: string;
  totalHistoricalInterviews: number;
  peakHourLabel: string;
  utilizationRate: number;
}

export interface HeatmapAnalysis {
  totalSlotsEvaluated: number;
  openSlotsCount: number;
  lowDemandCount: number;
  moderateSlotsCount: number;
  peakSlotsCount: number;
  averageCapacityUtilization: number; // percentage (0 - 100)
  overallBusiestDay: string;
  overallBusiestHour: string;
  topRecommendedWindows: RecommendedWindow[];
  hourlyHistoricalProfile: HourlyHistoricalMetric[];
  dayOfWeekProfile: DayOfWeekMetric[];
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Builds the historical distribution matrix (DayOfWeek 0-6 x Hour 8-22)
 * using all recorded candidates in the pipeline.
 */
export function computeHistoricalMatrix(candidates: Candidate[]): {
  matrix: number[][]; // [dayOfWeek][hour]
  totalRecorded: number;
  maxInAnySlot: number;
} {
  // 7 days x 24 hours
  const matrix: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  let totalRecorded = 0;
  let maxInAnySlot = 0;

  for (const c of candidates) {
    if (!c.suggestedPktTime) continue;
    const pkt = getPktDateComponents(c.suggestedPktTime);
    if (!pkt) continue;

    const day = pkt.dayOfWeek;
    const hour = pkt.hour;
    if (day >= 0 && day <= 6 && hour >= 0 && hour <= 23) {
      matrix[day][hour]++;
      totalRecorded++;
      if (matrix[day][hour] > maxInAnySlot) {
        maxInAnySlot = matrix[day][hour];
      }
    }
  }

  return { matrix, totalRecorded, maxInAnySlot: Math.max(1, maxInAnySlot) };
}

/**
 * Evaluates a single calendar slot in PKT for the Availability Heatmap
 */
export function evaluateHeatmapSlot(
  dayDate: Date,
  hour: number,
  allCandidates: Candidate[],
  historicalMatrix: number[][],
  maxHistoricalSlot: number,
  maxConcurrentAllowed: number = 4,
  mode: HeatmapViewMode = 'balanced'
): HeatmapSlotEvaluation {
  const dayPkt = getPktDateComponents(dayDate)!;
  const dayOfWeek = dayPkt.dayOfWeek;
  const dayName = DAY_NAMES[dayOfWeek];
  const hourLabel = `${hour < 10 ? '0' + hour : hour}:00`;
  const slotIso = createPktIso(dayPkt.year, dayPkt.month, dayPkt.date, hour, 0);

  // Active scheduled candidates in this specific slot
  const scheduled = allCandidates.filter(isCandidateScheduled);
  const activeCandidates = scheduled.filter((c) => {
    if (!c.suggestedPktTime) return false;
    const cPkt = getPktDateComponents(c.suggestedPktTime);
    if (!cPkt) return false;
    return (
      cPkt.year === dayPkt.year &&
      cPkt.month === dayPkt.month &&
      cPkt.date === dayPkt.date &&
      cPkt.hour === hour
    );
  });

  const activeCandidateCount = activeCandidates.length;
  const capacityUtilization = Math.min(1, activeCandidateCount / maxConcurrentAllowed);
  const availableTracksCount = Math.max(0, maxConcurrentAllowed - activeCandidateCount);

  // Historical metrics for this recurring day & hour
  const historicalBookingFrequency = historicalMatrix[dayOfWeek]?.[hour] || 0;
  const historicalDensityPercentile = Math.round(
    (historicalBookingFrequency / Math.max(1, maxHistoricalSlot)) * 100
  );

  // Determine intensity score based on selected view mode
  let score = 0; // 0 to 100
  if (mode === 'live_capacity') {
    score = capacityUtilization * 100;
  } else if (mode === 'historical_patterns') {
    score = historicalDensityPercentile;
  } else {
    // Balanced: 60% live slot congestion + 40% historical pattern density
    score = capacityUtilization * 65 + (historicalDensityPercentile / 100) * 35;
  }

  let intensity: HeatmapIntensity = 'optimal_open';
  let statusLabel = 'Prime Open Slot';
  let recommendationReason = '100% team capacity free with optimal availability';

  if (activeCandidateCount >= maxConcurrentAllowed || score >= 80) {
    intensity = 'peak_saturated';
    statusLabel = activeCandidateCount >= maxConcurrentAllowed ? 'Saturated Capacity' : 'Peak Volume';
    recommendationReason =
      activeCandidateCount >= maxConcurrentAllowed
        ? 'All parallel interview tracks booked for this slot'
        : 'Historically dense interview window with high congestion';
  } else if (activeCandidateCount >= 2 || score >= 50) {
    intensity = 'moderate_demand';
    statusLabel = 'Moderate Demand';
    recommendationReason = `${availableTracksCount} parallel tracks open. Good for team scheduling`;
  } else if (activeCandidateCount === 1 || score >= 20) {
    intensity = 'low_demand';
    statusLabel = 'Good Availability';
    recommendationReason = `${availableTracksCount} parallel tracks free. Low conflict probability`;
  } else {
    intensity = 'optimal_open';
    statusLabel = 'Prime Open Slot';
    recommendationReason =
      historicalBookingFrequency === 0
        ? 'Completely open slot across all team tracks'
        : 'Proven historical slot with full capacity available';
  }

  const isPeak = intensity === 'peak_saturated';
  const isOpen = activeCandidateCount === 0;
  const isSaturated = activeCandidateCount >= maxConcurrentAllowed;

  return {
    dayOfWeek,
    dayName,
    hour,
    hourLabel,
    slotIso,
    activeCandidateCount,
    maxConcurrentAllowed,
    capacityUtilization,
    historicalBookingFrequency,
    historicalDensityPercentile,
    intensity,
    isPeak,
    isOpen,
    isSaturated,
    availableTracksCount,
    statusLabel,
    recommendationReason,
  };
}

/**
 * Computes aggregate summary statistics and recommendations for the displayed period
 */
export function computeHeatmapAnalysis(
  displayedDays: Date[],
  hours: number[],
  allCandidates: Candidate[],
  maxConcurrentAllowed: number = 4,
  mode: HeatmapViewMode = 'balanced'
): HeatmapAnalysis {
  const { matrix, maxInAnySlot } = computeHistoricalMatrix(allCandidates);

  let totalSlots = 0;
  let openSlots = 0;
  let lowDemandSlots = 0;
  let moderateSlots = 0;
  let peakSlots = 0;
  let totalUtilization = 0;

  const slotEvaluations: HeatmapSlotEvaluation[] = [];

  for (const day of displayedDays) {
    for (const hour of hours) {
      const evaluation = evaluateHeatmapSlot(
        day,
        hour,
        allCandidates,
        matrix,
        maxInAnySlot,
        maxConcurrentAllowed,
        mode
      );
      slotEvaluations.push(evaluation);
      totalSlots++;
      totalUtilization += evaluation.capacityUtilization;

      if (evaluation.intensity === 'optimal_open') openSlots++;
      else if (evaluation.intensity === 'low_demand') lowDemandSlots++;
      else if (evaluation.intensity === 'moderate_demand') moderateSlots++;
      else if (evaluation.intensity === 'peak_saturated') peakSlots++;
    }
  }

  // Hourly Historical Profile across hours 8 to 22
  const hourlyHistoricalProfile: HourlyHistoricalMetric[] = hours.map((hour) => {
    let hourSum = 0;
    for (let d = 0; d < 7; d++) {
      hourSum += matrix[d][hour] || 0;
    }
    const avgLoadPercentage = Math.min(100, Math.round((hourSum / Math.max(1, maxInAnySlot * 4)) * 100));
    return {
      hour,
      hourLabel: `${hour < 10 ? '0' + hour : hour}:00`,
      historicalCount: hourSum,
      avgLoadPercentage,
      isPeak: avgLoadPercentage >= 65,
      isOptimal: hourSum <= 2,
    };
  });

  // Day of Week Profile
  const dayOfWeekProfile: DayOfWeekMetric[] = DAY_NAMES.map((name, idx) => {
    let daySum = 0;
    let maxHour = 8;
    let maxHourCount = -1;

    for (const h of hours) {
      const count = matrix[idx][h] || 0;
      daySum += count;
      if (count > maxHourCount) {
        maxHourCount = count;
        maxHour = h;
      }
    }

    return {
      dayIndex: idx,
      dayName: name,
      totalHistoricalInterviews: daySum,
      peakHourLabel: `${maxHour < 10 ? '0' + maxHour : maxHour}:00 PKT`,
      utilizationRate: Math.min(100, Math.round((daySum / Math.max(1, maxInAnySlot * 5)) * 100)),
    };
  });

  // Determine overall busiest day & hour
  const busiestDayItem = [...dayOfWeekProfile].sort(
    (a, b) => b.totalHistoricalInterviews - a.totalHistoricalInterviews
  )[0];
  const busiestHourItem = [...hourlyHistoricalProfile].sort(
    (a, b) => b.historicalCount - a.historicalCount
  )[0];

  // Pick top recommended open windows (completely open + high team availability during business hours 10:00 - 18:00)
  const candidateRecommendations = slotEvaluations
    .filter((slot) => slot.isOpen && slot.hour >= 10 && slot.hour <= 18)
    .sort((a, b) => {
      // Prefer slots with good business hour timing and low congestion
      const aScore = (a.hour >= 11 && a.hour <= 16 ? 10 : 5) - a.historicalDensityPercentile * 0.05;
      const bScore = (b.hour >= 11 && b.hour <= 16 ? 10 : 5) - b.historicalDensityPercentile * 0.05;
      return bScore - aScore;
    })
    .slice(0, 4);

  const topRecommendedWindows: RecommendedWindow[] = candidateRecommendations.map((s) => {
    const d = new Date(s.slotIso);
    return {
      dayLabel: s.dayName,
      dateNumber: d.getDate(),
      hour: s.hour,
      hourLabel: s.hourLabel,
      openTracks: s.availableTracksCount,
      historicalRating: s.historicalDensityPercentile < 30 ? 'Low Team Congestion' : 'Proven High Show-Up Rate',
      reason: s.recommendationReason,
      suggestedIso: s.slotIso,
    };
  });

  return {
    totalSlotsEvaluated: totalSlots,
    openSlotsCount: openSlots,
    lowDemandCount: lowDemandSlots,
    moderateSlotsCount: moderateSlots,
    peakSlotsCount: peakSlots,
    averageCapacityUtilization: Math.round((totalUtilization / Math.max(1, totalSlots)) * 100),
    overallBusiestDay: busiestDayItem?.dayName || 'Wed',
    overallBusiestHour: busiestHourItem?.hourLabel ? `${busiestHourItem.hourLabel} PKT` : '15:00 PKT',
    topRecommendedWindows,
    hourlyHistoricalProfile,
    dayOfWeekProfile,
  };
}

/**
 * Returns color classes for each heatmap intensity level
 */
export function getHeatmapColorStyles(
  intensity: HeatmapIntensity,
  isOpen: boolean
): {
  cellBg: string;
  cellBorder: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  indicatorDot: string;
} {
  switch (intensity) {
    case 'peak_saturated':
      return {
        cellBg: 'bg-rose-500/10 dark:bg-rose-950/25',
        cellBorder: 'border-rose-400/40 dark:border-rose-800/60',
        badgeBg: 'bg-rose-100 dark:bg-rose-950/60',
        badgeText: 'text-rose-800 dark:text-rose-200',
        badgeBorder: 'border-rose-300 dark:border-rose-800',
        indicatorDot: 'bg-rose-500',
      };
    case 'moderate_demand':
      return {
        cellBg: 'bg-amber-500/10 dark:bg-amber-950/20',
        cellBorder: 'border-amber-300 dark:border-amber-800/60',
        badgeBg: 'bg-amber-100 dark:bg-amber-950/60',
        badgeText: 'text-amber-800 dark:text-amber-200',
        badgeBorder: 'border-amber-300 dark:border-amber-800',
        indicatorDot: 'bg-amber-500',
      };
    case 'low_demand':
      return {
        cellBg: 'bg-sky-500/5 dark:bg-sky-950/15',
        cellBorder: 'border-sky-300 dark:border-sky-800/50',
        badgeBg: 'bg-sky-100 dark:bg-sky-950/60',
        badgeText: 'text-sky-800 dark:text-sky-200',
        badgeBorder: 'border-sky-300 dark:border-sky-800',
        indicatorDot: 'bg-sky-500',
      };
    case 'optimal_open':
    default:
      return {
        cellBg: isOpen ? 'bg-emerald-500/5 dark:bg-emerald-950/15' : 'bg-stone-50/50 dark:bg-stone-800/20',
        cellBorder: isOpen ? 'border-emerald-300/60 dark:border-emerald-800/40' : 'border-stone-200 dark:border-stone-800',
        badgeBg: 'bg-emerald-100 dark:bg-emerald-950/60',
        badgeText: 'text-emerald-800 dark:text-emerald-200',
        badgeBorder: 'border-emerald-300 dark:border-emerald-800',
        indicatorDot: 'bg-emerald-500',
      };
  }
}
