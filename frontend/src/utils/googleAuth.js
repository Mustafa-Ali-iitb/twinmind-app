// src/utils/googleAuth.js
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

export async function refreshAccessTokenWithPopup() {
  const auth = getAuth();
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential.accessToken;
    return accessToken;
  } catch (err) {
    console.error("⚠️ Failed to refresh access token:", err);
    return null;
  }
}
