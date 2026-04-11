import { Profile } from '@/src/domain/entities';
import { getProfileUseCase } from '@/src/domain/usecases/messagingUseCases';
import { useEffect, useState } from 'react';

export const useProfileViewModel = () => {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    getProfileUseCase().then(setProfile);
  }, []);

  return { profile };
};
