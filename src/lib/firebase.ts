import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, OAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAzaKWF0bVJtRx0t2m-gUo1tstp1qrbVwg",
  authDomain: "snapix-aa00a.firebaseapp.com",
  projectId: "snapix-aa00a",
  storageBucket: "snapix-aa00a.firebasestorage.app",
  messagingSenderId: "553006307389",
  appId: "1:553006307389:web:f347502881d77287793254",
  measurementId: "G-71GY07F1SL",
};

import { getStorage } from "firebase/storage";

// Initialize Firebase for SSR (Server Side Rendering) safety
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();
const appleProvider = new OAuthProvider("apple.com");

export { app, db, auth, storage, googleProvider, appleProvider };
