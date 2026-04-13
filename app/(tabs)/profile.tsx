import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { listenProfile } from '@/src/features/profile/services/profileService';
import { UserProfile } from '@/src/features/users/services/userService';
import { darkPalette, lightPalette, useAppTheme } from '@/src/presentation/theme/appTheme';

const options = [
  { id: 'notifications', icon: 'notifications-outline', label: 'Notificaciones' },
  { id: 'privacy', icon: 'lock-closed-outline', label: 'Privacidad' },
  { id: 'appearance', icon: 'color-palette-outline', label: 'Apariencia' },
  { id: 'help', icon: 'help-circle-outline', label: 'Ayuda' },
] as const;

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { isDark } = useAppTheme();
  const palette = isDark ? darkPalette : lightPalette;
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const unsubscribe = listenProfile(
      user.uid,
      (nextProfile) => {
        setProfile(nextProfile);
        setLoading(false);
      },
      (listenError) => {
        setError(listenError.message);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [user?.uid]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}> 
        <ActivityIndicator style={{ marginTop: 40 }} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}> 
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}> 
        <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Perfil</Text>
      </View>
      <View style={styles.container}>
        <View style={[styles.headerCard, { borderColor: palette.border, backgroundColor: palette.surface }]}> 
          <View style={[styles.profilePhoto, { backgroundColor: isDark ? '#21314A' : '#D9EAFF' }]}> 
            <Text style={[styles.profileInitial, { color: palette.textPrimary }]}>{(profile?.name ?? 'U').charAt(0)}</Text>
          </View>
          <Text style={[styles.name, { color: palette.textPrimary }]}>{profile?.name ?? 'Sin nombre'}</Text>
          <Text style={[styles.email, { color: palette.textSecondary }]}>{profile?.email ?? user?.email}</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        {options.map((option) => (
          <Pressable
            key={option.id}
            style={[styles.optionRow, { borderColor: palette.border, backgroundColor: palette.surface }]}
            onPress={() => router.push(`/profile/${option.id}`)}>
            <Ionicons name={option.icon} size={20} color={palette.accent} />
            <Text style={[styles.optionText, { color: palette.textPrimary }]}>{option.label}</Text>
            <Ionicons name="chevron-forward" size={18} color="#A1AFC1" />
          </Pressable>
        ))}

        <Pressable style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFF' },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  headerTitle: { fontSize: 34, fontWeight: '800', color: '#1A2B44' },
  container: { padding: 16, gap: 12 },
  headerCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E6EBF2',
    alignItems: 'center',
    padding: 18,
    gap: 8,
  },
  profilePhoto: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#D9EAFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  profileInitial: { fontSize: 28, fontWeight: '800', color: '#214060' },
  name: { fontSize: 20, fontWeight: '700' },
  email: { fontSize: 14 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6EBF2',
    paddingVertical: 13,
    paddingHorizontal: 12,
  },
  optionText: { flex: 1, color: '#253952', fontWeight: '600', fontSize: 15 },
  error: { color: '#D93025' },
  logoutButton: {
    marginTop: 8,
    backgroundColor: '#FEECEC',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  logoutText: { color: '#C62828', fontWeight: '700' },
});
