import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { StatusViewer } from '@/src/features/status/components/StatusViewer';

export default function StatusDetailScreen() {
  const { statusId } = useLocalSearchParams<{ statusId: string }>();
  const { user } = useAuth();
  if (!user?.uid || !statusId) return null;
  return <StatusViewer userId={user.uid} initialStatusId={statusId} ownerMode />;
}
