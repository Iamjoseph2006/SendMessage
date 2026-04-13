import { useEffect, useState } from 'react';
import { getUsers, UserProfile } from '@/src/features/users/services/userService';

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

    setLoading(true);
    setError(null);

    const unsubscribe = getUsers(
      excludeUid,
      (nextUsers) => {
        setUsers(nextUsers);
        setLoading(false);
      },
      (listenError) => {
        setError(listenError.message);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [excludeUid]);

  return { users, loading, error };
};
