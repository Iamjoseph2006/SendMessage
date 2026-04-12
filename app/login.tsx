import { useRouter } from 'expo-router';
import LoginScreen from '@/src/features/auth/screens/LoginScreen';
import { useAuth } from '@/src/features/auth/hooks/useAuth';

export default function LoginRoute() {
  const { login, error } = useAuth();
  const router = useRouter();

  return <LoginScreen onLogin={login} onGoToRegister={() => router.push('/register')} error={error} />;
}
