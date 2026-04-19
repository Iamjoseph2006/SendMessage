import { Stack, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { StatusItem, getStatuses } from '@/src/features/status/services/statusService';
import { getRelativeStatusTime, getStatusPreview } from '@/src/features/status/utils/statusFormat';
import { darkPalette, lightPalette, useAppTheme } from '@/src/presentation/theme/appTheme';

export default function StatusDetailScreen() {
  const { statusId } = useLocalSearchParams<{ statusId: string }>();
  const { user } = useAuth();
  const { isDark } = useAppTheme();
  const palette = isDark ? darkPalette : lightPalette;

  const [status, setStatus] = useState<StatusItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    if (!statusId || !user?.uid) {
      return;
    }

    try {
      setError(null);
      const allStatuses = await getStatuses();
      const currentStatus = allStatuses.find((item) => item.id === statusId && item.userId === user.uid) ?? null;
      setStatus(currentStatus);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudo abrir el estado.');
    }
  }, [statusId, user?.uid]);

  useFocusEffect(
    useCallback(() => {
      loadStatus();
    }, [loadStatus]),
  );

  const title = useMemo(() => {
    if (status) {
      return 'Mi actualización';
    }

    return 'Estado';
  }, [status]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <Stack.Screen options={{ title }} />

      <View style={[styles.card, { borderColor: palette.border, backgroundColor: palette.surface }]}>
        {status ? (
          <>
            <Text style={[styles.time, { color: palette.textSecondary }]}>{getRelativeStatusTime(status)}</Text>
            <Text style={[styles.content, { color: palette.textPrimary }]}>{getStatusPreview(status)}</Text>
            {status.imageUri ? <Image source={{ uri: status.imageUri }} style={styles.previewImage} /> : null}
            {status.location ? <Text style={[styles.meta, { color: palette.textSecondary }]}>📍 {status.location.label ?? `${status.location.latitude.toFixed(4)}, ${status.location.longitude.toFixed(4)}`}</Text> : null}
            {status.audioUri ? <Text style={[styles.meta, { color: palette.textSecondary }]}>🎤 Audio adjunto</Text> : null}
          </>
        ) : (
          <Text style={[styles.notFound, { color: palette.textSecondary }]}>No encontramos este estado o ya expiró.</Text>
        )}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, padding: 16 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, minHeight: 220, justifyContent: 'center', gap: 8 },
  time: { fontSize: 13, fontWeight: '600' },
  content: { fontSize: 22, fontWeight: '700', lineHeight: 30 },
  previewImage: { width: '100%', height: 180, borderRadius: 12 },
  meta: { fontSize: 14 },
  notFound: { textAlign: 'center', fontSize: 15 },
  error: { color: '#D93025', marginTop: 12 },
});
