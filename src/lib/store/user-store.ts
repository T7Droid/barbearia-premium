import { useState, useEffect } from 'react';

type Listener = () => void;

interface AppState {
  user: any | null;
}

let globalState: AppState = { user: null };
const listeners = new Set<Listener>();

export const userStore = {
  getState: () => globalState,
  setUser: (user: any | null) => {
    globalState = { ...globalState, user };
    listeners.forEach((l) => l());
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
    return () => listeners.delete(listener);
  }
};

export const useUserStore = () => {
  const [state, setState] = useState(userStore.getState());

  useEffect(() => {
    return userStore.subscribe(() => {
      setState(userStore.getState());
    });
  }, []);

  return {
    user: state.user,
    setUser: userStore.setUser,
    addPoints: userStore.addPoints,
  };
};
