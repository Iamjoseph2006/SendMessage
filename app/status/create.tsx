import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { createStatus } from '@/src/features/status/services/statusService';
import { darkPalette, lightPalette, useAppTheme } from '@/src/presentation/theme/appTheme';

export default function CreateStatusScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { isDark } = useAppTheme();
  const palette = isDark ? darkPalette : lightPalette;

  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCreateStatus = async () => {
    if (!user?.uid) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await createStatus(user.uid, content);
      setContent('');
      router.back();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'No se pudo crear el estado.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <Stack.Screen options={{ title: 'Nuevo estado' }} />
      <View style={styles.container}>
        <Text style={[styles.label, { color: palette.textPrimary }]}>Escribe tu estado</Text>
        <TextInput
          value={content}
          onChangeText={setContent}
          editable={!saving}
          multiline
          autoFocus
          placeholder="Escribe un estado..."
          placeholderTextColor={palette.textSecondary}
          style={[
            styles.input,
            {
              color: palette.textPrimary,
              borderColor: palette.border,
              backgroundColor: palette.surface,
            },
          ]}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={styles.publishButton} disabled={saving} onPress={onCreateStatus}>
          {saving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.publishText}>Publicar</Text>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  label: { fontSize: 16, fontWeight: '700' },
  input: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  publishButton: {
    marginTop: 8,
    backgroundColor: '#1F7AE0',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 11,
  },
  publishText: { color: '#FFF', fontWeight: '700' },
  error: { color: '#D93025' },
});
