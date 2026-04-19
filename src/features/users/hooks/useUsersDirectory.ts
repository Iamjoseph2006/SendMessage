import { useEffect, useState } from 'react';
import { getUsers, listenUsers, UserProfile } from '@/src/features/users/services/userService';

export const useUsersDirectory = (excludeUid: string | null) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!excludeUid) {
      setUsers([]);
      setLoading(false);
      setError(null);
      return;
    }

    let isActive = true;
    setLoading(true);
    setError(null);

    const bootstrapUsers = async () => {
      try {
        const initialUsers = await getUsers(excludeUid);
        if (isActive) {
          setUsers(initialUsers);
        }
      } catch (bootstrapError) {
        if (isActive) {
          setError(
            bootstrapError instanceof Error
              ? bootstrapError.message
              : 'No se pudo cargar el directorio de usuarios. Verifica tu conexión.',
          );
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    void bootstrapUsers();

    const unsubscribe = listenUsers(
      excludeUid,
      (nextUsers) => {
        if (!isActive) {
          return;
        }

        setUsers(nextUsers);
        setLoading(false);
        setError(null);
      },
      (listenError) => {
        if (!isActive) {
          return;
        }

        setError(listenError.message);
        setLoading(false);
      },
    );

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [excludeUid]);

  return { users, loading, error };
};
