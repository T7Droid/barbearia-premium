import { useState, useEffect, useCallback } from 'react';
import { DemoStore } from '../persistence/demo-store';

type Listener = () => void;

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'client' | 'barber';
  points: number;
  tenantId?: string;
  phone?: string;
  rescheduleCount?: number;
  cancelCount?: number;
  canPayAtShop?: boolean;
  fcmToken?: string;
  [key: string]: any;
}

interface AppState {
  user: User | null;
  isLoading: boolean;
}

let globalState: AppState = { 
  user: null,
  isLoading: true
};
const listeners = new Set<Listener>();

export const userStore = {
  getState: () => globalState,

  setUser: (user: User | null) => {
    globalState = { ...globalState, user, isLoading: false };
    listeners.forEach((l) => l());
  },
  
  setLoading: (isLoading: boolean) => {
    globalState = { ...globalState, isLoading };
    listeners.forEach((l) => l());
  },

  updatePoints: (points: number) => {
    if (globalState.user) {
      globalState = {
        ...globalState,
        user: {
          ...globalState.user,
          points: points
        }
      };
      listeners.forEach((l) => l());
    }
  },

  addPoints: (points: number) => {
    if (globalState.user) {
      globalState = {
        ...globalState,
        user: {
          ...globalState.user,
          points: (globalState.user.points || 0) + points
        }
      };
      listeners.forEach((l) => l());
    }
  },

  subscribe: (listener: Listener) => {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }
};

export const useUserStore = () => {
  const [state, setState] = useState(userStore.getState());

  useEffect(() => {
    return userStore.subscribe(() => {
      setState(userStore.getState());
    });
  }, []);

  const refreshProfile = useCallback(async (tenantSlug?: string) => {
    try {
      const headers: any = {};
      if (tenantSlug) headers["x-tenant-slug"] = tenantSlug;
      
      const res = await fetch("/api/auth/me", { headers, cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) {
          userStore.setUser(data.user);
          return data.user;
        } else {
          // Se o servidor retornar explicitamente não autenticado
          console.log("STORE: User is not authenticated, clearing store.");
          userStore.setUser(null);
          DemoStore.clearUser();
        }
      } else if (res.status === 401) {
        // Se retornar 401 Unauthorized
        console.log("STORE: Session expired (401), clearing store.");
        userStore.setUser(null);
        DemoStore.clearUser();
      } else {
        // Para outros erros (500, etc), pelo menos paramos o loading
        userStore.setLoading(false);
      }
    } catch (error: any) {
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        // Silenciar ou logar como aviso para evitar poluição no console durante carregamentos rápidos/concorrência
        console.warn("STORE: Network error while refreshing profile (Failed to fetch).");
      } else {
        console.error("Error refreshing profile:", error);
      }
    }
    return null;
  }, []);

  return {
    user: state.user,
    isLoading: state.isLoading,
    setUser: userStore.setUser,
    setLoading: userStore.setLoading,
    addPoints: userStore.addPoints,
    updatePoints: userStore.updatePoints,
    refreshProfile
  };
};
