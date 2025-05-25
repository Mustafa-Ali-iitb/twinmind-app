// src/utils/fetchGoogleCalendarWithAuth.js
import { refreshAccessTokenWithPopup } from "./googleAuth";

export async function fetchGoogleCalendarWithAuth(url, currentAccessToken) {
  let res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${currentAccessToken}`,
    },
  });

  if (res.status === 401) {
    console.warn("🔐 Token expired. Refreshing...");
    const newToken = await refreshAccessTokenWithPopup();

    if (!newToken) throw new Error("Token refresh failed");

    return fetch(url, {
      headers: {
        Authorization: `Bearer ${newToken}`,
      },
    });
  }

  return res;
}
