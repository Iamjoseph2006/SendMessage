import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { StatusItem, listenStatuses } from '@/src/features/status/services/statusService';
import { buildMyStatusSubtitle, getRelativeStatusTime, getStatusPreview } from '@/src/features/status/utils/statusFormat';
import { getAvatarInitials } from '@/src/shared/utils/avatar';
import { getUsersByUids } from '@/src/features/users/services/userService';
import { darkPalette, lightPalette, useAppTheme } from '@/src/presentation/theme/appTheme';
import { toSafeMillis } from '@/src/shared/utils/date';

type ContactStatusGroup = {
  userId: string;
  ownerName: string;
  latest: StatusItem;
  unreadCount: number;
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

  useEffect(() => {
    const unsubscribe = listenStatuses(
      async (nextStatuses) => {
        setError(null);
        setStatuses(nextStatuses);
        try {
          const userIds = [...new Set(nextStatuses.map((item) => item.userId).filter(Boolean))];
          const users = await getUsersByUids(userIds);
          setUsersById(
            users.reduce<Record<string, string>>((acc, item) => {
              acc[item.uid] = item.name;
              return acc;
            }, {}),
          );
        } catch {
          setUsersById({});
        }
      },
      (listenError) => setError(listenError.message),
    );

    return unsubscribe;
  }, []);

  const { myStatuses, contactGroups } = useMemo(() => {
    const mine = statuses.filter((item) => item.userId === user?.uid);
    const grouped = new Map<string, StatusItem[]>();

    statuses
      .filter((item) => item.userId !== user?.uid)
      .forEach((item) => {
        const row = grouped.get(item.userId) ?? [];
        row.push(item);
        grouped.set(item.userId, row);
      });

    const rows: ContactStatusGroup[] = Array.from(grouped.entries())
      .map(([userId, items]) => ({
        userId,
        ownerName: usersById[userId] ?? 'Usuario',
        latest: items.sort((a, b) => toSafeMillis(b.createdAt) - toSafeMillis(a.createdAt))[0],
        unreadCount: items.filter((status) => !(status.viewedBy ?? []).includes(user?.uid ?? '')).length,
      }))
      .sort((a, b) => toSafeMillis(b.latest.createdAt) - toSafeMillis(a.latest.createdAt));

    return { myStatuses: mine, contactGroups: rows };
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
              <Text style={[styles.avatarText, { color: palette.accent }]}>{getAvatarInitials(user?.displayName ?? user?.email)}</Text>
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

        {contactGroups.length ? (
          contactGroups.map((group) => (
            <Pressable key={group.userId} style={styles.row} onPress={() => router.push({ pathname: '/status/viewer', params: { userId: group.userId } })}>
              <View style={[styles.storyRing, group.unreadCount ? styles.storyRingUnread : styles.storyRingRead]} />
              <View style={styles.statusTextWrap}>
                <Text style={[styles.title, { color: palette.textPrimary }]}>{group.ownerName}</Text>
                <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
                  {getStatusPreview(group.latest)} · {getRelativeStatusTime(group.latest)}
                </Text>
              </View>
            </Pressable>
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
  storyRing: { width: 46, height: 46, borderRadius: 23, borderWidth: 3, backgroundColor: '#F5FAFF' },
  storyRingUnread: { borderColor: '#1F7AE0' },
  storyRingRead: { borderColor: '#A9B9CA' },
  title: { color: '#22354D', fontWeight: '700', fontSize: 16 },
  subtitle: { color: '#6A7D95', marginTop: 1 },
  emptyBlock: { borderWidth: 1, borderRadius: 12, padding: 14 },
  emptyText: { fontSize: 14 },
  error: { color: '#D93025' },
});
