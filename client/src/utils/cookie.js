// setCookie: days is optional; defaults to 7
export function setCookie(name, value, days = 7) {
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  const expires = `expires=${date.toUTCString()}`;
  const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
  const secure = isHttps ? "; Secure" : "";
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(String(value))}; ${expires}; path=/; SameSite=Lax${secure}`;
}

export function getCookie(name) {
  const target = `${encodeURIComponent(name)}=`;
  const decoded = document.cookie.split("; ");
  for (const part of decoded) {
    if (part.indexOf(target) === 0) {
      const raw = part.substring(target.length);
      try {
        return decodeURIComponent(raw);
      } catch (_) {
        return raw;
      }
    }
  }
  return null;
}

export function eraseCookie(name) {
  // Set expiration to past date
  document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}




