import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/src/features/auth/hooks/useAuth';

export default function AuthNavigator() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const inAuthFlow = segments[0] === 'login' || segments[0] === 'register';

    if (!user && !inAuthFlow) {
      router.replace('/login');
      return;
    }

    if (user && inAuthFlow) {
      router.replace('/(tabs)');
    }
  }, [loading, router, segments, user]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#0A84FF" />
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ title: 'Registro' }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="chat/new" options={{ headerBackTitle: 'Chats' }} />
      <Stack.Screen name="chat/[chatId]" options={{ headerShown: false }} />
      <Stack.Screen name="profile/account" options={{ headerBackTitle: 'Perfil' }} />
      <Stack.Screen name="profile/edit" options={{ headerBackTitle: 'Cuenta' }} />
      <Stack.Screen name="profile/[section]" options={{ headerBackTitle: 'Perfil' }} />
      <Stack.Screen name="status/create" options={{ headerBackTitle: 'Estados' }} />
      <Stack.Screen name="status/my" options={{ headerBackTitle: 'Estados' }} />
      <Stack.Screen name="status/[statusId]" options={{ headerBackTitle: 'Mi estado' }} />
    </Stack>
  );
}
