import { useLocalSearchParams } from 'expo-router';
import { StatusViewer } from '@/src/features/status/components/StatusViewer';

export default function StatusViewerScreen() {
  const { userId } = useLocalSearchParams<{ userId: string | string[] }>();
  const normalizedUserId = Array.isArray(userId) ? userId[0] : userId;
  if (!normalizedUserId) return null;
  return <StatusViewer userId={normalizedUserId} ownerMode={false} />;
}
