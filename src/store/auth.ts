import { create } from 'zustand';
import { auth, googleAuthProvider } from '../lib/firebase';
import { signInWithPopup, signOut } from 'firebase/auth';

interface User {
  id: number;
  uid: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  academicYear?: string;
  phoneNumber?: string;
  profileCompleted?: boolean;
  role: string;
}

interface AuthState {
  user: User | null;
  sessionToken: string | null;
  loading: boolean;
  error: string | null;
  login: () => Promise<void>;
  logout: () => void;
  syncUser: (firebaseUser: any) => Promise<void>;
  setUser: (user: User | null) => void;
}

const getStoredUser = (): User | null => {
  try {
    const raw = localStorage.getItem('kasrology_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: getStoredUser(),
  sessionToken: localStorage.getItem('kasrology_session'),
  loading: false,
  error: null,
  
  syncUser: async (firebaseUser) => {
    try {
      const idToken = await firebaseUser.getIdToken();
      const res = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: firebaseUser.displayName })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      localStorage.setItem('kasrology_session', data.sessionToken);
      localStorage.setItem('kasrology_user', JSON.stringify(data.user));
      set({ user: data.user, sessionToken: data.sessionToken, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  login: async () => {
    set({ loading: true, error: null });
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      await get().syncUser(result.user);
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  logout: async () => {
    await signOut(auth);
    localStorage.removeItem('kasrology_session');
    localStorage.removeItem('kasrology_user');
    set({ user: null, sessionToken: null });
  },

  setUser: (user: User | null) => {
    if (user) {
      localStorage.setItem('kasrology_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('kasrology_user');
    }
    set({ user });
  }
}));
