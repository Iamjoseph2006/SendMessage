import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { Chat, createOrGetChat } from '@/src/features/chat/services/chatService';
import { useUserChats } from '@/src/features/chat/hooks/useUserChats';
import { useUsersDirectory } from '@/src/features/users/hooks/useUsersDirectory';
import { darkPalette, lightPalette, useAppTheme } from '@/src/presentation/theme/appTheme';

export default function ChatsScreen() {
  const { user } = useAuth();
  const { chats, loading, error: chatsError } = useUserChats(user?.uid ?? null);
  const { users: directory, loading: usersLoading, error: usersError } = useUsersDirectory(user?.uid ?? null);
  const { isDark } = useAppTheme();
  const palette = isDark ? darkPalette : lightPalette;
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [showUsersModal, setShowUsersModal] = useState(false);
  const [startingChatWith, setStartingChatWith] = useState<string | null>(null);
  const [screenError, setScreenError] = useState<string | null>(null);

  const usersByUid = useMemo(
    () => new Map(directory.map((directoryUser) => [directoryUser.uid, directoryUser])),
    [directory],
  );


  useEffect(() => {
    if (usersError) {
      console.error(`[ChatsScreen] Error al leer colección users: ${usersError}`);
    }
  }, [usersError]);

  useEffect(() => {
    console.log('[ChatsScreen] Estado directorio usuarios', {
      uidActual: user?.uid ?? null,
      totalUsuarios: directory.length,
      cargandoUsuarios: usersLoading,
    });
  }, [directory.length, user?.uid, usersLoading]);
  const rows = useMemo(() => {
    if (!user?.uid) {
      return [];
    }

    return chats.map((chat: Chat) => {
      const contactUid = chat.participants.find((participantId) => participantId !== user.uid) ?? '';
      const contact = usersByUid.get(contactUid);

      return {
        id: chat.id,
        contactUid,
        title: contact?.name || contact?.email || 'Sin nombre',
        subtitle: chat.lastMessage || contact?.email || 'Sin mensajes todavía',
      };
    });
  }, [chats, user?.uid, usersByUid]);

  const openOrCreateChat = async (contactUid: string) => {
    if (!user?.uid) {
      return;
    }

    setScreenError(null);
    setStartingChatWith(contactUid);

    try {
      const chatId = await createOrGetChat(user.uid, contactUid);
      setShowUsersModal(false);
      router.push(`/chat/${chatId}`);
    } catch (error) {
      setScreenError(error instanceof Error ? error.message : 'No fue posible crear la conversación.');
    } finally {
      setStartingChatWith(null);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}> 
        <Text style={[styles.title, { color: palette.textPrimary }]}>Chats</Text>
      </View>

      {loading ? <ActivityIndicator style={styles.loading} size="large" /> : null}

      {screenError || usersError || chatsError ? (
        <Text style={styles.error}>
          {screenError ?? usersError ?? chatsError}
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
              <Text style={styles.avatarText}>{item.title.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.textWrap}>
              <Text style={[styles.name, { color: palette.textPrimary }]}>{item.title}</Text>
              <Text numberOfLines={1} style={[styles.lastMessage, { color: palette.textSecondary }]}>
                {item.subtitle}
              </Text>
            </View>
          </Pressable>
        )}
      />

      <Pressable style={styles.fab} onPress={() => setShowUsersModal(true)}>
        <Ionicons name="chatbubble-ellipses" size={22} color="#FFF" />
      </Pressable>

      <Modal visible={showUsersModal} transparent animationType="slide" onRequestClose={() => setShowUsersModal(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowUsersModal(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: palette.surface }]} onPress={() => undefined}>
            <Text style={[styles.modalTitle, { color: palette.textPrimary }]}>Iniciar nuevo chat</Text>

            <FlatList
              data={directory}
              keyExtractor={(item) => item.uid}
              ListEmptyComponent={
                usersLoading ? (
                  <ActivityIndicator style={styles.loading} size="small" />
                ) : (
                  <Text style={[styles.empty, { color: palette.textSecondary }]}>No hay otros usuarios disponibles en Firestore.</Text>
                )
              }
              renderItem={({ item }) => {
                const displayName = item.name || item.email;

                return (
                  <Pressable
                    style={styles.userRow}
                    disabled={startingChatWith === item.uid}
                    onPress={() => openOrCreateChat(item.uid)}>
                    <View style={styles.avatarSmall}>
                      <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.textWrap}>
                      <Text style={[styles.name, { color: palette.textPrimary }]}>{displayName}</Text>
                      <Text style={[styles.lastMessage, { color: palette.textSecondary }]}>{item.email}</Text>
                    </View>
                    {startingChatWith === item.uid ? <ActivityIndicator size="small" /> : null}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
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
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#BFD7F7',
  },
  avatarSmall: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#BFD7F7',
  },
  avatarText: { fontWeight: '700', fontSize: 18, color: '#234' },
  textWrap: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: '700' },
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
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  modalCard: {
    maxHeight: '70%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 26,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 14 },
  error: { color: '#D93025', marginHorizontal: 16, marginBottom: 8 },
  empty: { textAlign: 'center', marginTop: 24 },
});
