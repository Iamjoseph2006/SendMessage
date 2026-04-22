import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { StatusViewer } from '@/src/features/status/components/StatusViewer';

export default function MyStatusScreen() {
  const { user } = useAuth();
  if (!user?.uid) return null;
  return <StatusViewer userId={user.uid} ownerMode />;
}
