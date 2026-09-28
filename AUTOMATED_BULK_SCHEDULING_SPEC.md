# 🤖 Automated Intelligent Bulk Auto-Scheduling Engine
## Architectural Specification & Operational Blueprint

---

## 1. Executive Summary & Objective

The **Automated Intelligent Bulk Auto-Scheduling Engine** is an enterprise-grade automation system designed to eliminate manual interview booking overhead. Recruiters can input or select bulk candidates, specify scheduling constraints (date range, daily PKT operating hours, interview duration, buffer times, and available interviewer panels), and execute a 1-click intelligent allocation algorithm.

The engine allocates conflict-free slots across multi-track virtual rooms, balances interviewer workloads, respects international candidate timezones, automatically creates Google Meet links, dispatches Titan Mail/Google Workspace invitations, and live-syncs the entire state across all tabs in real-time.

---

## 2. Core Functional Workflow

```
[ Unscheduled / Bulk Candidate Pool ]
                │
                ▼
[ Recruiter Automation Configuration Drawer ]
  ├─ Date Range (e.g., Next 5 business days)
  ├─ Daily Time Window (e.g., 11:00 AM to 09:00 PM PKT)
  ├─ Slot Duration (e.g., 45m) + Buffer (e.g., 15m)
  ├─ Concurrent Tracks (Track Alpha, Beta, Gamma, Delta)
  ├─ Available Interviewer Panel Pool
  └─ Timezone Safeguard (Candidate waking hours: 9 AM - 8 PM local)
                │
                ▼
[ Intelligent Allocation & Conflict Resolver Matrix ]
  ├─ Checks existing scheduled slots in Firestore & Calendar
  ├─ Calculates candidate daylight / awake overlap
  ├─ Round-Robin interviewer workload balancing
  └─ Concurrent track slot capacity matching (up to 4 parallel)
                │
                ▼
[ Simulation & Preview Modal with Match Scores ]
  ├─ Candidate name, PKT slot, Local time, Assigned Track & Interviewer
  ├─ Visual Conflict & Overlap Verification
  └─ One-Click "Approve & Execute Batch Booking"
                │
                ▼
[ Batch Execution & Live Multi-Tab Sync ]
  ├─ Atomic Firestore Batch Updates
  ├─ Real-time broadcast to Kanban, Calendar, Directory, and 3D Globe
  ├─ Google Meet video conference creation
  └─ Automated Titan Mail / Gmail invitation dispatch
```

---

## 3. Configuration Parameters Schema

```typescript
interface AutoSchedulerConfig {
  // 1. Time Frame Parameters
  startDate: string;              // ISO Date (e.g., "2026-09-28")
  endDate: string;                // ISO Date (e.g., "2026-10-02")
  dailyStartTimePkt: string;      // "11:00" (PKT / UTC+5)
  dailyEndTimePkt: string;        // "21:00" (PKT / UTC+5)
  excludeWeekends: boolean;       // Skip Saturdays/Sundays or custom days
  
  // 2. Slot & Duration Rules
  durationMinutes: number;        // 30, 45, 60 minutes
  bufferMinutes: number;          // 0, 10, 15 minutes between slots
  
  // 3. Interviewer Pool & Load Balancing
  availableInterviewers: {
    email: string;
    name: string;
    maxInterviewsPerDay?: number; // e.g. Max 3 interviews per interviewer/day
  }[];
  assignmentStrategy: 'round-robin' | 'load-balanced' | 'track-dedicated';
  
  // 4. Multi-Track Virtual Rooms
  allowedTrackIds: string[];      // ['track-alpha', 'track-beta', 'track-gamma']
  maxConcurrentPerSlot: number;   // 1 to 4 parallel interviews
  
  // 5. Candidate Timezone Protection
  respectCandidateWakingHours: boolean; // True: ensure slot falls between 08:30 - 20:30 candidate local time
  
  // 6. Action Mode
  dispatchInvitesImmediately: boolean; // True: Send emails via Titan Mail / Calendar instantly
  draftModeOnly: boolean;               // True: Generate schedule without emailing
}
```

---

## 4. Intelligent Slot Allocation Algorithm

1. **Candidate Pool Sorting:**
   - Prioritize candidates by application date, status (`Pending` / `Rescheduled`), and timezone distance.
2. **Timeline Discretization:**
   - Divide each day within `[startDate, endDate]` into discrete intervals based on `durationMinutes + bufferMinutes` within `[dailyStartTimePkt, dailyEndTimePkt]`.
3. **Clash Elimination:**
   - Scan all pre-existing interviews across all tracks and mark already-occupied track slots as unavailable.
4. **Timezone Compatibility Scoring:**
   - For candidate $C_i$ with timezone $TZ_i$, convert slot $S_j$ to candidate local time.
   - If local time is outside 8:30 AM – 8:30 PM and `respectCandidateWakingHours` is enabled, penalize or defer to a daylight slot.
5. **Interviewer Workload Balancing:**
   - Interviewers are assigned using round-robin distribution with daily capacity caps to prevent fatigue.
6. **Concurrent Track Assignment:**
   - Assign candidate to available track (Track Alpha, Beta, Gamma, Delta). Up to $N$ concurrent interviews can run at the same timestamp without conflict.

---

## 5. Live Multi-Tab Synchronization & Zero Fake Data Integrity

- **Live Cross-Tab Broadcast:**
  - Changes are committed to Firestore via `writeBatch()` for atomic integrity.
  - Changes instantly broadcast via Web `BroadcastChannel` and Firestore `onSnapshot`.
  - Every open tab (Calendar View, Pipeline Kanban, Directory List, 3D Globe, and Database Status) updates synchronously in $<100\text{ms}$.
- **Zero Fake Data Guarantee:**
  - The engine strictly schedules **actual recruiter-created candidates** in the pipeline.
  - Zero mock or placeholder records are seeded.
- **Rollback & Audit Trail:**
  - Every batch schedule logs an atomic batch ID, allowing recruiters to review all slots or revert the batch in 1 click if needed.

---

## 6. Implementation Milestones

| Phase | Milestone | Description |
|---|---|---|
| **Phase 1** | **Allocation Engine & Matrix** | Algorithm in `src/lib/auto-scheduler.ts` with timezone evaluation, workload balancing, and clash avoidance. |
| **Phase 2** | **Interactive Automation Modal** | Clean UI drawer/modal in `src/components/AutoSchedulerModal.tsx` allowing recruiters to set date ranges, daily hours, track limits, and interviewer pools. |
| **Phase 3** | **Interactive Preview & Simulation** | Interactive table showing proposed candidate assignments, timezone comparison, conflict score, and 1-click execution. |
| **Phase 4** | **Batch Execution & Notification** | Atomic Firestore commit, real-time cross-tab broadcast, calendar sync, and Titan Mail notification triggers. |
