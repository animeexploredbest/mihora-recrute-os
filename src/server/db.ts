import { Pool, PoolConfig } from 'pg';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Candidate, CandidateActivity, UserSettings, AppUser } from '../types';

export interface DbUserRecord {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: 'admin' | 'lead_recruiter' | 'interviewer';
  avatar_url?: string;
  created_at: string;
  last_login_at?: string;
}

export const JWT_SECRET = process.env.JWT_SECRET || 'recruit-sync-production-jwt-token-2026-secret';

export interface DbStatusInfo {

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

let pool: Pool | null = null;
let isPostgresInitialized = false;

// Fallback in-memory store for environments where DATABASE_URL is not set yet
let fallbackCandidates: Map<string, Candidate> = new Map();
let fallbackSettings: Map<string, UserSettings> = new Map();
let fallbackUsers: Map<string, DbUserRecord> = new Map();

/**
 * Normalizes Postgres connection string and SSL requirements for Heroku
 */
export function getPostgresPool(): Pool | null {
  if (pool) return pool;

  const rawUrl = (process.env.DATABASE_URL || '').trim();
  if (!rawUrl) {
    return null;
  }

  // Heroku standard: convert postgres:// to postgresql://
  const connectionString = rawUrl.replace(/^postgres:\/\//, 'postgresql://');

  const poolConfig: PoolConfig = {
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };

  // Heroku Postgres requires rejectUnauthorized: false for self-signed certificates
  if (!connectionString.includes('localhost') && !connectionString.includes('127.0.0.1')) {
    poolConfig.ssl = {
      rejectUnauthorized: false,
    };
  }

  try {
    pool = new Pool(poolConfig);
    pool.on('error', (err) => {
      console.error('[Heroku Postgres Pool Error]:', err.message);
    });
    return pool;
  } catch (err: any) {
    console.error('[Heroku Postgres Init Error]:', err?.message);
    return null;
  }
}

/**
 * Initializes database schema on Heroku Postgres
 */
export async function initPostgresDatabase(): Promise<boolean> {
  const p = getPostgresPool();
  if (!p) {
    console.log('[Database] DATABASE_URL not set. Running with local memory/file fallback.');
    return false;
  }

  try {
    const client = await p.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS candidates (
          id VARCHAR(64) PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT,
          phone TEXT,
          location TEXT,
          country TEXT,
          city TEXT,
          timezone TEXT,
          timezone_label TEXT,
          position TEXT,
          status VARCHAR(32) DEFAULT 'Pending',
          hiring_round VARCHAR(64) DEFAULT 'Screening',
          original_availability TEXT,
          suggested_pkt_time TEXT,
          duration_minutes INT DEFAULT 45,
          meet_link TEXT,
          notes TEXT,
          resume_link TEXT,
          linkedin_url TEXT,
          github_url TEXT,
          portfolio_url TEXT,
          ai_summary TEXT,
          ai_skills TEXT,
          ai_rating TEXT,
          scorecard JSONB,
          activities JSONB,
          ai_questions JSONB,
          calendar_event_id TEXT,
          calendar_event_link TEXT,
          last_whatsapp_sent_at TEXT,
          last_reminder_sent_at TEXT,
          reminder_count INT DEFAULT 0,
          created_by_email TEXT,
          created_by_name TEXT,
          user_id TEXT,
          extra_data JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS user_settings (
          user_id VARCHAR(128) PRIMARY KEY,
          email_template TEXT,
          interviewer_emails TEXT,
          default_duration_minutes INT,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(128) PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          role VARCHAR(64) DEFAULT 'lead_recruiter',
          avatar_url TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          last_login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_candidates_user_id ON candidates(user_id);
        CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);
        CREATE INDEX IF NOT EXISTS idx_candidates_suggested_pkt_time ON candidates(suggested_pkt_time);
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(lower(email));
      `);
      isPostgresInitialized = true;
      console.log('[Heroku Postgres] Tables verified and ready.');
      return true;
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error('[Heroku Postgres Schema Init Failed]:', err?.message);
    return false;
  }
}

/**
 * Maps database row to Candidate interface
 */
function rowToCandidate(r: any): Candidate {
  return {
    id: r.id,
    name: r.name || '',
    email: r.email || '',
    phone: r.phone || '',
    location: r.location || '',
    country: r.country || undefined,
    city: r.city || undefined,
    timezone: r.timezone || undefined,
    timezoneLabel: r.timezone_label || undefined,
    localTimezone: r.timezone || undefined,
    position: r.position || '',
    status: r.status || 'Pending',
    hiringRound: r.hiring_round || 'Screening',
    originalAvailability: r.original_availability || '',
    suggestedPktTime: r.suggested_pkt_time || '',
    durationMinutes: r.duration_minutes ? Number(r.duration_minutes) : 45,
    meetLink: r.meet_link || undefined,
    notes: r.notes || '',
    resumeLink: r.resume_link || '',
    linkedinUrl: r.linkedin_url || undefined,
    githubUrl: r.github_url || undefined,
    portfolioUrl: r.portfolio_url || undefined,
    aiSummary: r.ai_summary || undefined,
    aiSkills: r.ai_skills || undefined,
    aiRating: r.ai_rating || undefined,
    scorecard: r.scorecard || undefined,
    activities: Array.isArray(r.activities) ? r.activities : [],
    aiQuestions: Array.isArray(r.ai_questions) ? r.ai_questions : undefined,
    calendarEventId: r.calendar_event_id || undefined,
    calendarEventLink: r.calendar_event_link || undefined,
    lastWhatsAppSentAt: r.last_whatsapp_sent_at || undefined,
    lastReminderSentAt: r.last_reminder_sent_at || undefined,
    reminderCount: r.reminder_count !== undefined ? Number(r.reminder_count) : 0,
    createdByEmail: r.created_by_email || undefined,
    createdByName: r.created_by_name || undefined,
    userId: r.user_id || undefined,
    ...(r.extra_data || {}),
  };
}

/**
 * Fetch all candidates
 */
export async function getDbCandidates(userId?: string): Promise<Candidate[]> {
  const p = getPostgresPool();
  if (p && isPostgresInitialized) {
    try {
      let queryStr = 'SELECT * FROM candidates';
      const params: any[] = [];
      if (userId) {
        queryStr += ' WHERE user_id = $1';
        params.push(userId);
      }
      queryStr += ' ORDER BY suggested_pkt_time ASC, created_at DESC';

      const res = await p.query(queryStr, params);
      return res.rows.map(rowToCandidate);
    } catch (err: any) {
      console.error('[Postgres getDbCandidates error]:', err.message);
    }
  }

  // Fallback to in-memory store
  const all = Array.from(fallbackCandidates.values());
  if (userId) {
    return all.filter((c) => !c.userId || c.userId === userId);
  }
  return all;
}

/**
 * Fetch single candidate
 */
export async function getDbCandidateById(id: string): Promise<Candidate | null> {
  const p = getPostgresPool();
  if (p && isPostgresInitialized) {
    try {
      const res = await p.query('SELECT * FROM candidates WHERE id = $1', [id]);
      if (res.rows.length > 0) {
        return rowToCandidate(res.rows[0]);
      }
      return null;
    } catch (err: any) {
      console.error('[Postgres getDbCandidateById error]:', err.message);
    }
  }

  return fallbackCandidates.get(id) || null;
}

/**
 * Insert new candidate
 */
export async function createDbCandidate(candidate: Candidate): Promise<Candidate> {
  const candidateId = candidate.id || `cand_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const savedCandidate: Candidate = { ...candidate, id: candidateId };

  const p = getPostgresPool();
  if (p && isPostgresInitialized) {
    try {
      await p.query(
        `INSERT INTO candidates (
          id, name, email, phone, location, country, city, timezone, timezone_label,
          position, status, hiring_round, original_availability, suggested_pkt_time,
          duration_minutes, meet_link, notes, resume_link, linkedin_url, github_url,
          portfolio_url, ai_summary, ai_skills, ai_rating, scorecard, activities,
          ai_questions, calendar_event_id, calendar_event_link, last_whatsapp_sent_at,
          last_reminder_sent_at, reminder_count, created_by_email, created_by_name, user_id,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9,
          $10, $11, $12, $13, $14,
          $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26,
          $27, $28, $29, $30,
          $31, $32, $33, $34, $35,
          NOW()
        )`,
        [
          savedCandidate.id,
          savedCandidate.name || '',
          savedCandidate.email || '',
          savedCandidate.phone || '',
          savedCandidate.location || '',
          savedCandidate.country || null,
          savedCandidate.city || null,
          savedCandidate.timezone || null,
          savedCandidate.timezoneLabel || null,
          savedCandidate.position || '',
          savedCandidate.status || 'Pending',
          savedCandidate.hiringRound || 'Screening',
          savedCandidate.originalAvailability || '',
          savedCandidate.suggestedPktTime || '',
          savedCandidate.durationMinutes || 45,
          savedCandidate.meetLink || null,
          savedCandidate.notes || '',
          savedCandidate.resumeLink || '',
          savedCandidate.linkedinUrl || null,
          savedCandidate.githubUrl || null,
          savedCandidate.portfolioUrl || null,
          savedCandidate.aiSummary || null,
          savedCandidate.aiSkills || null,
          savedCandidate.aiRating ? String(savedCandidate.aiRating) : null,
          savedCandidate.scorecard ? JSON.stringify(savedCandidate.scorecard) : null,
          JSON.stringify(savedCandidate.activities || []),
          savedCandidate.aiQuestions ? JSON.stringify(savedCandidate.aiQuestions) : null,
          savedCandidate.calendarEventId || null,
          savedCandidate.calendarEventLink || null,
          savedCandidate.lastWhatsAppSentAt || null,
          savedCandidate.lastReminderSentAt || null,
          savedCandidate.reminderCount || 0,
          savedCandidate.createdByEmail || null,
          savedCandidate.createdByName || null,
          savedCandidate.userId || null,
        ]
      );
      return savedCandidate;
    } catch (err: any) {
      console.error('[Postgres createDbCandidate error]:', err.message);
    }
  }

  fallbackCandidates.set(candidateId, savedCandidate);
  return savedCandidate;
}

/**
 * Update candidate
 */
export async function updateDbCandidate(id: string, updates: Partial<Candidate>): Promise<Candidate | null> {
  const p = getPostgresPool();
  if (p && isPostgresInitialized) {
    try {
      const existingRes = await p.query('SELECT * FROM candidates WHERE id = $1', [id]);
      if (existingRes.rows.length === 0) {
        return null;
      }

      const existing = rowToCandidate(existingRes.rows[0]);
      const merged: Candidate = { ...existing, ...updates, id };

      await p.query(
        `UPDATE candidates SET
          name = $2, email = $3, phone = $4, location = $5, country = $6, city = $7,
          timezone = $8, timezone_label = $9, position = $10, status = $11, hiring_round = $12,
          original_availability = $13, suggested_pkt_time = $14, duration_minutes = $15,
          meet_link = $16, notes = $17, resume_link = $18, linkedin_url = $19, github_url = $20,
          portfolio_url = $21, ai_summary = $22, ai_skills = $23, ai_rating = $24,
          scorecard = $25, activities = $26, ai_questions = $27, calendar_event_id = $28,
          calendar_event_link = $29, last_whatsapp_sent_at = $30, last_reminder_sent_at = $31,
          reminder_count = $32, updated_at = NOW()
        WHERE id = $1`,
        [
          id,
          merged.name || '',
          merged.email || '',
          merged.phone || '',
          merged.location || '',
          merged.country || null,
          merged.city || null,
          merged.timezone || null,
          merged.timezoneLabel || null,
          merged.position || '',
          merged.status || 'Pending',
          merged.hiringRound || 'Screening',
          merged.originalAvailability || '',
          merged.suggestedPktTime || '',
          merged.durationMinutes || 45,
          merged.meetLink || null,
          merged.notes || '',
          merged.resumeLink || '',
          merged.linkedinUrl || null,
          merged.githubUrl || null,
          merged.portfolioUrl || null,
          merged.aiSummary || null,
          merged.aiSkills || null,
          merged.aiRating ? String(merged.aiRating) : null,
          merged.scorecard ? JSON.stringify(merged.scorecard) : null,
          JSON.stringify(merged.activities || []),
          merged.aiQuestions ? JSON.stringify(merged.aiQuestions) : null,
          merged.calendarEventId || null,
          merged.calendarEventLink || null,
          merged.lastWhatsAppSentAt || null,
          merged.lastReminderSentAt || null,
          merged.reminderCount || 0,
        ]
      );
      return merged;
    } catch (err: any) {
      console.error('[Postgres updateDbCandidate error]:', err.message);
    }
  }

  const existing = fallbackCandidates.get(id);
  if (existing) {
    const updated = { ...existing, ...updates, id };
    fallbackCandidates.set(id, updated);
    return updated;
  }
  return null;
}

/**
 * Delete candidate
 */
export async function deleteDbCandidate(id: string): Promise<boolean> {
  const p = getPostgresPool();
  if (p && isPostgresInitialized) {
    try {
      await p.query('DELETE FROM candidates WHERE id = $1', [id]);
      return true;
    } catch (err: any) {
      console.error('[Postgres deleteDbCandidate error]:', err.message);
    }
  }

  return fallbackCandidates.delete(id);
}

/**
 * Bulk insert candidates
 */
export async function bulkInsertDbCandidates(candidates: Candidate[]): Promise<number> {
  let count = 0;
  for (const c of candidates) {
    await createDbCandidate(c);
    count++;
  }
  return count;
}

/**
 * Get User Settings
 */
export async function getDbUserSettings(userId: string): Promise<UserSettings | null> {
  const p = getPostgresPool();
  if (p && isPostgresInitialized) {
    try {
      const res = await p.query('SELECT * FROM user_settings WHERE user_id = $1', [userId]);
      if (res.rows.length > 0) {
        const row = res.rows[0];
        return {
          userId: row.user_id,
          emailTemplate: row.email_template,
          interviewerEmails: row.interviewer_emails,
          defaultDurationMinutes: row.default_duration_minutes ? Number(row.default_duration_minutes) : 45,
        };
      }
      return null;
    } catch (err: any) {
      console.error('[Postgres getDbUserSettings error]:', err.message);
    }
  }

  return fallbackSettings.get(userId) || null;
}

/**
 * Save User Settings
 */
export async function saveDbUserSettings(settings: UserSettings): Promise<UserSettings> {
  const p = getPostgresPool();
  if (p && isPostgresInitialized) {
    try {
      await p.query(
        `INSERT INTO user_settings (user_id, email_template, interviewer_emails, default_duration_minutes, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (user_id) DO UPDATE SET
          email_template = EXCLUDED.email_template,
          interviewer_emails = EXCLUDED.interviewer_emails,
          default_duration_minutes = EXCLUDED.default_duration_minutes,
          updated_at = NOW()`,
        [
          settings.userId,
          settings.emailTemplate,
          settings.interviewerEmails || null,
          settings.defaultDurationMinutes || 45,
        ]
      );
      return settings;
    } catch (err: any) {
      console.error('[Postgres saveDbUserSettings error]:', err.message);
    }
  }

  fallbackSettings.set(settings.userId, settings);
  return settings;
}

/**
 * Append an activity item to candidate
 */
export async function addDbCandidateActivity(candidateId: string, activity: CandidateActivity): Promise<void> {
  const cand = await getDbCandidateById(candidateId);
  if (!cand) return;

  const currentActivities = cand.activities || [];
  const updatedActivities = [activity, ...currentActivities];
  await updateDbCandidate(candidateId, { activities: updatedActivities });
}

/**
 * Status of the database connection (for health check and UI diagnostic badge)
 */
export async function getDbStatus(): Promise<DbStatusInfo> {
  const p = getPostgresPool();
  const rawUrl = (process.env.DATABASE_URL || '').trim();

  if (p) {
    try {
      const client = await p.connect();
      try {
        const candCount = await client.query('SELECT COUNT(*) FROM candidates');
        const settingsCount = await client.query('SELECT COUNT(*) FROM user_settings');

        return {
          connected: true,
          engine: 'heroku-postgresql',
          databaseUrlConfigured: true,
          poolError: null,
          tableCounts: {
            candidates: parseInt(candCount.rows[0].count, 10),
            settings: parseInt(settingsCount.rows[0].count, 10),
          },
          serverTime: new Date().toISOString(),
          herokuDyno: process.env.DYNO || null,
        };
      } finally {
        client.release();
      }
    } catch (err: any) {
      return {
        connected: false,
        engine: 'heroku-postgresql',
        databaseUrlConfigured: true,
        poolError: err.message,
        tableCounts: {
          candidates: fallbackCandidates.size,
          settings: fallbackSettings.size,
        },
        serverTime: new Date().toISOString(),
        herokuDyno: process.env.DYNO || null,
      };
    }
  }

  return {
    connected: true,
    engine: 'memory-fallback',
    databaseUrlConfigured: Boolean(rawUrl),
    tableCounts: {
      candidates: fallbackCandidates.size,
      settings: fallbackSettings.size,
    },
    serverTime: new Date().toISOString(),
    herokuDyno: process.env.DYNO || null,
  };
}

/**
 * Recruiter Registration (Postgres with Bcrypt password hash + JWT)
 */
export async function registerDbUser(params: {
  email: string;
  password: string;
  name: string;
  role?: 'admin' | 'lead_recruiter' | 'interviewer';
}): Promise<{ user: AppUser; token: string }> {
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanName = params.name.trim();
  const role = params.role || 'lead_recruiter';
  const now = new Date().toISOString();
  const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(params.password, salt);

  const p = getPostgresPool();
  if (p && isPostgresInitialized) {
    const existing = await p.query(
      'SELECT id FROM users WHERE lower(email) = lower($1) OR lower(name) = lower($2)',
      [cleanEmail, cleanName]
    );
    if (existing.rows.length > 0) {
      throw new Error('An account with this email address or username already exists.');
    }

    const res = await p.query(
      `INSERT INTO users (id, email, password_hash, name, role, created_at, last_login_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, name, role, avatar_url, created_at, last_login_at`,
      [userId, cleanEmail, passwordHash, cleanName, role, now, now]
    );

    const row = res.rows[0];
    const appUser: AppUser = {
      id: row.id,
      uid: row.id,
      email: row.email,
      name: row.name,
      displayName: row.name,
      role: row.role,
      avatar_url: row.avatar_url || undefined,
      photoURL: row.avatar_url || undefined,
      created_at: row.created_at,
      last_login_at: row.last_login_at,
      isAnonymous: false,
    };

    const token = jwt.sign(
      { id: appUser.id, email: appUser.email, name: appUser.name, role: appUser.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return { user: appUser, token };
  }

  // In-memory fallback
  for (const u of fallbackUsers.values()) {
    if (u.email.toLowerCase() === cleanEmail || u.name.toLowerCase() === cleanName.toLowerCase()) {
      throw new Error('An account with this email address or username already exists.');
    }
  }

  const newRecord: DbUserRecord = {
    id: userId,
    email: cleanEmail,
    password_hash: passwordHash,
    name: cleanName,
    role,
    created_at: now,
    last_login_at: now,
  };
  fallbackUsers.set(userId, newRecord);

  const appUser: AppUser = {
    id: newRecord.id,
    uid: newRecord.id,
    email: newRecord.email,
    name: newRecord.name,
    displayName: newRecord.name,
    role: newRecord.role,
    created_at: newRecord.created_at,
    last_login_at: newRecord.last_login_at,
    isAnonymous: false,
  };

  const token = jwt.sign(
    { id: appUser.id, email: appUser.email, name: appUser.name, role: appUser.role },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  return { user: appUser, token };
}

/**
 * Recruiter Login (Postgres verification against Bcrypt hash + JWT generation)
 * Supports logging in with either Email or Username
 */
export async function loginDbUser(params: {
  email?: string;
  username?: string;
  identifier?: string;
  password: string;
}): Promise<{ user: AppUser; token: string }> {
  const rawId = (params.identifier || params.username || params.email || '').trim().toLowerCase();
  const now = new Date().toISOString();

  const p = getPostgresPool();
  if (p && isPostgresInitialized) {
    const res = await p.query(
      'SELECT * FROM users WHERE lower(email) = lower($1) OR lower(name) = lower($1)',
      [rawId]
    );
    if (res.rows.length === 0) {
      throw new Error('No staff account found with this username or email. Please check credentials or contact an administrator.');
    }

    const row = res.rows[0];
    const match = await bcrypt.compare(params.password, row.password_hash);
    if (!match) {
      throw new Error('Incorrect password. Please verify your credentials.');
    }

    // Update last_login_at
    await p.query('UPDATE users SET last_login_at = $1 WHERE id = $2', [now, row.id]);

    const appUser: AppUser = {
      id: row.id,
      uid: row.id,
      email: row.email,
      name: row.name,
      displayName: row.name,
      role: row.role,
      avatar_url: row.avatar_url || undefined,
      photoURL: row.avatar_url || undefined,
      created_at: row.created_at,
      last_login_at: now,
      isAnonymous: false,
    };

    const token = jwt.sign(
      { id: appUser.id, email: appUser.email, name: appUser.name, role: appUser.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return { user: appUser, token };
  }

  // In-memory fallback
  let matched: DbUserRecord | null = null;
  for (const u of fallbackUsers.values()) {
    if (u.email.toLowerCase() === rawId || u.name.toLowerCase() === rawId) {
      matched = u;
      break;
    }
  }

  if (!matched) {
    throw new Error('No staff account found with this username or email. Please check credentials or contact an administrator.');
  }

  const match = await bcrypt.compare(params.password, matched.password_hash);
  if (!match) {
    throw new Error('Incorrect password. Please verify your credentials.');
  }

  matched.last_login_at = now;

  const appUser: AppUser = {
    id: matched.id,
    uid: matched.id,
    email: matched.email,
    name: matched.name,
    displayName: matched.name,
    role: matched.role,
    created_at: matched.created_at,
    last_login_at: matched.last_login_at,
    isAnonymous: false,
  };

  const token = jwt.sign(
    { id: appUser.id, email: appUser.email, name: appUser.name, role: appUser.role },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  return { user: appUser, token };
}

/**
 * Syncs or registers an authenticated session user (e.g. from Google OAuth or 1-Click Demo)
 * and generates a signed JWT token so all protected API endpoints work automatically.
 */
export async function syncSessionUser(params: {
  id?: string;
  email: string;
  name: string;
  avatar_url?: string;
  role?: 'admin' | 'lead_recruiter' | 'interviewer';
}): Promise<{ user: AppUser; token: string }> {
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanName = params.name.trim() || 'Recruiter';
  const role = params.role || 'lead_recruiter';
  const now = new Date().toISOString();
  const userId = params.id || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const p = getPostgresPool();
  if (p && isPostgresInitialized) {
    const existing = await p.query('SELECT * FROM users WHERE lower(email) = lower($1)', [cleanEmail]);
    let row: any;
    if (existing.rows.length > 0) {
      row = existing.rows[0];
      await p.query('UPDATE users SET last_login_at = $1, name = COALESCE($2, name) WHERE id = $3', [now, cleanName, row.id]);
    } else {
      const res = await p.query(
        `INSERT INTO users (id, email, password_hash, name, role, avatar_url, created_at, last_login_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, email, name, role, avatar_url, created_at, last_login_at`,
        [userId, cleanEmail, 'google_oauth_managed', cleanName, role, params.avatar_url || null, now, now]
      );
      row = res.rows[0];
    }

    const appUser: AppUser = {
      id: row.id,
      uid: row.id,
      email: row.email,
      name: row.name,
      displayName: row.name,
      role: row.role,
      avatar_url: row.avatar_url || undefined,
      photoURL: row.avatar_url || undefined,
      created_at: row.created_at,
      last_login_at: now,
      isAnonymous: false,
    };

    const token = jwt.sign(
      { id: appUser.id, email: appUser.email, name: appUser.name, role: appUser.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return { user: appUser, token };
  }

  // In-memory fallback
  let matched: DbUserRecord | null = null;
  for (const u of fallbackUsers.values()) {
    if (u.email.toLowerCase() === cleanEmail) {
      matched = u;
      break;
    }
  }

  if (matched) {
    matched.last_login_at = now;
    if (cleanName) matched.name = cleanName;
  } else {
    matched = {
      id: userId,
      email: cleanEmail,
      password_hash: 'oauth_session_managed',
      name: cleanName,
      role,
      avatar_url: params.avatar_url,
      created_at: now,
      last_login_at: now,
    };
    fallbackUsers.set(userId, matched);
  }

  const appUser: AppUser = {
    id: matched.id,
    uid: matched.id,
    email: matched.email,
    name: matched.name,
    displayName: matched.name,
    role: matched.role,
    avatar_url: matched.avatar_url,
    photoURL: matched.avatar_url,
    created_at: matched.created_at,
    last_login_at: matched.last_login_at,
    isAnonymous: false,
  };

  const token = jwt.sign(
    { id: appUser.id, email: appUser.email, name: appUser.name, role: appUser.role },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  return { user: appUser, token };
}

/**
 * Get User by ID
 */
export async function getDbUserById(id: string): Promise<AppUser | null> {
  const p = getPostgresPool();
  if (p && isPostgresInitialized) {
    const res = await p.query('SELECT id, email, name, role, avatar_url, created_at, last_login_at FROM users WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      uid: r.id,
      email: r.email,
      name: r.name,
      displayName: r.name,
      role: r.role,
      avatar_url: r.avatar_url || undefined,
      photoURL: r.avatar_url || undefined,
      created_at: r.created_at,
      last_login_at: r.last_login_at,
      isAnonymous: false,
    };
  }

  const mem = fallbackUsers.get(id);
  if (!mem) return null;
  return {
    id: mem.id,
    uid: mem.id,
    email: mem.email,
    name: mem.name,
    displayName: mem.name,
    role: mem.role,
    avatar_url: mem.avatar_url,
    photoURL: mem.avatar_url,
    created_at: mem.created_at,
    last_login_at: mem.last_login_at,
    isAnonymous: false,
  };
}

/**
 * Verify JWT Token
 */
export function verifyJwtToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/**
 * Fetch all registered staff users (for authorized logged-in team management)
 */
export async function getDbUsers(): Promise<AppUser[]> {
  const p = getPostgresPool();
  if (p && isPostgresInitialized) {
    try {
      const res = await p.query(
        'SELECT id, email, name, role, avatar_url, created_at, last_login_at FROM users ORDER BY created_at DESC'
      );
      return res.rows.map((r: any) => ({
        id: r.id,
        uid: r.id,
        email: r.email,
        name: r.name,
        displayName: r.name,
        role: r.role,
        avatar_url: r.avatar_url || undefined,
        photoURL: r.avatar_url || undefined,
        created_at: r.created_at,
        last_login_at: r.last_login_at,
        isAnonymous: false,
      }));
    } catch (err: any) {
      console.error('[Postgres getDbUsers error]:', err.message);
    }
  }

  return Array.from(fallbackUsers.values()).map((u) => ({
    id: u.id,
    uid: u.id,
    email: u.email,
    name: u.name,
    displayName: u.name,
    role: u.role,
    avatar_url: u.avatar_url,
    photoURL: u.avatar_url,
    created_at: u.created_at,
    last_login_at: u.last_login_at,
    isAnonymous: false,
  }));
}


