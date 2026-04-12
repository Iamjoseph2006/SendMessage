import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { useChat } from '@/src/features/chat/hooks/useChat';
import { getChatById } from '@/src/features/chat/services/chatService';
import { getUsersByUids } from '@/src/features/users/services/userService';
import { darkPalette, lightPalette, useAppTheme } from '@/src/presentation/theme/appTheme';

export default function ConversationScreen() {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const router = useRouter();
  const { isDark } = useAppTheme();
  const palette = isDark ? darkPalette : lightPalette;
  const { user } = useAuth();

  const { messages, input, setInput, canSend, sendText, loading, error } = useChat(chatId ?? null, user?.uid ?? null);
  const [chatName, setChatName] = useState('Chat');

  useEffect(() => {
    if (!chatId || !user?.uid) {
      return;
    }

    getChatById(chatId)
      .then(async (chat) => {
        if (!chat) {
          setChatName('Chat');
          return;
        }

        const contactUid = chat.participants.find((participantUid) => participantUid !== user.uid);
        if (!contactUid) {
          setChatName('Chat');
          return;
        }

        const [profile] = await getUsersByUids([contactUid]);
        setChatName(profile?.name ?? profile?.email ?? 'Chat');
      })
      .catch(() => {
        setChatName('Chat');
      });
  }, [chatId, user?.uid]);

  const emptyState = useMemo(
    () => <Text style={[styles.empty, { color: palette.textSecondary }]}>Aún no hay mensajes en esta conversación.</Text>,
    [palette.textSecondary],
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}> 
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.safeArea}>
        <View style={[styles.header, { borderBottomColor: palette.border, backgroundColor: palette.surface }]}> 
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color={palette.textPrimary} />
          </Pressable>
          <Text style={[styles.headerName, { color: palette.textPrimary }]} numberOfLines={1}>
            {chatName}
          </Text>
        </View>

        {loading ? <ActivityIndicator style={styles.loading} size="large" /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={!loading ? emptyState : null}
          renderItem={({ item }) => {
            const isMe = item.senderId === user?.uid;
            return (
              <View style={[styles.bubble, isMe ? styles.me : styles.contact]}>
                <Text style={[styles.messageText, isMe && styles.meText]}>{item.text}</Text>
              </View>
            );
          }}
        />

        <View style={[styles.composer, { borderTopColor: palette.border, backgroundColor: palette.surface }]}> 
          <TextInput
            style={[styles.input, { borderColor: palette.border, color: palette.textPrimary }]}
            placeholder="Mensaje"
            placeholderTextColor="#8C9DB0"
            value={input}
            onChangeText={setInput}
          />
          <Pressable style={[styles.sendButton, !canSend && styles.sendButtonDisabled]} disabled={!canSend} onPress={sendText}>
            <Ionicons name="send" size={16} color="#FFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerName: { fontSize: 18, fontWeight: '700', flex: 1 },
  loading: { marginTop: 12 },
  listContent: { paddingHorizontal: 12, paddingVertical: 14, gap: 8, flexGrow: 1 },
  bubble: {
    maxWidth: '80%',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  me: { alignSelf: 'flex-end', backgroundColor: '#1F7AE0' },
  contact: { alignSelf: 'flex-start', backgroundColor: '#E2ECF8' },
  messageText: { fontSize: 15, color: '#13253B' },
  meText: { color: '#FFFFFF' },
  composer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1F7AE0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  empty: { textAlign: 'center', marginTop: 22 },
  error: { color: '#D93025', marginHorizontal: 12, marginTop: 8 },
});
