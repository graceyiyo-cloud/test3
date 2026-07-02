import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDZrfhFTCc0rdLrFoFQ_Pd29wmW0uz4If4",
  authDomain: "project-d8904b8a-1715-4363-9d7.firebaseapp.com",
  projectId: "project-d8904b8a-1715-4363-9d7",
  storageBucket: "project-d8904b8a-1715-4363-9d7.firebasestorage.app",
  messagingSenderId: "969183701633",
  appId: "1:969183701633:web:a71255a8ca047e7aae7b80",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore with the specific databaseId
export const db = getFirestore(app, "ai-studio-32aa47a8-0e63-408a-8fbb-30e15376d9e0");

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const signInWithGoogle = async () => {
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    console.error("Login failed:", error);
    alert(`登入失敗，請嘗試在新分頁中開啟應用程式。\n錯誤訊息：${error instanceof Error ? error.message : String(error)}`);
  }
};
export const logOut = () => signOut(auth);
