import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut } from "firebase/auth";
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

export const signInWithGoogle = async () => {
  try {
    // 改用 signInWithRedirect 來解決彈出視窗在某些環境 (如 Github Pages) 秒關的問題
    await signInWithRedirect(auth, googleProvider);
  } catch (error) {
    console.error("Login failed:", error);
    alert(`登入失敗，請嘗試在新分頁中開啟應用程式。\n錯誤訊息：${error instanceof Error ? error.message : String(error)}`);
  }
};
export const logOut = () => signOut(auth);
