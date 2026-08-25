import { create } from "zustand";
import { apiFetch } from "@/lib/api";

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: string;
  avatar: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  setAuth: (user: AuthUser, access: string, refresh: string) => void;
  logout: () => Promise<void>;
  clearAuth: () => void;
  setLoading: (status: boolean) => void;
  setError: (msg: string | null) => void;
  hydrate: () => void;
}

function persistTokens(access: string, refresh: string): void {
  try {
    localStorage.setItem("sb_access", access);
    localStorage.setItem("sb_refresh", refresh);
  } catch {
    /* localStorage недоступний */
  }
}

function persistUser(user: AuthUser): void {
  try {
    localStorage.setItem("sb_user", JSON.stringify(user));
  } catch {
    /* localStorage недоступний */
  }
}

function clearStorage(): void {
  try {
    localStorage.removeItem("sb_access");
    localStorage.removeItem("sb_refresh");
    localStorage.removeItem("sb_user");
  } catch {
    /* localStorage недоступний */
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  setAuth: (user, access, refresh) => {
    persistTokens(access, refresh);
    persistUser(user);
    set({
      user,
      accessToken: access,
      refreshToken: refresh,
      isAuthenticated: true,
      error: null,
    });
  },

  logout: async () => {
    const { refreshToken } = get();
    if (refreshToken) {
      try {
        await apiFetch("/accounts/logout/", {
          method: "POST",
          body: { refresh: refreshToken },
        });
      } catch {
        /* ігноруємо помилку при логауті */
      }
    }
    get().clearAuth();
  },

  clearAuth: () => {
    clearStorage();
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      error: null,
    });
  },

  setLoading: (status) => set({ isLoading: status }),

  setError: (msg) => set({ error: msg }),

  hydrate: () => {
    try {
      const access = localStorage.getItem("sb_access");
      const refresh = localStorage.getItem("sb_refresh");
      const userRaw = localStorage.getItem("sb_user");
      if (access && refresh && userRaw) {
        const user = JSON.parse(userRaw) as AuthUser;
        set({
          user,
          accessToken: access,
          refreshToken: refresh,
          isAuthenticated: true,
        });
      }
    } catch {
      clearStorage();
    }
  },
}));
