import { Candidate, CandidateActivity, UserSettings } from '../types';

export interface HerokuDbStatus {
  connected: boolean;
  engine: 'heroku-postgresql' | 'memory-fallback';
  databaseUrlConfigured: boolean;
  poolError?: string | null;
  tableCounts: {
    candidates: number;
    settings: number;
  };
  serverTime: string;
  herokuDyno?: string | null;
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('recruitsync_jwt_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Checks the status of the Heroku Postgres database connection
 */
export async function getHerokuDbStatus(): Promise<HerokuDbStatus> {
  try {
    const res = await fetch('/api/db/status');
    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }
    return await res.json();
  } catch (err: any) {
    return {
      connected: false,
      engine: 'memory-fallback',
      databaseUrlConfigured: false,
      poolError: err.message,
      tableCounts: { candidates: 0, settings: 0 },
      serverTime: new Date().toISOString(),
    };
  }
}

/**
 * Loads candidates from Heroku Postgres / Server database
 */
export async function getHerokuCandidates(userId?: string): Promise<Candidate[]> {
  const url = userId ? `/api/candidates?userId=${encodeURIComponent(userId)}` : '/api/candidates';
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) {
    throw new Error(`Failed to load candidates from Heroku: ${res.statusText}`);
  }
  return await res.json();
}

/**
 * Saves a candidate to Heroku Postgres
 */
export async function createHerokuCandidate(candidate: Candidate): Promise<Candidate> {
  const res = await fetch('/api/candidates', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(candidate),
  });
  if (!res.ok) {
    throw new Error(`Failed to create candidate on Heroku: ${res.statusText}`);
  }
  return await res.json();
}

/**
 * Updates a candidate on Heroku Postgres
 */
export async function updateHerokuCandidate(id: string, updates: Partial<Candidate>): Promise<Candidate> {
  const res = await fetch(`/api/candidates/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    throw new Error(`Failed to update candidate on Heroku: ${res.statusText}`);
  }
  return await res.json();
}

/**
 * Deletes a candidate from Heroku Postgres
 */
export async function deleteHerokuCandidate(id: string): Promise<boolean> {
  const res = await fetch(`/api/candidates/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Failed to delete candidate on Heroku: ${res.statusText}`);
  }
  const data = await res.json();
  return Boolean(data.success);
}

/**
 * Syncs / Migrates a list of candidates into Heroku Postgres in 1-click
 */
export async function syncCandidatesToHeroku(candidates: Candidate[]): Promise<{ count: number; dbStatus: HerokuDbStatus }> {
  const res = await fetch('/api/db/sync-from-client', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ candidates }),
  });
  if (!res.ok) {
    throw new Error(`Failed to sync candidates to Heroku: ${res.statusText}`);
  }
  return await res.json();
}

/**
 * Records activity on Heroku Postgres
 */
export async function addHerokuActivity(candidateId: string, activity: CandidateActivity): Promise<void> {
  await fetch(`/api/candidates/${encodeURIComponent(candidateId)}/activity`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(activity),
  });
}
