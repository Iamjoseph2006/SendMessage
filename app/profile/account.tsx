import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { listenProfile } from '@/src/features/profile/services/profileService';
import { UserProfile } from '@/src/features/users/services/userService';
import { darkPalette, lightPalette, useAppTheme } from '@/src/presentation/theme/appTheme';

export default function AccountScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { isDark } = useAppTheme();
  const palette = isDark ? darkPalette : lightPalette;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) {
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

  const rows = useMemo(
    () => [
      { label: 'Nombre', value: profile?.name || user?.displayName || 'No definido' },
      { label: 'Correo', value: profile?.email || user?.email || 'No definido' },
      { label: 'UID', value: user?.uid || profile?.uid || 'No disponible' },
      { label: 'Foto', value: profile?.photoURL || 'Sin foto de perfil' },
    ],
    [profile?.email, profile?.name, profile?.photoURL, profile?.uid, user?.displayName, user?.email, user?.uid],
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}> 
      <Stack.Screen options={{ title: 'Cuenta' }} />

      {loading ? <ActivityIndicator style={styles.loading} size="large" /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <ScrollView contentContainerStyle={styles.container}>
        <View style={[styles.headerCard, { borderColor: palette.border, backgroundColor: palette.surface }]}> 
          <View style={[styles.avatar, { backgroundColor: isDark ? '#21314A' : '#D9EAFF' }]}> 
            <Text style={[styles.avatarText, { color: palette.textPrimary }]}> 
              {(rows[0].value || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.name, { color: palette.textPrimary }]}>{rows[0].value}</Text>
          <Text style={[styles.email, { color: palette.textSecondary }]}>{rows[1].value}</Text>
        </View>

        <View style={[styles.infoCard, { borderColor: palette.border, backgroundColor: palette.surface }]}> 
          {rows.map((row) => (
            <View key={row.label} style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: palette.textSecondary }]}>{row.label}</Text>
              <Text style={[styles.infoValue, { color: palette.textPrimary }]}>{row.value}</Text>
            </View>
          ))}
        </View>

        <Pressable style={styles.editButton} onPress={() => router.push('/profile/edit')}>
          <Ionicons name="create-outline" size={18} color="#FFF" />
          <Text style={styles.editButtonText}>Editar perfil</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loading: { marginTop: 24 },
  container: { padding: 16, gap: 12, paddingBottom: 34 },
  headerCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontWeight: '800', fontSize: 28 },
  name: { fontSize: 20, fontWeight: '700' },
  email: { fontSize: 14 },
  infoCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 14,
  },
  infoRow: { gap: 4 },
  infoLabel: { fontSize: 13, fontWeight: '600' },
  infoValue: { fontSize: 15, fontWeight: '600' },
  editButton: {
    marginTop: 4,
    borderRadius: 12,
    backgroundColor: '#1F7AE0',
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  editButtonText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  error: { color: '#D93025', marginHorizontal: 16, marginTop: 10 },
});
