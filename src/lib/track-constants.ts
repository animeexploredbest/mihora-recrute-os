export interface InterviewTrack {
  id: string;
  name: string;
  shortCode: string;
  panelName: string;
  color: 'blue' | 'purple' | 'emerald' | 'amber' | 'indigo' | 'rose';
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  badgeDarkBg: string;
  badgeDarkText: string;
  description: string;
  maxConcurrentSessions?: number;
}

export const DEFAULT_INTERVIEW_TRACKS: InterviewTrack[] = [
  {
    id: 'track-alpha',
    name: 'Track A (Engineering Alpha)',
    shortCode: 'Track A',
    panelName: 'Engineering Alpha',
    color: 'blue',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
    badgeBorder: 'border-blue-300',
    badgeText: 'text-blue-700',
    badgeDarkBg: 'dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60',
    badgeDarkText: 'dark:text-blue-300',
    description: 'Technical live-coding, system design & problem solving',
    maxConcurrentSessions: 1,
  },
  {
    id: 'track-beta',
    name: 'Track B (Engineering Beta)',
    shortCode: 'Track B',
    panelName: 'Engineering Beta',
    color: 'purple',
    badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
    badgeBorder: 'border-purple-300',
    badgeText: 'text-purple-700',
    badgeDarkBg: 'dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60',
    badgeDarkText: 'dark:text-purple-300',
    description: 'Deep-dive domain architecture & technical evaluation',
    maxConcurrentSessions: 1,
  },
  {
    id: 'track-hr',
    name: 'Track C (HR & Culture Fit)',
    shortCode: 'Track C',
    panelName: 'HR & Culture',
    color: 'emerald',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    badgeBorder: 'border-emerald-300',
    badgeText: 'text-emerald-700',
    badgeDarkBg: 'dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
    badgeDarkText: 'dark:text-emerald-300',
    description: 'Behavioral assessment, compensation & culture alignment',
    maxConcurrentSessions: 1,
  },
  {
    id: 'track-exec',
    name: 'Track D (Leadership & Stakeholder)',
    shortCode: 'Track D',
    panelName: 'Leadership Round',
    color: 'amber',
    badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
    badgeBorder: 'border-amber-300',
    badgeText: 'text-amber-800',
    badgeDarkBg: 'dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
    badgeDarkText: 'dark:text-amber-300',
    description: 'Executive interview, department head & final signoff',
    maxConcurrentSessions: 1,
  },
];

export function getTrackById(trackId?: string): InterviewTrack {
  if (!trackId) return DEFAULT_INTERVIEW_TRACKS[0];
  const found = DEFAULT_INTERVIEW_TRACKS.find((t) => t.id === trackId);
  return (
    found || {
      id: trackId,
      name: trackId,
      shortCode: trackId.toUpperCase(),
      panelName: 'Interview Track',
      color: 'indigo',
      badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      badgeBorder: 'border-indigo-300',
      badgeText: 'text-indigo-700',
      badgeDarkBg: 'dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/60',
      badgeDarkText: 'dark:text-indigo-300',
      description: 'Custom Interview Track',
      maxConcurrentSessions: 1,
    }
  );
}
