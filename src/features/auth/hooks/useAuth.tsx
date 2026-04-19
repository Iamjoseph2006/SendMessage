import { onAuthStateChanged } from 'firebase/auth';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { auth } from '@/src/config/firebase';
import { AppUser, loginUser, logoutUser, registerUser } from '@/src/features/auth/services/authService';

type AuthState = {
  user: AppUser | null;
  loading: boolean;
  error: string | null;
  register: (name: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

const mapUser = async (firebaseUser: {
  uid: string;
  email: string | null;
  displayName: string | null;
  getIdToken: () => Promise<string>;
} | null) => {
  if (!firebaseUser?.email) {
    return null;
  }

  const idToken = await firebaseUser.getIdToken();

  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName ?? undefined,
    idToken,
  } satisfies AppUser;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth) {
      setUser(null);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        try {
          const mappedUser = await mapUser(firebaseUser);
          setUser(mappedUser);
          setError(null);
        } catch {
          setUser(null);
          setError('No se pudo restaurar la sesión. Vuelve a iniciar sesión.');
        } finally {
          setLoading(false);
        }
      },
      (authError) => {
        setUser(null);
        setError(authError.message || 'No se pudo validar el estado de autenticación.');
        setLoading(false);
      },
    );

    return unsubscribe;
  }, []);

  const handleAction = async (action: () => Promise<unknown>) => {
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de autenticación.');
      throw err;
    }
  };

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      error,
      register: async (name: string, email: string, password: string) =>
        handleAction(() => registerUser(email, password, name)),
      login: async (email: string, password: string) => handleAction(() => loginUser(email, password)),
      logout: async () => handleAction(logoutUser),
    }),
    [user, loading, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthState => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider.');
  }

  return context;
};
