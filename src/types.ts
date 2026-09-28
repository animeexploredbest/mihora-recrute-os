export type HiringRound =
  | 'Screening'
  | 'Technical Round 1'
  | 'Technical Round 2'
  | 'Management / HR'
  | 'Final Offer';

export interface InterviewTrack {
  id: string;                      // e.g., 'track-alpha', 'track-beta', 'track-hr', 'track-exec'
  name: string;                    // e.g., 'Track A (Engineering Alpha)', 'Track C (HR & Culture Fit)'
  shortCode?: string;              // e.g., 'Track A'
  panelName?: string;              // e.g., 'Engineering Alpha'
  color: string;                   // Visual badge color
  badgeBg?: string;
  badgeBorder?: string;
  badgeText?: string;
  badgeDarkBg?: string;
  badgeDarkText?: string;
  description: string;
  maxConcurrentSessions?: number;  // Max simultaneous interviews allowed in this track (default: 1)
  defaultInterviewerEmails?: string[];
}

export interface CandidateActivity {
  id: string;
  type:
    | 'created'
    | 'status_change'
    | 'scheduled'
    | 'rescheduled'
    | 'email_sent'
    | 'reminder_sent'
    | 'scorecard_added'
    | 'round_advanced'
    | 'self_booked'
    | 'whatsapp_sent'
    | 'note_added';
  timestamp: string; // ISO 8601
  title?: string;
  details: string;
  actor?: string;
}

export interface InterviewScorecard {
  technicalRating: number; // 1-5
  communicationRating: number; // 1-5
  problemSolvingRating: number; // 1-5
  overallRating: number; // 1-5
  recommendation: 'Strong Hire' | 'Hire' | 'On Hold' | 'Reject';
  interviewerNotes: string;
  evaluatedAt?: string;
  evaluatedBy?: string;
}

export interface Candidate {
  id?: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  country?: string;
  city?: string;
  timezone?: string; // IANA timezone, e.g. "America/New_York", "Asia/Karachi"
  timezoneLabel?: string; // Display label, e.g. "EDT (UTC-4)"
  localTimezone?: string; // Backwards-compatible alias
  originalAvailability: string;
  suggestedPktTime: string;
  durationMinutes?: number;
  position?: string;
  status: 'Pending' | 'Scheduled' | 'Rescheduled' | 'Interviewed' | 'Selected' | 'Rejected';
  hiringRound?: HiringRound;
  activities?: CandidateActivity[];
  notes: string;
  resumeLink: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  userId?: string;
  meetLink?: string;
  calendarEventId?: string;
  calendarEventLink?: string;
  aiSummary?: string;
  aiSkills?: string;
  aiRating?: string | number;
  scorecard?: InterviewScorecard;
  aiQuestions?: string[];
  lastWhatsAppSentAt?: string;
  lastReminderSentAt?: string;
  reminderCount?: number;
  createdByEmail?: string;
  createdByName?: string;
  // Multi-System Concurrent Interview Fields (Architecture Plan)
  trackId?: string; // ID of the allocated track (e.g. 'track-alpha', 'track-beta', 'track-hr')
  trackName?: string; // Display name of track (e.g. 'Track A (Engineering Alpha)')
  interviewerEmails?: string[]; // Array of assigned interviewers for this candidate
  assignedInterviewer?: string; // Primary interviewer
  scheduledInterviewerId?: string; // Specific interviewer handling this session
  isConcurrentSlot?: boolean; // Flag indicating parallel execution in this slot
}

export interface UserPresence {
  userId: string;
  email: string;
  displayName: string;
  photoURL?: string;
  lastActiveAt: string; // ISO string
  status: 'online' | 'idle' | 'offline';
  currentView?: string;
  activeCandidateName?: string;
}

export interface UserSettings {
  userId?: string;
  emailTemplate?: string;
  interviewerEmails?: string;
  defaultDurationMinutes?: number;
  maxConcurrentSlots?: number; // Maximum parallel interviews allowed per slot (default: 4)
}

export interface SlotOccupancyInfo {
  timeIso: string;
  totalConcurrentAllowed: number;
  currentlyScheduledCount: number;
  occupiedTracks: { trackId: string; trackName: string; candidateName: string }[];
  occupiedInterviewerEmails: string[];
  hasInterviewerConflict: boolean;
  hasTrackConflict: boolean;
  isSlotFull: boolean;
}

export interface AppUser {
  id: string;
  uid: string; // for backwards compatibility
  email: string;
  name: string;
  displayName: string; // for backwards compatibility
  role: 'admin' | 'lead_recruiter' | 'interviewer';
  avatar_url?: string;
  photoURL?: string; // for backwards compatibility
  created_at?: string;
  last_login_at?: string;
  isAnonymous?: boolean;
}

