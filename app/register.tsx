import RegisterScreen from '@/src/features/auth/screens/RegisterScreen';
import { useAuth } from '@/src/features/auth/hooks/useAuth';

export default function RegisterRoute() {
  const { register, error } = useAuth();

  return <RegisterScreen onRegister={register} error={error} />;
}
