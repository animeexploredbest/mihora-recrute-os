import { initializeApp } from 'firebase/app';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import config from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const FIRESTORE_DATABASE_ID =
  (config as any).firestoreDatabaseId || 'ai-studio-scheduler-68bd316d-580a-453b-a95a-b34881dcc4d1';

// Initialize with experimentalForceLongPolling to prevent WebSocket drops/hangs in sandboxed iframes
export const db = initializeFirestore(
  app,
  {
    experimentalForceLongPolling: true,
  },
  FIRESTORE_DATABASE_ID
);

export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error: any) {
    // If the server replies (even with permission-denied), connection to the database instance is alive
    if (error?.code === 'permission-denied') {
      return true;
    }
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline. Check network/config.');
    } else {
      console.log('Firestore connection verified with status:', error?.message || error);
    }
    return false;
  }
}
