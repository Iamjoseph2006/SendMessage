import { CallLog } from '@/src/domain/entities';
import { getCallsUseCase } from '@/src/domain/usecases/messagingUseCases';
import { useEffect, useState } from 'react';

export const useCallsViewModel = () => {
  const [calls, setCalls] = useState<CallLog[]>([]);

  useEffect(() => {
    getCallsUseCase().then(setCalls);
  }, []);

  return { calls };
};
