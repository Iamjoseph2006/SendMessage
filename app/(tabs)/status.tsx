import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { StatusItem, getStatuses } from '@/src/features/status/services/statusService';
import { buildMyStatusSubtitle, getRelativeStatusTime, getUserInitial } from '@/src/features/status/utils/statusFormat';
import { getUsersByUids } from '@/src/features/users/services/userService';
import { darkPalette, lightPalette, useAppTheme } from '@/src/presentation/theme/appTheme';

type ContactStatusRow = StatusItem & {
  ownerName: string;
};

export default function StatusScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { isDark } = useAppTheme();
  const palette = isDark ? darkPalette : lightPalette;
  const [statuses, setStatuses] = useState<StatusItem[]>([]);
  const [usersById, setUsersById] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  const loadStatuses = async () => {
    try {
      setError(null);
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

  const { myStatuses, contactStatuses } = useMemo(() => {
    const grouped = statuses.reduce(
      (acc, item) => {
        if (item.userId === user?.uid) {
          acc.myStatuses.push(item);
        } else {
          acc.contactStatuses.push({
            ...item,
            ownerName: usersById[item.userId] ?? 'Usuario',
          });
        }

        return acc;
      },
      {
        myStatuses: [] as StatusItem[],
        contactStatuses: [] as ContactStatusRow[],
      },
    );

    return grouped;
  }, [statuses, user?.uid, usersById]);

  const myStateSubtitle = useMemo(() => buildMyStatusSubtitle(myStatuses), [myStatuses]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}> 
        <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Estados</Text>
      </View>
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable
          style={[styles.myStatusCard, { borderColor: palette.border, backgroundColor: palette.surface }]}
          onPress={() => router.push('/status/my')}>
          <View style={styles.avatarWrap}>
            <View style={[styles.avatar, { backgroundColor: isDark ? '#253650' : '#EAF3FF' }]}>
              <Text style={[styles.avatarText, { color: palette.accent }]}>{getUserInitial(user?.displayName ?? user?.email)}</Text>
            </View>
            <View style={styles.addBadge}>
              <Ionicons name="add" size={14} color="#FFFFFF" />
            </View>
          </View>

          <View style={styles.myStatusText}>
            <Text style={[styles.title, { color: palette.textPrimary }]}>Mi estado</Text>
            <Text style={[styles.subtitle, { color: palette.textSecondary }]}>{myStateSubtitle}</Text>
          </View>

          <Pressable
            style={styles.quickAddButton}
            onPress={() => router.push('/status/create')}>
            <Ionicons name="add" size={18} color="#FFFFFF" />
          </Pressable>
        </Pressable>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>Recientes</Text>
        </View>

        {contactStatuses.length ? (
          contactStatuses.map((status) => (
            <View key={status.id} style={styles.row}>
              <View style={styles.storyRing} />
              <View style={styles.statusTextWrap}>
                <Text style={[styles.title, { color: palette.textPrimary }]}>{status.ownerName}</Text>
                <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
                  {status.content} · {getRelativeStatusTime(status)}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <View style={[styles.emptyBlock, { borderColor: palette.border, backgroundColor: palette.surface }]}>
            <Text style={[styles.emptyText, { color: palette.textSecondary }]}>Aún no hay estados recientes de tus contactos.</Text>
          </View>
        )}

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
  myStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  avatarWrap: { position: 'relative' },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '800', fontSize: 20 },
  addBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1F7AE0',
  },
  myStatusText: { flex: 1 },
  quickAddButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1F7AE0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: { marginTop: 2, marginBottom: -2 },
  sectionTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusTextWrap: { flex: 1 },
  storyRing: { width: 46, height: 46, borderRadius: 23, borderWidth: 3, borderColor: '#1F7AE0', backgroundColor: '#F5FAFF' },
  title: { color: '#22354D', fontWeight: '700', fontSize: 16 },
  subtitle: { color: '#6A7D95', marginTop: 1 },
  emptyBlock: { borderWidth: 1, borderRadius: 12, padding: 14 },
  emptyText: { fontSize: 14 },
  error: { color: '#D93025' },
});
