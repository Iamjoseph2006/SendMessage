import { StatusItem } from '@/src/domain/entities';
import { getStatusesUseCase } from '@/src/domain/usecases/messagingUseCases';
import { useEffect, useState } from 'react';

export const useStatusesViewModel = () => {
  const [statuses, setStatuses] = useState<StatusItem[]>([]);

  useEffect(() => {
    getStatusesUseCase().then(setStatuses);
  }, []);

  return { statuses };
};
