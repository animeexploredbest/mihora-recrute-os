import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from './firebase';
import { AppUser } from '../types';

export const HARD_BLOCKED_EMAILS = ['zainabfatima25.g@gmail.com'];

export const AUTHORIZED_GOOGLE_EMAILS = [
  'spideraneesf@gmail.com',
  'omema19022026@gmail.com',
  'm.mattiulhasnain@gmail.com',
  'mihora.tech@gmail.com',
];

export const isAuthorizedGoogleEmail = (email?: string | null): boolean => {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return AUTHORIZED_GOOGLE_EMAILS.some((authorized) => authorized.toLowerCase() === clean);
};

export const isEmailBlocked = (email?: string | null): boolean => {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return HARD_BLOCKED_EMAILS.some((b) => b.toLowerCase() === clean);
};

export const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/meetings.space.created',
  'https://www.googleapis.com/auth/meetings.space.readonly',
];

const PG_TOKEN_KEY = 'recruitsync_jwt_token';
const PG_USER_KEY = 'recruitsync_auth_user';
const GOOGLE_TOKEN_KEY = 'recruitsync_google_access_token';

let currentAuthUser: AppUser | null = null;
let cachedAccessToken: string | null = (() => {
  try {
    return typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(GOOGLE_TOKEN_KEY) : null;
  } catch {
    return null;
  }
})();
let isSigningIn = false;

const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
  try {
    if (typeof sessionStorage !== 'undefined') {
      if (token) {
        sessionStorage.setItem(GOOGLE_TOKEN_KEY, token);
      } else {
        sessionStorage.removeItem(GOOGLE_TOKEN_KEY);
      }
    }
  } catch {}
};

const authListeners: ((user: AppUser | null, token: string | null) => void)[] = [];

/**
 * Configure Google Auth Provider with Workspace Scopes
 */
function createGoogleProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  SCOPES.forEach((scope) => provider.addScope(scope));
  provider.setCustomParameters({
    prompt: 'consent',
    access_type: 'offline',
  });
  return provider;
}

/**
 * Recruiter Sign Up via Postgres Backend (JWT + Bcrypt)
 */
export const postgresRegister = async (params: {
  email: string;
  password: string;
  name: string;
  role?: 'admin' | 'lead_recruiter' | 'interviewer';
}): Promise<{ user: AppUser; token: string }> => {
  if (isEmailBlocked(params.email)) {
    throw new Error(`Access Denied: ${params.email} is permanently restricted from this system.`);
  }

  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to create recruiter account.');
  }

  localStorage.setItem(PG_TOKEN_KEY, data.token);
  localStorage.setItem(PG_USER_KEY, JSON.stringify(data.user));
  currentAuthUser = data.user;
  notifyListeners(data.user, cachedAccessToken);
  return data;
};

/**
 * Recruiter Login via Postgres Backend (JWT + Bcrypt)
 */
export const postgresLogin = async (params: {
  email?: string;
  username?: string;
  identifier?: string;
  password: string;
}): Promise<{ user: AppUser; token: string }> => {
  const targetId = params.identifier || params.username || params.email || '';
  if (isEmailBlocked(targetId)) {
    throw new Error(`Access Denied: This account is permanently restricted from this system.`);
  }

  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: targetId,
      email: targetId,
      password: params.password,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Invalid credentials. Please verify your username/email and password.');
  }

  localStorage.setItem(PG_TOKEN_KEY, data.token);
  localStorage.setItem(PG_USER_KEY, JSON.stringify(data.user));
  currentAuthUser = data.user;
  notifyListeners(data.user, cachedAccessToken);
  return data;
};

/**
 * Authenticates with Google OAuth and acquires real Google Calendar OAuth Access Token
 */
export const requestCalendarAccess = async (): Promise<string> => {
  try {
    isSigningIn = true;
    const provider = createGoogleProvider();
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    if (!credential?.accessToken) {
      throw new Error('Failed to acquire OAuth access token from Google.');
    }

    setCachedAccessToken(credential.accessToken);
    notifyListeners(currentAuthUser, cachedAccessToken);
    return cachedAccessToken;
  } catch (error: any) {
    console.error('[Google Calendar OAuth Error]:', error);
    throw new Error(error.message || 'Google Calendar authentication failed.');
  } finally {
    isSigningIn = false;
  }
};

/**
 * Connect or sign in via Google OAuth directly
 */
export const googleSignIn = async (): Promise<{ user: AppUser; accessToken: string }> => {
  try {
    isSigningIn = true;
    const provider = createGoogleProvider();
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (!credential?.accessToken) {
      throw new Error('Could not retrieve Google OAuth access token.');
    }

    const gUser = result.user;
    const cleanEmail = (gUser.email || '').trim().toLowerCase();

    if (isEmailBlocked(cleanEmail)) {
      await auth.signOut();
      throw new Error(`Access Denied: ${gUser.email} is permanently restricted from this system.`);
    }

    setCachedAccessToken(credential.accessToken);

    const isAdmin = isAuthorizedGoogleEmail(cleanEmail);
    const adminName =
      cleanEmail === 'spideraneesf@gmail.com'
        ? 'Anees (Admin)'
        : cleanEmail === 'omema19022026@gmail.com'
        ? 'Omema (Lead Recruiter)'
        : cleanEmail === 'm.mattiulhasnain@gmail.com'
        ? 'M. Matti-ul-Hasnain (Admin)'
        : cleanEmail === 'mihora.tech@gmail.com'
        ? 'Mihora Tech (Admin)'
        : gUser.displayName || (cleanEmail ? cleanEmail.split('@')[0] : 'Recruiter');

    const appUser: AppUser = {
      id: gUser.uid,
      uid: gUser.uid,
      email: cleanEmail,
      name: adminName,
      displayName: adminName,
      role: isAdmin ? 'admin' : 'lead_recruiter',
      photoURL: gUser.photoURL || undefined,
      avatar_url: gUser.photoURL || undefined,
      isAnonymous: false,
    };

    // Automatically obtain server-side JWT session token so all PostgreSQL/API endpoints are authenticated
    try {
      const res = await fetch('/api/auth/session-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: gUser.uid,
          email: cleanEmail,
          name: adminName,
          avatar_url: gUser.photoURL,
          role: 'admin',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.token) {
          localStorage.setItem(PG_TOKEN_KEY, data.token);
          localStorage.setItem(PG_USER_KEY, JSON.stringify(data.user || appUser));
        }
      }
    } catch (e) {
      console.warn('Auto session token sync note:', e);
    }

    currentAuthUser = appUser;
    notifyListeners(appUser, cachedAccessToken);
    return { user: appUser, accessToken: cachedAccessToken };
  } finally {
    isSigningIn = false;
  }
};

/**
 * Initialize and verify active Recruiter session via Firebase Auth or Postgres backend
 */
export const initAuth = (
  onAuthSuccess?: (user: AppUser, token: string | null) => void,
  onAuthFailure?: (errorMsg?: string) => void
) => {
  if (onAuthSuccess) {
    authListeners.push(onAuthSuccess);
  }

  // 1. Listen to real Firebase Auth state changes
  const unsubscribeFirebase = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
    if (firebaseUser) {
      const cleanEmail = (firebaseUser.email || '').trim().toLowerCase();
      if (isEmailBlocked(cleanEmail)) {
        await auth.signOut();
        logout();
        if (onAuthFailure) onAuthFailure('Access restricted for this account.');
        return;
      }

      const isAdmin = isAuthorizedGoogleEmail(cleanEmail);
      const adminName =
        cleanEmail === 'spideraneesf@gmail.com'
          ? 'Anees (Admin)'
          : cleanEmail === 'omema19022026@gmail.com'
          ? 'Omema (Lead Recruiter)'
          : cleanEmail === 'm.mattiulhasnain@gmail.com'
          ? 'M. Matti-ul-Hasnain (Admin)'
          : cleanEmail === 'mihora.tech@gmail.com'
          ? 'Mihora Tech (Admin)'
          : firebaseUser.displayName || (cleanEmail ? cleanEmail.split('@')[0] : 'Recruiter');

      const appUser: AppUser = {
        id: firebaseUser.uid,
        uid: firebaseUser.uid,
        email: cleanEmail,
        name: adminName,
        displayName: adminName,
        role: isAdmin ? 'admin' : 'lead_recruiter',
        photoURL: firebaseUser.photoURL || undefined,
        avatar_url: firebaseUser.photoURL || undefined,
        isAnonymous: false,
      };

      currentAuthUser = appUser;
      localStorage.setItem(PG_USER_KEY, JSON.stringify(appUser));

      // Auto-obtain server-side JWT session token if not already stored
      const existingToken = localStorage.getItem(PG_TOKEN_KEY);
      if (!existingToken) {
        try {
          const res = await fetch('/api/auth/session-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: firebaseUser.uid,
              email: cleanEmail,
              name: adminName,
              avatar_url: firebaseUser.photoURL,
              role: isAdmin ? 'admin' : 'lead_recruiter',
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data?.token) {
              localStorage.setItem(PG_TOKEN_KEY, data.token);
            }
          }
        } catch (e) {
          console.warn('Session token sync note:', e);
        }
      }

      notifyListeners(appUser, cachedAccessToken);
    } else {
      // 2. Check stored JWT / Postgres session if Firebase Auth is not active
      const token = localStorage.getItem(PG_TOKEN_KEY);
      const storedUserStr = localStorage.getItem(PG_USER_KEY);

      if (token) {
        fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.user) {
              if (isEmailBlocked(data.user.email)) {
                logout();
                if (onAuthFailure) onAuthFailure('Access restricted for this account.');
                return;
              }
              currentAuthUser = data.user;
              localStorage.setItem(PG_USER_KEY, JSON.stringify(data.user));
              if (onAuthSuccess) onAuthSuccess(data.user, cachedAccessToken);
            } else if (storedUserStr) {
              try {
                const cachedUser = JSON.parse(storedUserStr);
                currentAuthUser = cachedUser;
                if (onAuthSuccess) onAuthSuccess(cachedUser, cachedAccessToken);
              } catch {
                currentAuthUser = null;
                if (onAuthFailure) onAuthFailure();
              }
            } else {
              localStorage.removeItem(PG_TOKEN_KEY);
              localStorage.removeItem(PG_USER_KEY);
              currentAuthUser = null;
              if (onAuthFailure) onAuthFailure();
            }
          })
          .catch(() => {
            if (storedUserStr) {
              try {
                const cachedUser = JSON.parse(storedUserStr);
                currentAuthUser = cachedUser;
                if (onAuthSuccess) onAuthSuccess(cachedUser, cachedAccessToken);
                return;
              } catch {}
            }
            localStorage.removeItem(PG_TOKEN_KEY);
            localStorage.removeItem(PG_USER_KEY);
            currentAuthUser = null;
            if (onAuthFailure) onAuthFailure();
          });
      } else {
        currentAuthUser = null;
        if (onAuthFailure) onAuthFailure();
      }
    }
  });

  return () => {
    unsubscribeFirebase();
    if (onAuthSuccess) {
      const idx = authListeners.indexOf(onAuthSuccess);
      if (idx !== -1) authListeners.splice(idx, 1);
    }
  };
};

const notifyListeners = (user: AppUser | null, token: string | null) => {
  if (user) {
    authListeners.forEach((fn) => fn(user, token));
  }
};

export const logout = async () => {
  try {
    await auth.signOut();
  } catch {}
  localStorage.removeItem(PG_TOKEN_KEY);
  localStorage.removeItem(PG_USER_KEY);
  currentAuthUser = null;
  setCachedAccessToken(null);
  window.location.reload();
};

export const getCurrentUser = (): AppUser | null => currentAuthUser;

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const hasCalendarAccess = (): boolean => {
  return Boolean(cachedAccessToken);
};

export const clearCachedAccessToken = () => {
  setCachedAccessToken(null);
};

export const isCurrentlySigningIn = () => isSigningIn;

/**
 * Register a new staff user (only available to current logged-in authorized team members)
 */
export const registerStaffUser = async (params: {
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'lead_recruiter' | 'interviewer';
}): Promise<{ user: AppUser }> => {
  const token = localStorage.getItem(PG_TOKEN_KEY);
  const res = await fetch('/api/auth/register-staff', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to register staff user.');
  }
  return data;
};

/**
 * Fetch all registered staff members (for staff roster inside workspace)
 */
export const fetchStaffUsers = async (): Promise<AppUser[]> => {
  const token = localStorage.getItem(PG_TOKEN_KEY);
  const res = await fetch('/api/auth/staff-users', {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    throw new Error('Failed to load staff users.');
  }
  const data = await res.json();
  return data.users || [];
};
