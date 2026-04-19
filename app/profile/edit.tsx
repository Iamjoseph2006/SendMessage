import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { listenProfile, updateProfileName } from '@/src/features/profile/services/profileService';
import { UserProfile } from '@/src/features/users/services/userService';
import { darkPalette, lightPalette, useAppTheme } from '@/src/presentation/theme/appTheme';

export default function EditProfileScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { isDark } = useAppTheme();
  const palette = isDark ? darkPalette : lightPalette;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [nextName, setNextName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
        setNextName(nextProfile?.name || user?.displayName || '');
        setLoading(false);
      },
      (listenError) => {
        setError(listenError.message);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [user?.displayName, user?.uid]);

  const onSave = async () => {
    if (!user?.uid) {
      return;
    }

    const normalizedName = nextName.trim();
    if (!normalizedName) {
      setError('El nombre no puede estar vacío.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await updateProfileName(user.uid, normalizedName);
      router.back();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No fue posible guardar tu perfil.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}> 
        <ActivityIndicator style={styles.loading} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}> 
      <Stack.Screen options={{ title: 'Editar perfil' }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={[styles.card, { borderColor: palette.border, backgroundColor: palette.surface }]}> 
            <Text style={[styles.label, { color: palette.textSecondary }]}>Nombre</Text>
            <TextInput
              value={nextName}
              onChangeText={setNextName}
              editable={!saving}
              autoCapitalize="words"
              placeholder="Tu nombre"
              placeholderTextColor={palette.textSecondary}
              style={[
                styles.input,
                {
                  color: palette.textPrimary,
                  borderColor: palette.border,
                  backgroundColor: isDark ? '#121A28' : '#F8FBFF',
                },
              ]}
            />

            <Text style={[styles.metaLabel, { color: palette.textSecondary }]}>Correo</Text>
            <Text style={[styles.metaValue, { color: palette.textPrimary }]}>{profile?.email || user?.email || 'No definido'}</Text>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable style={styles.saveButton} disabled={saving} onPress={onSave}>
            {saving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveButtonText}>Guardar cambios</Text>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loading: { marginTop: 36 },
  container: { padding: 16, gap: 12, paddingBottom: 36 },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  label: { fontSize: 14, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  metaLabel: { marginTop: 6, fontSize: 14, fontWeight: '600' },
  metaValue: { fontSize: 15, fontWeight: '600' },
  error: { color: '#D93025' },
  saveButton: {
    borderRadius: 12,
    backgroundColor: '#1F7AE0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    minHeight: 46,
  },
  saveButtonText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});
