import { config } from "../config.js";

// Small fetch wrapper for the backend REST API.
export async function api(method, path, { token, body } = {}) {
  const res = await fetch(`${config.apiUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const msg = data?.message || data?.error || text || res.statusText;
    const err = new Error(`${method} ${path} → ${res.status}: ${msg}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export async function login(identifier, password) {
  const data = await api("POST", "/auth/login", {
    body: { identifier, email: identifier, password },
  });
  const token = data.token || data.data?.token;
  if (!token) throw new Error(`Login for ${identifier} returned no token`);
  return { token, user: data.user || data.data?.user };
}

// Response shapes differ between endpoints ({ items }, { data }, [..], { roles }…).
export function asArray(data) {
  if (Array.isArray(data)) return data;
  for (const key of ["items", "data", "results", "roles", "users", "teams", "projects", "tickets", "statuses", "priorities", "types", "conversations"]) {
    if (Array.isArray(data?.[key])) return data[key];
    if (Array.isArray(data?.data?.[key])) return data.data[key];
  }
  return [];
}

export function idOf(data, ...keys) {
  for (const k of keys) if (data?.[k]?.id) return data[k].id;
  return data?.id || data?.data?.id;
}
