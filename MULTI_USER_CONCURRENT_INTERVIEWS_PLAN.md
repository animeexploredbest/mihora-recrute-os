# 🚀 Multi-User Concurrent Interview System — Architecture & Implementation Plan

> **Plan Reference Document**  
> **Status:** Approved for Implementation  
> **Target App:** RecruitSync (Smart Candidate Interview Scheduler & Pipeline)  
> **Core Objective:** Enable multiple recruiters/interviewers to conduct concurrent interviews within the exact same time slot across isolated tracks/rooms, synchronized live across all clients via Firebase Firestore.

---

## 📌 Executive Summary

### The Challenge (Single-Track Bottleneck)
In conventional single-track scheduling:
* When one candidate is scheduled for **Monday, 4:00 PM PKT**, any subsequent candidate scheduled for that same slot triggers a global "Double-Booking Conflict".
* High-volume hiring and multi-department teams (e.g., Frontend, Backend, Product, HR) cannot utilize the same hourly slot even if different interviewers are available.

### The Solution (Multi-Track Concurrent System)
With the **Multi-User Concurrent Interview Engine**:
1. **Simultaneous Slots**: Multiple interviews can occur at the exact same hour (e.g., 4 candidates simultaneously at 4:00 PM PKT) as long as different interviewers or interview rooms/tracks are assigned.
2. **Granular Conflict Detection**:
   * ❌ **Hard Conflict (Blocked)**: The *same interviewer* is assigned to two interviews at overlapping times.
   * ❌ **Room Conflict (Blocked)**: The *same virtual room / track* has reached its maximum parallel session limit.
   * ✅ **Allowed Parallel Track (Approved)**: Interviewer A evaluates Candidate 1 in *Track 1 (Engineering)*, while Interviewer B evaluates Candidate 2 in *Track 2 (Design)* at the same time.
3. **Instant Real-Time Sync**: Changes to slots, room assignments, and interviewer capacity broadcast immediately across all recruiters' browser windows via Firebase Firestore snapshot listeners (`onSnapshot`).

---

## 🏗️ 1. Architecture & Data Model

### 1.1 Extended TypeScript Interfaces (`src/types.ts`)

```typescript
// Interview Track / Virtual Room Definition
export interface InterviewTrack {
  id: string;                      // e.g., 'track-eng-1', 'track-hr-1'
  name: string;                    // e.g., 'Engineering Panel A', 'HR Screening Room'
  color: string;                   // Visual badge color (hex / tailwind class)
  maxConcurrentSessions: number;   // Max simultaneous interviews allowed in this track (default: 1)
  defaultInterviewerEmails: string[];
}

// Updated Candidate Interface Additions
export interface Candidate {
  // Existing fields...
  id: string;
  name: string;
  role: string;
  status: CandidateStatus;
  suggestedPktTime?: string;
  durationMinutes?: number;
  interviewerEmail?: string;
  interviewerEmails?: string[];

  // 🆕 Multi-Track & Concurrent Fields:
  trackId?: string;                // ID of the allocated track / room
  trackName?: string;              // Name for instant display
  scheduledInterviewerId?: string; // Specific interviewer handling this session
  isConcurrentSlot?: boolean;      // Flag indicating parallel execution in this slot
}

// Slot Occupancy Status for Dynamic UI Feedback
export interface SlotOccupancyInfo {
  timeIso: string;
  totalConcurrentAllowed: number;  // Team-wide capacity ceiling (e.g., 4)
  currentlyScheduledCount: number; // Number of active interviews in this slot
  availableTracks: InterviewTrack[];
  occupiedInterviewerEmails: string[];
  hasInterviewerConflict: boolean;
  conflictingCandidateNames: string[];
}
```

### 1.2 Firestore Schema Extensions

```json
{
  "candidates": {
    "$candidateId": {
      "suggestedPktTime": "2026-09-28T11:00:00.000Z",
      "durationMinutes": 45,
      "trackId": "track-eng-1",
      "trackName": "Engineering Room A",
      "interviewerEmails": ["lead.dev@mihora.tech"],
      "updatedAt": "2026-09-26T05:50:00.000Z"
    }
  },
  "settings": {
    "recruiter_defaults": {
      "maxConcurrentGlobalSlots": 4,
      "activeTracks": [
        { "id": "track-eng-1", "name": "Technical Panel A", "color": "blue", "maxConcurrentSessions": 1 },
        { "id": "track-eng-2", "name": "Technical Panel B", "color": "purple", "maxConcurrentSessions": 1 },
        { "id": "track-hr-1", "name": "HR & Culture Screen", "color": "emerald", "maxConcurrentSessions": 2 }
      ]
    }
  }
}
```

---

## ⚡ 2. Real-Time Synchronization Engine

### Real-Time Flow Across Multiple Recruiters
```
[Recruiter 1 in Browser A] 
       │ 
       ├─► Schedules Candidate 1 for 4:00 PM (Track: Technical Panel A, Interviewer: Alice)
       │
       ▼
 [Firestore Document Update]
       │
       ├─► Real-time push via onSnapshot() to all active sessions
       │
       ▼
[Recruiter 2 in Browser B]
       │
       ├─► Calendar & Pipeline Board instantaneously update without page reload
       ├─► 4:00 PM Slot reflects: "1/4 Parallel Slots Occupied" (Alice busy, Bob free)
       └─► Recruiter 2 schedules Candidate 2 for 4:00 PM (Track: HR Screen, Interviewer: Bob) -> Allowed!
```

1. **Zero Simulation**: All updates persist directly to Firebase Firestore (`ai-studio-scheduler-68bd316d-580a-453b-a95a-b34881dcc4d1`).
2. **Snapshot Propagation**: When any coordinator updates an interview time or assigns a track, `onSnapshot` listeners in `src/lib/firebase-operations.ts` immediately dispatch reactive state updates to `App.tsx`.
3. **Optimistic Locking & Race-Condition Guard**: If two recruiters attempt to book the exact same interviewer for the same second, the conflict evaluator intercepts and notifies the user with real-time feedback.

---

## 🧠 3. Intelligent Multi-Track Conflict Detector (`src/lib/conflict-detector.ts`)

The conflict detector transitions from a naive 1:1 time overlap to an intelligent multi-dimensional evaluation matrix:

```typescript
export interface MultiTrackConflictResult {
  hasHardConflict: boolean;         // Cannot proceed: same interviewer double-booked
  hasTrackConflict: boolean;        // Cannot proceed: room is over capacity
  isParallelAllowed: boolean;       // Same time, but distinct interviewer & room -> ALLOWED
  currentSlotOccupancy: number;     // e.g., 2
  maxSlotCapacity: number;          // e.g., 4
  busyInterviewers: string[];
  conflictingCandidate?: Candidate;
  conflictReason?: string;
}

export function evaluateMultiTrackConflict(
  proposedTimeIso: string,
  durationMinutes: number,
  proposedInterviewerEmails: string[],
  proposedTrackId: string | undefined,
  allCandidates: Candidate[],
  excludeCandidateId?: string,
  maxGlobalParallelCapacity: number = 4
): MultiTrackConflictResult {
  // 1. Filter active interviews overlapping the proposed time window
  // 2. Check for personal interviewer collision (Intersection of emails)
  // 3. Check for track collision (Same trackId occupied)
  // 4. Check global capacity ceiling (currentlyScheduledCount < maxGlobalParallelCapacity)
}
```

---

## 🖥️ 4. UI / UX Design & Components

### 4.1 Schedule & Reschedule Modal (`ScheduleModal.tsx`)
1. **Track / Room Selection Dropdown**:
   * Interactive dropdown displaying available rooms:
     * 🟢 *Technical Panel A (Available)*
     * 🟢 *HR & Culture Screen (Available)*
     * 🔴 *Technical Panel B (Busy at selected time)*
2. **Live Capacity Gauge**:
   * Visual meter: `[■■□□] 2 of 4 concurrent sessions scheduled for this time`.
3. **Interviewer Availability Indicator**:
   * Green badge when the selected interviewer is available.
   * Red badge + warning banner if the interviewer is already hosting an interview with another candidate at this exact time.
4. **Smart Slot Recommendation**:
   * Suggests alternative parallel tracks if the desired room is occupied, or the next available parallel time.

### 4.2 Calendar & Pipeline Views (`App.tsx`, `CandidateCard.tsx`)
1. **Multi-Track Badge on Cards**:
   * Distinct badges on candidate cards indicating assigned room/track (e.g., `Room: Tech A`, `Room: HR 1`).
2. **Calendar Time Column with Parallel Stacking**:
   * Shows concurrent interviews side-by-side or stacked cleanly within the same hourly slot with clear interviewer initials and track color codes.
3. **Real-Time Recruiter Presence Banner**:
   * Live presence bar highlighting which recruiters are currently scheduling or reviewing candidates.

---

## 📅 5. Step-by-Step Implementation Roadmap

| Phase | Task | Files Modified / Created | Details |
|---|---|---|---|
| **Phase 1** | **Data Model & Conflict Logic** | `src/types.ts`<br>`src/lib/conflict-detector.ts` | Add `InterviewTrack`, multi-track capacity rules, and non-overlapping interviewer validation logic. |
| **Phase 2** | **Settings & Track Management** | `src/components/SettingsModal.tsx`<br>`src/lib/firebase-operations.ts` | Allow recruiters to define custom interview tracks/rooms and set max concurrent capacity per time slot. |
| **Phase 3** | **Schedule Modal Live Capacity UI** | `src/components/ScheduleModal.tsx` | Integrate Room/Track picker, Live Capacity Bar, and dynamic interviewer conflict warnings. |
| **Phase 4** | **Calendar & Pipeline View Synchronization** | `src/App.tsx`<br>`src/components/CandidateCard.tsx` | Display parallel interview stacks, track badges, and real-time Firestore listeners. |
| **Phase 5** | **Google Calendar & Meet Multi-Track Sync** | `src/lib/google-api.ts` | Pass assigned track/room details into Google Calendar event description and location. |
| **Phase 6** | **Full System Verification & QA** | E2E Testing Suite | Verify multi-window real-time updates, concurrent bookings, and zero simulation data. |

---

## 🛡️ 6. Zero Simulation & Reliability Guarantees

* **No Mock Data**: Every schedule, candidate update, and track assignment is written to and read from live Firestore.
* **Instant Cross-Device Sync**: Any change made by Recruiter 1 immediately triggers an `onSnapshot` update on Recruiter 2's device within milliseconds.
* **Backward Compatibility**: Existing candidate records without a `trackId` gracefully default to "General Track", ensuring existing pipeline data remains fully intact and functional.

---

*Document created and ready for implementation.*
