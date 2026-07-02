import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  "projectId": "project-d8904b8a-1715-4363-9d7",
  "appId": "1:969183701633:web:a71255a8ca047e7aae7b80",
  "apiKey": "AIzaSyDZrfhFTCc0rdLrFoFQ_Pd29wmW0uz4If4",
  "authDomain": "project-d8904b8a-1715-4363-9d7.firebaseapp.com",
  "storageBucket": "project-d8904b8a-1715-4363-9d7.firebasestorage.app",
  "messagingSenderId": "969183701633",
  "measurementId": ""
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logOut = () => signOut(auth);
