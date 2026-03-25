import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
} from "firebase/auth";
import { auth, googleProvider } from "../api/firebase";
import { isDesktopApp } from "../platform";

export async function signInWithGoogle() {
  if (!isDesktopApp) {
    await signInWithPopup(auth, googleProvider);
    return;
  }

  const authBaseUrl = import.meta.env.VITE_DESKTOP_AUTH_BASE_URL?.trim();

  if (!authBaseUrl) {
    throw new Error("Missing VITE_DESKTOP_AUTH_BASE_URL for desktop Google sign-in.");
  }

  const { signInWithDesktopGoogle } = await import("../desktop/bridge");
  const { idToken } = await signInWithDesktopGoogle(authBaseUrl);
  const credential = GoogleAuthProvider.credential(idToken);

  await signInWithCredential(auth, credential);
}