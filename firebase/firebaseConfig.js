import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyDSA6X9ABUxfV6yAJqgFia8jTCIz5RqSQI",
  authDomain: "orderhub-80679.firebaseapp.com",
  projectId: "orderhub-80679",
  storageBucket: "orderhub-80679.firebasestorage.app",
  messagingSenderId: "781904786326",
  appId: "1:781904786326:web:553b504bb87a49476fa3b7"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);

// ✅ Correct fix — try initializeAuth, fall back to getAuth if already done
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (e) {
  auth = getAuth(app);
}
export { auth };