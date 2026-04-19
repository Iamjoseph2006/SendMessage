import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { StatusItem, deleteStatus, getStatuses } from '@/src/features/status/services/statusService';
import { getRelativeStatusTime } from '@/src/features/status/utils/statusFormat';
import { darkPalette, lightPalette, useAppTheme } from '@/src/presentation/theme/appTheme';

export default function MyStatusScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { isDark } = useAppTheme();
  const palette = isDark ? darkPalette : lightPalette;
  const [myStatuses, setMyStatuses] = useState<StatusItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadMyStatuses = useCallback(async () => {
    if (!user?.uid) {
      return;
    }

    try {
      setError(null);
      const allStatuses = await getStatuses();
      setMyStatuses(allStatuses.filter((item) => item.userId === user.uid));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar tu estado.');
    }
  }, [user?.uid]);

  useFocusEffect(
    useCallback(() => {
      loadMyStatuses();
    }, [loadMyStatuses]),
  );

  const title = useMemo(() => {
    if (!myStatuses.length) {
      return 'Sin actualizaciones activas';
    }

    return `${myStatuses.length} actualizaciones activas`;
  }, [myStatuses]);

  const onDeleteStatus = (statusId: string) => {
    Alert.alert('Eliminar estado', '¿Seguro que quieres eliminar este estado?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteStatus(statusId);
            await loadMyStatuses();
          } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar el estado.');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <Stack.Screen options={{ title: 'Mi estado' }} />

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.summary, { color: palette.textSecondary }]}>{title}</Text>

        <Pressable style={styles.createButton} onPress={() => router.push('/status/create')}>
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <Text style={styles.createButtonText}>Agregar actualización</Text>
        </Pressable>

        {!myStatuses.length ? (
          <View style={[styles.emptyCard, { borderColor: palette.border, backgroundColor: palette.surface }]}>
            <Ionicons name="radio-outline" size={22} color={palette.textSecondary} />
            <Text style={[styles.emptyTitle, { color: palette.textPrimary }]}>Comparte tu primer estado</Text>
            <Text style={[styles.emptySubtitle, { color: palette.textSecondary }]}>Tus actualizaciones aparecerán aquí y solo tú podrás gestionarlas.</Text>
          </View>
        ) : (
          myStatuses.map((status) => (
            <Pressable
              key={status.id}
              style={[styles.statusCard, { borderColor: palette.border, backgroundColor: palette.surface }]}
              onPress={() => router.push({ pathname: '/status/[statusId]', params: { statusId: status.id } })}>
              <View style={styles.statusHeader}>
                <Text style={[styles.statusTime, { color: palette.textSecondary }]}>{getRelativeStatusTime(status)}</Text>
                <Pressable hitSlop={10} onPress={() => onDeleteStatus(status.id)}>
                  <Ionicons name="trash-outline" size={18} color="#D93025" />
                </Pressable>
              </View>
              <Text style={[styles.statusContent, { color: palette.textPrimary }]}>{status.content}</Text>
            </Pressable>
          ))
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { paddingHorizontal: 16, paddingVertical: 16, gap: 12 },
  summary: { fontSize: 13, fontWeight: '600' },
  createButton: {
    backgroundColor: '#1F7AE0',
    borderRadius: 12,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  createButtonText: { color: '#FFFFFF', fontWeight: '700' },
  emptyCard: { borderWidth: 1, borderRadius: 14, padding: 16, alignItems: 'center', gap: 8, marginTop: 8 },
  emptyTitle: { fontWeight: '700', fontSize: 16 },
  emptySubtitle: { fontSize: 14, textAlign: 'center' },
  statusCard: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 8 },
  statusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusTime: { fontSize: 12, fontWeight: '600' },
  statusContent: { fontSize: 15, lineHeight: 20 },
  error: { color: '#D93025' },
});
