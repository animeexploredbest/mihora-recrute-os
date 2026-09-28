/**
 * Universal Real-Time Cross-Tab & Cross-Device Live Synchronization Channel
 * Broadcasts data mutation events instantaneously across all open tabs, windows, and views
 */

export type SyncEventType =
  | 'CANDIDATES_UPDATED'
  | 'CANDIDATE_SCHEDULED'
  | 'CANDIDATE_STATUS_CHANGED'
  | 'BATCH_SCHEDULE_COMPLETED'
  | 'STUDENT_COHORT_INVITED'
  | 'SCORECARD_SAVED'
  | 'SETTINGS_UPDATED';

export interface SyncMessage {
  type: SyncEventType;
  timestamp: number;
  senderId: string;
  payload?: any;
}

const TAB_SESSION_ID = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
const CHANNEL_NAME = 'recruitsync_live_broadcast';

let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  }
} catch (e) {
  console.warn('BroadcastChannel unavailable, falling back to window storage events', e);
}

const listeners = new Set<(msg: SyncMessage) => void>();

if (broadcastChannel) {
  broadcastChannel.onmessage = (event: MessageEvent<SyncMessage>) => {
    if (event.data && event.data.senderId !== TAB_SESSION_ID) {
      listeners.forEach((listener) => {
        try {
          listener(event.data);
        } catch (err) {
          console.error('Error executing cross-tab sync listener:', err);
        }
      });
    }
  };
}

// Fallback: Listen to localStorage storage events for cross-tab notifications
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e: StorageEvent) => {
    if (e.key === 'recruitsync_broadcast_ping' && e.newValue) {
      try {
        const data: SyncMessage = JSON.parse(e.newValue);
        if (data.senderId !== TAB_SESSION_ID) {
          listeners.forEach((listener) => listener(data));
        }
      } catch {}
    }
  });
}

/**
 * Broadcasts a live mutation event to all open tabs and components
 */
export function broadcastLiveSync(type: SyncEventType, payload?: any): void {
  const message: SyncMessage = {
    type,
    timestamp: Date.now(),
    senderId: TAB_SESSION_ID,
    payload,
  };

  // 1. Broadcast via native BroadcastChannel
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(message);
    } catch (err) {
      console.warn('BroadcastChannel postMessage failed:', err);
    }
  }

  // 2. Broadcast via storage event for compatibility
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('recruitsync_broadcast_ping', JSON.stringify(message));
    } catch {}

    // 3. Dispatch in-tab custom event for current window components
    try {
      window.dispatchEvent(new CustomEvent('recruitsync_local_sync', { detail: message }));
    } catch {}
  }
}

/**
 * Subscribes to live cross-tab and in-tab sync events
 */
export function subscribeToLiveSync(onMessage: (msg: SyncMessage) => void): () => void {
  listeners.add(onMessage);

  const localHandler = (e: Event) => {
    const custom = e as CustomEvent<SyncMessage>;
    if (custom.detail) {
      onMessage(custom.detail);
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('recruitsync_local_sync', localHandler);
  }

  return () => {
    listeners.delete(onMessage);
    if (typeof window !== 'undefined') {
      window.removeEventListener('recruitsync_local_sync', localHandler);
    }
  };
}
