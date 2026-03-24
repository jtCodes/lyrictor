import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
} from "firebase/auth";
import { auth, googleProvider } from "../api/firebase";
import { isDesktopApp } from "../runtime";

export async function signInWithGoogle() {
  if (!isDesktopApp) {
    await signInWithPopup(auth, googleProvider);
    return;
  }

  const clientId = import.meta.env.VITE_GOOGLE_DESKTOP_CLIENT_ID;

  if (!clientId) {
    throw new Error("Missing VITE_GOOGLE_DESKTOP_CLIENT_ID for desktop Google sign-in.");
  }

  if (!window.lyrictorDesktop?.signInWithGoogle) {
    throw new Error("Desktop Google sign-in is not available in this build.");
  }

  const { idToken } = await window.lyrictorDesktop.signInWithGoogle(clientId);
  const credential = GoogleAuthProvider.credential(idToken);

  await signInWithCredential(auth, credential);
}