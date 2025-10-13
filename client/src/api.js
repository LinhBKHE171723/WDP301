const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:4000/api";

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(body?.message || "API Error");
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}
