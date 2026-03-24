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

  const clientId = import.meta.env.VITE_GOOGLE_DESKTOP_CLIENT_ID;
  const clientSecret = __LYRICTOR_DESKTOP_GOOGLE_CLIENT_SECRET__ || undefined;

  if (!clientId) {
    throw new Error("Missing VITE_GOOGLE_DESKTOP_CLIENT_ID for desktop Google sign-in.");
  }

  const { signInWithDesktopGoogle } = await import("../desktop/bridge");
  const { idToken } = await signInWithDesktopGoogle(clientId, clientSecret);
  const credential = GoogleAuthProvider.credential(idToken);

  await signInWithCredential(auth, credential);
}