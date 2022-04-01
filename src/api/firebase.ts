import { getApp, initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import firebaseConfig from "./firebaseConfig.json";

const firebase = initializeApp(firebaseConfig);
const analytics = getAnalytics(firebase);

export default firebase;
export const auth = getAuth(firebase);
export const googleProvider = new GoogleAuthProvider();
