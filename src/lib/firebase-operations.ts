import {
  collection,
  doc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDoc,
  onSnapshot,
  Unsubscribe,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { Candidate, UserPresence, HiringRound, CandidateActivity } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface UserSettings {
  emailTemplate: string;
  userId: string;
  interviewerEmails?: string;
  defaultDurationMinutes?: number;
  maxConcurrentSlots?: number;
}

/**
 * Remove undefined values so Firestore does not reject the document payload
 */
function sanitizePayload<T extends Record<string, any>>(obj: T): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = value;
    }
  }
  return clean;
}

/**
 * Timeout wrapper to prevent UI hanging indefinitely when offline or delayed
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms = 20000,
  errorMsg = 'Database operation timed out. Please check your connection.'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMsg)), ms)
    ),
  ]);
}

/**
 * Real-time listener for candidates in the team recruitment pipeline.
 * If filterUserId is provided, filters by that user; otherwise loads all team candidates.
 */
export const subscribeCandidates = (
  onData: (candidates: Candidate[]) => void,
  onError?: (err: unknown) => void,
  filterUserId?: string
): Unsubscribe => {
  const path = 'candidates';
  const q = filterUserId
    ? query(collection(db, path), where('userId', '==', filterUserId))
    : query(collection(db, path));

  return onSnapshot(
    q,
    (snapshot) => {
      const candidates = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Candidate[];
      onData(candidates);
    },
    (error) => {
      console.error('Snapshot error for candidates:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
};

export const getCandidates = async (filterUserId?: string): Promise<Candidate[]> => {
  const path = 'candidates';
  try {
    const q = filterUserId
      ? query(collection(db, path), where('userId', '==', filterUserId))
      : query(collection(db, path));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Candidate[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};

export const addCandidate = async (candidate: Omit<Candidate, 'id'>): Promise<Candidate> => {
  const path = 'candidates';
  try {
    const currentAuthUser = auth.currentUser;
    const nowIso = new Date().toISOString();
    const initialActivity: CandidateActivity = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: 'created',
      timestamp: nowIso,
      details: 'Candidate added to recruitment pipeline',
      actor: candidate.createdByName || currentAuthUser?.displayName || 'Recruiter',
    };

    const cleanData = sanitizePayload({
      ...candidate,
      userId: candidate.userId || currentAuthUser?.uid || '',
      createdByEmail: candidate.createdByEmail || currentAuthUser?.email || '',
      createdByName: candidate.createdByName || currentAuthUser?.displayName || 'Recruiter',
      status: candidate.status || 'Pending',
      hiringRound: candidate.hiringRound || 'Screening',
      suggestedPktTime: candidate.suggestedPktTime || '',
      trackId: candidate.trackId || 'track-alpha',
      trackName: candidate.trackName || 'Track A (Engineering Alpha)',
      timezone: candidate.timezone || 'Asia/Karachi',
      timezoneLabel: candidate.timezoneLabel || 'PKT (UTC+5)',
      durationMinutes: candidate.durationMinutes || 45,
      activities: candidate.activities && candidate.activities.length > 0 ? candidate.activities : [initialActivity],
      originalAvailability: candidate.originalAvailability || '',
      location: candidate.location || '',
      country: candidate.country || '',
      city: candidate.city || '',
      phone: candidate.phone || '',
      notes: candidate.notes || '',
      resumeLink: candidate.resumeLink || '',
      linkedinUrl: candidate.linkedinUrl || '',
      githubUrl: candidate.githubUrl || '',
      portfolioUrl: candidate.portfolioUrl || '',
      meetLink: candidate.meetLink || '',
      calendarEventId: candidate.calendarEventId || '',
      calendarEventLink: candidate.calendarEventLink || '',
      aiSummary: candidate.aiSummary || '',
      aiSkills: candidate.aiSkills || '',
      aiRating: candidate.aiRating ? String(candidate.aiRating) : '',
      ...(Array.isArray(candidate.interviewerEmails) ? { interviewerEmails: candidate.interviewerEmails } : {}),
      ...(candidate.assignedInterviewer ? { assignedInterviewer: candidate.assignedInterviewer } : {}),
      ...(candidate.scheduledInterviewerId ? { scheduledInterviewerId: candidate.scheduledInterviewerId } : {}),
      ...(candidate.isConcurrentSlot !== undefined ? { isConcurrentSlot: candidate.isConcurrentSlot } : {}),
      ...(Array.isArray(candidate.aiQuestions) ? { aiQuestions: candidate.aiQuestions } : {}),
      ...(candidate.scorecard ? { scorecard: candidate.scorecard } : {}),
      ...(candidate.lastReminderSentAt ? { lastReminderSentAt: candidate.lastReminderSentAt } : {}),
      ...(candidate.lastWhatsAppSentAt ? { lastWhatsAppSentAt: candidate.lastWhatsAppSentAt } : {}),
      reminderCount: candidate.reminderCount || 0,
    });

    const docRef = await withTimeout(
      addDoc(collection(db, path), cleanData),
      20000,
      'Saving candidate timed out. Please check network connection.'
    );
    return { id: docRef.id, ...(cleanData as Omit<Candidate, 'id'>) };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateCandidate = async (id: string, data: Partial<Candidate>): Promise<void> => {
  const path = `candidates/${id}`;
  try {
    const cleanData = sanitizePayload(data);
    const docRef = doc(db, 'candidates', id);
    await withTimeout(
      updateDoc(docRef, cleanData),
      20000,
      'Updating candidate timed out. Please check network connection.'
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

/**
 * Helper to safely resolve existing activities from Firestore if not provided by the caller
 */
async function resolveExistingActivities(
  candidateId: string,
  provided?: CandidateActivity[]
): Promise<CandidateActivity[]> {
  if (provided && provided.length > 0) {
    return provided;
  }
  try {
    const docRef = doc(db, 'candidates', candidateId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as Candidate;
      return Array.isArray(data.activities) ? data.activities : [];
    }
  } catch (err) {
    console.warn('Could not read existing candidate activities for merge:', err);
  }
  return [];
}

/**
 * Appends a new activity item to the candidate's real-time audit trail and syncs to Firestore
 */
export const logCandidateActivity = async (
  candidateId: string,
  activity: Omit<CandidateActivity, 'id' | 'timestamp'> & { timestamp?: string },
  existingActivities?: CandidateActivity[]
): Promise<CandidateActivity> => {
  const currentList = await resolveExistingActivities(candidateId, existingActivities);
  const newActivity: CandidateActivity = {
    id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: activity.timestamp || new Date().toISOString(),
    type: activity.type,
    title: activity.title,
    details: activity.details,
    actor: activity.actor || auth.currentUser?.displayName || 'Recruiter',
  };

  const updatedActivities = [newActivity, ...currentList];
  await updateCandidate(candidateId, { activities: updatedActivities });
  return newActivity;
};

/**
 * Advances the candidate to the next hiring round and logs the activity in Firestore
 */
export const advanceCandidateRound = async (
  candidateId: string,
  nextRound: HiringRound,
  actorName?: string,
  note?: string,
  existingActivities?: CandidateActivity[]
): Promise<void> => {
  const currentList = await resolveExistingActivities(candidateId, existingActivities);
  const actor = actorName || auth.currentUser?.displayName || 'Recruiter';
  const newActivity: CandidateActivity = {
    id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    type: 'round_advanced',
    title: `Advanced to ${nextRound}`,
    details: note || `Candidate moved to ${nextRound} pipeline stage.`,
    actor,
  };

  await updateCandidate(candidateId, {
    hiringRound: nextRound,
    activities: [newActivity, ...currentList],
  });
};

/**
 * Records in Firestore that a reminder was dispatched for a candidate and logs an activity
 */
export const recordReminderSent = async (
  candidateId: string,
  currentCount = 0,
  existingActivities?: CandidateActivity[],
  notes = 'Follow-up interview reminder dispatched'
): Promise<string> => {
  const currentList = await resolveExistingActivities(candidateId, existingActivities);
  const timestamp = new Date().toISOString();
  const newActivity: CandidateActivity = {
    id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp,
    type: 'reminder_sent',
    details: notes,
    actor: auth.currentUser?.displayName || 'Titan Mail Automated Scheduler',
  };

  await updateCandidate(candidateId, {
    lastReminderSentAt: timestamp,
    reminderCount: (currentCount || 0) + 1,
    activities: [newActivity, ...currentList],
  });
  return timestamp;
};

/**
 * Records in Firestore that a WhatsApp invitation was dispatched for a candidate and logs an activity
 */
export const recordWhatsAppSent = async (
  candidateId: string,
  existingActivities?: CandidateActivity[],
  notes = 'Interview details sent via WhatsApp'
): Promise<string> => {
  const currentList = await resolveExistingActivities(candidateId, existingActivities);
  const timestamp = new Date().toISOString();
  const newActivity: CandidateActivity = {
    id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp,
    type: 'whatsapp_sent',
    details: notes,
    actor: auth.currentUser?.displayName || 'Recruiter',
  };

  await updateCandidate(candidateId, {
    lastWhatsAppSentAt: timestamp,
    activities: [newActivity, ...currentList],
  });
  return timestamp;
};

export const deleteCandidate = async (id: string): Promise<void> => {
  const path = `candidates/${id}`;
  try {
    const docRef = doc(db, 'candidates', id);
    await withTimeout(
      deleteDoc(docRef),
      12000,
      'Deleting candidate timed out. Please check network connection.'
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const getUserSettings = async (userId: string): Promise<UserSettings | null> => {
  const path = `userSettings/${userId}`;
  try {
    const docRef = doc(db, 'userSettings', userId);
    const docSnap = await withTimeout(
      getDoc(docRef),
      8000,
      'Loading settings timed out'
    );
    if (docSnap.exists()) {
      return docSnap.data() as UserSettings;
    }
    return null;
  } catch (error) {
    // If permissions or doc does not exist, return null rather than crashing
    console.warn('Could not fetch userSettings:', error);
    return null;
  }
};

export const updateUserSettings = async (
  userId: string,
  settings: Partial<UserSettings>
): Promise<void> => {
  const path = `userSettings/${userId}`;
  try {
    const docRef = doc(db, 'userSettings', userId);
    await setDoc(docRef, sanitizePayload({ ...settings, userId }), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

/**
 * Update current user's live presence heartbeat in Firestore
 */
export const updateUserPresence = async (
  user: { uid: string; email?: string | null; displayName?: string | null; photoURL?: string | null },
  status: 'online' | 'idle' | 'offline' = 'online',
  currentView: string = 'Pipeline Dashboard',
  activeCandidateName?: string
): Promise<void> => {
  if (!user || !user.uid) return;
  const path = `presence/${user.uid}`;
  try {
    const docRef = doc(db, 'presence', user.uid);
    const presenceData: UserPresence = {
      userId: user.uid,
      email: user.email || 'unknown@recruitsync.team',
      displayName: user.displayName || user.email?.split('@')[0] || 'Recruiter',
      photoURL: user.photoURL || undefined,
      lastActiveAt: new Date().toISOString(),
      status,
      currentView,
      activeCandidateName: activeCandidateName || undefined,
    };
    await setDoc(docRef, sanitizePayload(presenceData), { merge: true });
  } catch (error) {
    console.warn('Presence heartbeat update warning:', error);
  }
};

/**
 * Mark user as offline (called on logout or beforeunload)
 */
export const setUserOffline = async (userId: string): Promise<void> => {
  if (!userId) return;
  const path = `presence/${userId}`;
  try {
    const docRef = doc(db, 'presence', userId);
    await setDoc(docRef, { status: 'offline', lastActiveAt: new Date().toISOString() }, { merge: true });
  } catch (error) {
    console.warn('Set offline warning:', error);
  }
};

/**
 * Real-time subscription to live active users in the workspace
 */
export const subscribeLivePresence = (
  onData: (presences: UserPresence[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe => {
  const path = 'presence';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const now = Date.now();
      const list: UserPresence[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as UserPresence;
        const lastActiveTime = data.lastActiveAt ? new Date(data.lastActiveAt).getTime() : 0;
        const diffMs = now - lastActiveTime;
        const isFresh = diffMs < 3 * 60 * 1000; // within 3 minutes

        if (data.status !== 'offline' && isFresh) {
          list.push(data);
        }
      });
      // Sort by last active descending
      list.sort((a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime());
      onData(list);
    },
    (error) => {
      if (onError) onError(error);
      else console.error('Presence subscription error:', error);
    }
  );
};

/**
 * Atomically updates multiple candidate documents in Firestore via writeBatch
 */
export const batchUpdateCandidates = async (
  updates: { id: string; data: Partial<Candidate> }[]
): Promise<void> => {
  if (!updates || updates.length === 0) return;
  const path = 'candidates';
  try {
    const batch = writeBatch(db);
    for (const item of updates) {
      const docRef = doc(db, 'candidates', item.id);
      batch.update(docRef, sanitizePayload(item.data));
    }
    await withTimeout(batch.commit(), 30000, 'Batch candidate scheduling timed out.');
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

/**
 * Atomically deletes multiple candidate documents in Firestore via writeBatch
 */
export const batchDeleteCandidates = async (ids: string[]): Promise<void> => {
  if (!ids || ids.length === 0) return;
  const path = 'candidates';
  try {
    const batch = writeBatch(db);
    for (const id of ids) {
      const docRef = doc(db, 'candidates', id);
      batch.delete(docRef);
    }
    await withTimeout(batch.commit(), 25000, 'Batch candidate deletion timed out.');
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

/**
 * Atomically adds multiple candidates to Firestore in a single writeBatch
 */
export const batchAddCandidates = async (
  candidates: Omit<Candidate, 'id'>[]
): Promise<Candidate[]> => {
  if (!candidates || candidates.length === 0) return [];
  const path = 'candidates';
  try {
    const batch = writeBatch(db);
    const addedList: Candidate[] = [];
    const actor = auth.currentUser?.displayName || 'Recruiter (AI Bulk Intake)';
    const timestamp = new Date().toISOString();

    for (const c of candidates) {
      const colRef = collection(db, path);
      const newDocRef = doc(colRef);
      const initialActivity: CandidateActivity = {
        id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp,
        type: 'created',
        title: 'Candidate Ingested via AI Bulk Engine',
        details: (c as any).assignedInterviewer
          ? `Candidate profile extracted from AI prompt output. Assigned to interviewer: ${(c as any).assignedInterviewer}`
          : 'Candidate profile extracted from AI prompt output.',
        actor,
      };

      const cleanData = sanitizePayload({
        ...c,
        status: c.status || 'Pending',
        hiringRound: c.hiringRound || 'Screening',
        activities: c.activities || [initialActivity],
        reminderCount: c.reminderCount || 0,
      });

      batch.set(newDocRef, cleanData);
      addedList.push({ id: newDocRef.id, ...(cleanData as Omit<Candidate, 'id'>) });
    }

    await withTimeout(batch.commit(), 35000, 'Batch adding candidates timed out.');
    return addedList;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

/**
 * Staff Member / Interviewer Profile Firestore Operations
 */
export interface StaffMemberDoc {
  id: string;
  name: string;
  email: string;
  role: string;
  seniority: 'Lead' | 'Senior' | 'Mid' | 'HR';
  skills: string[];
  avatarGradient?: string;
  enabled: boolean;
  dailyMaxCapacity: number;
  batchTargetQuota: number;
  weight: number;
  updatedAt?: string;
}

export const subscribeStaffMembers = (
  onData: (staff: StaffMemberDoc[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe => {
  const path = 'staffMembers';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const staff: StaffMemberDoc[] = [];
      snapshot.forEach((docSnap) => {
        staff.push({ id: docSnap.id, ...(docSnap.data() as Omit<StaffMemberDoc, 'id'>) });
      });
      onData(staff);
    },
    (error) => {
      console.warn('Snapshot warning for staffMembers:', error);
      if (onError) onError(error);
    }
  );
};

export const saveStaffMemberToFirestore = async (
  staff: StaffMemberDoc
): Promise<void> => {
  const docId = staff.email.toLowerCase().replace(/[^a-z0-9_.-]/g, '_');
  const path = `staffMembers/${docId}`;
  try {
    const docRef = doc(db, 'staffMembers', docId);
    await setDoc(docRef, sanitizePayload({ ...staff, id: docId, updatedAt: new Date().toISOString() }), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const deleteStaffMemberFromFirestore = async (
  email: string
): Promise<void> => {
  const docId = email.toLowerCase().replace(/[^a-z0-9_.-]/g, '_');
  const path = `staffMembers/${docId}`;
  try {
    const docRef = doc(db, 'staffMembers', docId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

