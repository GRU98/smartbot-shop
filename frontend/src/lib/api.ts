const API_BASE = "/api";

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string;
  noAuth?: boolean;
  _retry?: boolean;
}

function getStoredToken(): string | null {
  try {
    return localStorage.getItem("sb_access");
  } catch {
    return null;
  }
}

export async function apiFetch<T = unknown>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, token, noAuth } = options;

  const headers: Record<string, string> = {};

  if (body && method !== "DELETE") {
    headers["Content-Type"] = "application/json";
  }

  const authToken = token || (!noAuth ? getStoredToken() : null);
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) {
    return {} as T;
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401 && !token && !noAuth && !options._retry) {
      try {
        const { useAuthStore } = await import("@/store/useAuthStore");
        useAuthStore.getState().clearAuth();
      } catch {
        /* ignore store import failure */
      }
      return apiFetch(endpoint, { ...options, noAuth: true, _retry: true });
    }

    const message =
      typeof data.detail === "string"
        ? data.detail
        : Object.values(data).flat().join(" ") || `Помилка ${res.status}`;
    throw new Error(message);
  }

  return data as T;
}
