// src/shared/api/firebaseClient.js
import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyCkFMWrjy7brDgmZ0PCbDZ0z_ADsojYP7M',
  authDomain: 'the-road-goes-ever-on.firebaseapp.com',
  projectId: 'the-road-goes-ever-on',
  storageBucket: 'the-road-goes-ever-on.firebasestorage.app',
  messagingSenderId: '388609011240',
  appId: '1:388609011240:web:aa4ad1fa1ae933343a8f1d',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Firestore — guard against double-init on Fast Refresh
let db;
try {
  db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
} catch {
  db = getFirestore(app);
}

// Auth — guard against double-init on Fast Refresh
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  auth = getAuth(app);
}

const storage = getStorage(app);

export { app, auth, db, storage };