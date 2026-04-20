import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { Chat } from '@/src/features/chat/services/chatService';
import { useUserChats } from '@/src/features/chat/hooks/useUserChats';
import { useUsersDirectory } from '@/src/features/users/hooks/useUsersDirectory';
import { darkPalette, lightPalette, useAppTheme } from '@/src/presentation/theme/appTheme';
import { getAvatarInitials } from '@/src/shared/utils/avatar';
import { toSafeMillis } from '@/src/shared/utils/date';

export default function ChatsScreen() {
  const { user } = useAuth();
  const { chats, loading, error: chatsError } = useUserChats(user?.uid ?? null);
  const { users: directory, error: usersError } = useUsersDirectory(user?.uid ?? null);
  const { isDark } = useAppTheme();
  const palette = isDark ? darkPalette : lightPalette;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [inAppNotice, setInAppNotice] = useState<string | null>(null);
  const [lastNoticeAt, setLastNoticeAt] = useState(0);

  const usersByUid = useMemo(
    () => new Map(directory.map((directoryUser) => [directoryUser.uid, directoryUser])),
    [directory],
  );

  const rows = useMemo(() => {
    if (!user?.uid) {
      return [];
    }

    return chats.map((chat: Chat) => {
      const contactUid = chat.participants.find((participantId) => participantId !== user.uid) ?? '';
      const contact = usersByUid.get(contactUid);
      const presenceLabel = contact?.online ? 'En línea' : 'No disponible';

      return {
        id: chat.id,
        contactUid,
        title: contact?.name || contact?.email || 'Sin nombre',
        photoURL: contact?.photoURL ?? null,
        lastMessageAt: toSafeMillis(chat.lastMessageAt) || toSafeMillis(chat.updatedAt),
        lastMessageSenderId: chat.lastMessageSenderId || '',
        unreadCount: chat.unreadCountByUser?.[user.uid] ?? 0,
        presenceLabel,
        subtitle: chat.lastMessage
          ? `${chat.lastMessageSenderId === user.uid ? 'Tú: ' : ''}${chat.lastMessage}`
          : contact?.email || 'Sin mensajes todavía',
      };
    }).sort((a, b) => b.lastMessageAt - a.lastMessageAt);
  }, [chats, user?.uid, usersByUid]);

  const unreadSummary = useMemo(() => {
    const chatsWithUnread = rows.filter((row) => row.unreadCount > 0);
    return {
      chatsWithUnread: chatsWithUnread.length,
      totalUnread: chatsWithUnread.reduce((sum, row) => sum + row.unreadCount, 0),
    };
  }, [rows]);

  useEffect(() => {
    if (!user?.uid || rows.length === 0) {
      return;
    }

    const latestIncoming = [...rows]
      .sort((a, b) => b.lastMessageAt - a.lastMessageAt)
      .find((row) => row.lastMessageSenderId && row.lastMessageSenderId !== user.uid);

    if (!latestIncoming?.lastMessageAt) {
      return;
    }

    if (latestIncoming.lastMessageAt <= lastNoticeAt) {
      return;
    }

    setLastNoticeAt(latestIncoming.lastMessageAt);
    setInAppNotice(`Nuevo mensaje de ${latestIncoming.title}`);
    const timer = setTimeout(() => setInAppNotice(null), 3500);
    return () => clearTimeout(timer);
  }, [lastNoticeAt, rows, user?.uid]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}> 
        <Text style={[styles.title, { color: palette.textPrimary }]}>Chats</Text>
      </View>

      {loading ? <ActivityIndicator style={styles.loading} size="large" /> : null}

      {usersError || chatsError ? (
        <Text style={styles.error}>
          {usersError ?? chatsError}
        </Text>
      ) : null}

      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListEmptyComponent={
          !loading ? <Text style={[styles.empty, { color: palette.textSecondary }]}>Aún no tienes chats activos.</Text> : null
        }
        renderItem={({ item }) => (
          <Pressable style={styles.chatRow} onPress={() => router.push(`/chat/${item.id}`)}>
            <View style={styles.avatar}>
              {item.photoURL ? (
                <Image source={{ uri: item.photoURL }} style={styles.avatarImageWrap} />
              ) : (
                <Text style={styles.avatarText}>{getAvatarInitials(item.title)}</Text>
              )}
            </View>
            <View style={styles.textWrap}>
              <View style={styles.nameRow}>
                <Text style={[styles.name, { color: palette.textPrimary }]}>{item.title}</Text>
                {item.unreadCount > 0 ? (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{item.unreadCount > 99 ? '99+' : item.unreadCount}</Text>
                  </View>
                ) : (
                  <Text style={[styles.presence, { color: item.presenceLabel === 'En línea' ? '#14A44D' : palette.textSecondary }]}>
                    {item.presenceLabel}
                  </Text>
                )}
              </View>
              <Text numberOfLines={1} style={[styles.lastMessage, { color: palette.textSecondary }]}>
                {item.subtitle}
              </Text>
            </View>
          </Pressable>
        )}
      />

      {unreadSummary.totalUnread > 0 ? (
        <View style={[styles.unreadSummaryCard, { backgroundColor: isDark ? '#1C2A3D' : '#EAF2FF' }]}>
          <Ionicons name="notifications-outline" size={17} color={isDark ? '#BFD9FF' : '#1F7AE0'} />
          <Text style={[styles.unreadSummaryText, { color: isDark ? '#DCEAFF' : '#1A3E6E' }]}>
            {unreadSummary.chatsWithUnread} chats · {unreadSummary.totalUnread} mensajes nuevos
          </Text>
        </View>
      ) : null}

      {inAppNotice ? (
        <View style={styles.notice}>
          <Ionicons name="chatbubble-ellipses" size={14} color="#FFF" />
          <Text style={styles.noticeText}>{inAppNotice}</Text>
        </View>
      ) : null}

      <Pressable style={styles.fab} onPress={() => router.push('/chat/new')}>
        <Ionicons name="chatbubble-ellipses" size={22} color="#FFF" />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  title: { fontSize: 34, fontWeight: '800' },
  loading: { marginVertical: 16 },
  content: { paddingVertical: 8, paddingBottom: 110 },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#BFD7F7',
  },
  avatarText: { fontWeight: '700', fontSize: 18, color: '#234' },
  avatarImageWrap: { width: 52, height: 52, borderRadius: 26, overflow: 'hidden' },
  textWrap: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { fontSize: 16, fontWeight: '700' },
  presence: { fontSize: 12, fontWeight: '600' },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1F7AE0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  lastMessage: { fontSize: 13 },
  fab: {
    position: 'absolute',
    right: 22,
    bottom: 28,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#1F7AE0',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  error: { color: '#D93025', marginHorizontal: 16, marginBottom: 8 },
  empty: { textAlign: 'center', marginTop: 24 },
  unreadSummaryCard: {
    position: 'absolute',
    bottom: 98,
    alignSelf: 'center',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unreadSummaryText: { fontWeight: '600', fontSize: 12 },
  notice: {
    position: 'absolute',
    bottom: 56,
    alignSelf: 'center',
    backgroundColor: '#1F7AE0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  noticeText: {
    color: '#FFF',
    fontWeight: '600',
  },
});
