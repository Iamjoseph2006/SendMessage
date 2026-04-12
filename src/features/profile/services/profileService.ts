import { listenUserById, updateUserName, UserProfile } from '@/src/features/users/services/userService';

export const listenProfile = (
  uid: string,
  callback: (profile: UserProfile | null) => void,
  onError?: (error: Error) => void,
) => listenUserById(uid, callback, onError);

export const updateProfileName = async (uid: string, name: string) => updateUserName(uid, name);
