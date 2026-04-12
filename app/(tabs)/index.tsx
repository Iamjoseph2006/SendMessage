import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Modal, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { ChatSummary } from '@/src/domain/entities';
import { useChatsViewModel } from '@/src/presentation/viewmodels/useChatsViewModel';

export default function ChatsScreen() {
  const { chats } = useChatsViewModel();
  const router = useRouter();
  const [previewChat, setPreviewChat] = useState<ChatSummary | null>(null);

  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <Text style={styles.title}>Chats</Text>
      </View>
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        renderItem={({ item }) => (
          <Pressable
            style={styles.chatRow}
            onPress={() => router.push(`/chat/${item.id}`)}
            onLongPress={() => setPreviewChat(item)}
            delayLongPress={180}>
            <View style={[styles.avatar, { backgroundColor: item.avatarColor }]}>
              <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
            </View>

            <View style={styles.textWrap}>
              <Text style={styles.name}>{item.name}</Text>
              <Text numberOfLines={1} style={styles.lastMessage}>
                {item.lastMessage}
              </Text>
            </View>

            <View style={styles.rightColumn}>
              <Text style={styles.time}>{item.time}</Text>
              {item.unreadCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.unreadCount}</Text>
                </View>
              ) : (
                <Ionicons name="checkmark-done" size={18} color="#A0AEC0" />
              )}
            </View>
          </Pressable>
        )}
      />

      <Modal visible={!!previewChat} transparent animationType="fade" onRequestClose={() => setPreviewChat(null)}>
        <Pressable style={styles.previewBackdrop} onPress={() => setPreviewChat(null)}>
          <View style={styles.previewCard}>
            <Text style={styles.previewName}>{previewChat?.name}</Text>
            <Text style={styles.previewText}>{previewChat?.lastMessage}</Text>
            <Text style={styles.previewHint}>Desliza para abrir chat</Text>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  title: { fontSize: 34, fontWeight: '800', color: '#1A2B44' },
  content: { paddingVertical: 8 },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '700', fontSize: 19, color: '#234' },
  textWrap: { flex: 1, gap: 2 },
  name: { fontSize: 17, fontWeight: '700', color: '#22354D' },
  lastMessage: { fontSize: 14, color: '#6A7D95' },
  rightColumn: { alignItems: 'flex-end', gap: 6 },
  time: { fontSize: 12, color: '#6A7D95' },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1F7AE0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  previewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(20,35,54,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  previewCard: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 16,
    gap: 8,
  },
  previewName: { fontSize: 17, fontWeight: '700', color: '#22354D' },
  previewText: { fontSize: 14, color: '#4D627D' },
  previewHint: { fontSize: 12, color: '#7E8FA5' },
});
