import { useEffect, useState } from 'react';
import {
  AppUser,
  getCurrentUser,
  loginUser,
  logoutUser,
  observeAuthState,
  registerUser,
} from '@/src/features/auth/services/authService';

type AuthState = {
  user: AppUser | null;
  loading: boolean;
  error: string | null;
  register: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuth = (): AuthState => {
  const [user, setUser] = useState<AppUser | null>(() => getCurrentUser());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = observeAuthState((nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleAction = async (action: () => Promise<unknown>) => {
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de autenticación.');
    }
  };

  return {
    user,
    loading,
    error,
    register: async (email: string, password: string) => handleAction(() => registerUser(email, password)),
    login: async (email: string, password: string) => handleAction(() => loginUser(email, password)),
    logout: async () => handleAction(logoutUser),
  };
};
