import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { getStatuses, StatusItem } from '@/src/features/status/services/statusService';
import { getUsersByUids } from '@/src/features/users/services/userService';
import { darkPalette, lightPalette, useAppTheme } from '@/src/presentation/theme/appTheme';

export default function StatusScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { isDark } = useAppTheme();
  const palette = isDark ? darkPalette : lightPalette;
  const [statuses, setStatuses] = useState<StatusItem[]>([]);
  const [usersById, setUsersById] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const loadStatuses = async () => {
    try {
      const nextStatuses = await getStatuses();
      setStatuses(nextStatuses);
      const userIds = [...new Set(nextStatuses.map((item) => item.userId).filter(Boolean))];
      const users = await getUsersByUids(userIds);
      const map = users.reduce<Record<string, string>>((acc, item) => {
        acc[item.uid] = item.name;
        return acc;
      }, {});
      setUsersById(map);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los estados.');
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadStatuses();
    }, []),
  );

  const rows = useMemo(
    () =>
      statuses.map((status) => ({
        ...status,
        owner: status.userId === user?.uid ? 'Tu estado' : usersById[status.userId] ?? 'Usuario',
      })),
    [statuses, user?.uid, usersById],
  );

  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Estados</Text>
      </View>
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable
          style={[styles.addStatus, { borderColor: palette.border, backgroundColor: palette.surface }]}
          onPress={() => router.push('/status/create')}>
          <View style={[styles.avatar, { backgroundColor: isDark ? '#21314A' : '#EAF3FF' }]}>
            <Ionicons name="add" size={22} color={palette.accent} />
          </View>
          <View style={styles.myStatusText}>
            <Text style={[styles.title, { color: palette.textPrimary }]}>Mi estado</Text>
            <Text style={[styles.subtitle, { color: palette.textSecondary }]}>Comparte una actualización</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#A1AFC1" />
        </Pressable>

        {rows.map((status) => (
          <View key={status.id} style={styles.row}>
            <View style={styles.storyRing} />
            <View style={styles.statusTextWrap}>
              <Text style={[styles.title, { color: palette.textPrimary }]}>{status.owner}</Text>
              <Text style={[styles.subtitle, { color: palette.textSecondary }]}>{status.content}</Text>
            </View>
          </View>
        ))}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFF' },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  headerTitle: { fontSize: 34, fontWeight: '800', color: '#1A2B44' },
  container: { paddingHorizontal: 16, paddingTop: 10, gap: 14, paddingBottom: 30 },
  addStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6EBF2',
    padding: 12,
  },
  myStatusText: { flex: 1 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#EAF3FF', alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusTextWrap: { flex: 1 },
  storyRing: { width: 46, height: 46, borderRadius: 23, borderWidth: 3, borderColor: '#1F7AE0', backgroundColor: '#F5FAFF' },
  title: { color: '#22354D', fontWeight: '700', fontSize: 16 },
  subtitle: { color: '#6A7D95', marginTop: 1 },
  error: { color: '#D93025' },
});
