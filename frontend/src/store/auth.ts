import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface User {
  id: string;
  email: string;
  fullName: string;
  role: "ADMIN" | "DOCTOR" | "PATIENT";
  tenantId: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  _hasHydrated: boolean;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  setHasHydrated: (state: boolean) => void;
}

function setCookie(name: string, value: string, days = 7) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function deleteCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      _hasHydrated: false,
      setAuth: (token, user) => {
        setCookie("auth-storage", JSON.stringify({ state: { token, user } }));
        set({ token, user });
      },
      logout: () => {
        deleteCookie("auth-storage");
        set({ token: null, user: null });
      },
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      // Exclude _hasHydrated from being persisted to localStorage
      partialize: (state) => ({ token: state.token, user: state.user }),
      onRehydrateStorage: () => (state) => {
        if (state?.token && state?.user) {
          setCookie("auth-storage", JSON.stringify({ state: { token: state.token, user: state.user } }));
        }
        state?.setHasHydrated(true);
      },
    },
  ),
);

// Re-export for backward compat with any file using useHydrationStore
export const useHydrationStore = {
  getState: () => useAuthStore.getState(),
};
