const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:81";

const TOKEN_KEY = "adminToken";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  const hadToken = Boolean(getToken());
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/admin${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  // Only force-logout on 401 when a session token was already in use (not failed login)
  if (res.status === 401 && hadToken && path !== "/login") {
    clearToken();
    window.location.href = "/login";
    throw new Error(data.message || "Session expired");
  }

  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }
  return data;
}

export const adminApi = {
  login: (username: string, password: string) =>
    request("/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  dashboard: () => request("/dashboard"),
  plans: () => request("/plans"),
  updatePlan: (id: string, body: Record<string, unknown>) =>
    request(`/plans/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  workers: () => request("/workers"),
  clients: (params: { page?: number; limit?: number; search?: string; status?: string; plan?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.page) q.set("page", String(params.page));
    if (params.limit) q.set("limit", String(params.limit));
    if (params.search) q.set("search", params.search);
    if (params.status) q.set("status", params.status);
    if (params.plan) q.set("plan", params.plan);
    const qs = q.toString();
    return request(`/clients${qs ? `?${qs}` : ""}`);
  },
  client: (id: string) => request(`/clients/${id}`),
};
