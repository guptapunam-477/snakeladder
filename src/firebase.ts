import { initializeApp } from "firebase/app";
import {
  initializeFirestore,
  type Firestore,
} from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

// ---------------------------------------------------------------------------
// Firebase initialization.
// All values come from Vite env vars (see .env.example). These are PUBLIC
// client keys — security comes from Firestore rules, not from hiding them.
// ---------------------------------------------------------------------------

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId
);

let db: Firestore;

if (isFirebaseConfigured) {
  const app = initializeApp(firebaseConfig);
  // ignoreUndefinedProperties avoids the classic
  // "Unsupported field value: undefined" error when we write optional fields.
  db = initializeFirestore(app, { ignoreUndefinedProperties: true });

  // Anonymous auth lets us write Firestore rules that require request.auth.
  const auth = getAuth(app);
  signInAnonymously(auth).catch((err) => {
    console.error("Anonymous sign-in failed:", err);
  });
} else {
  // Create a dummy so imports don't crash before the user adds their .env.
  // Any service call will throw a friendly error instead (see services).
  db = null as unknown as Firestore;
}

export { db };
