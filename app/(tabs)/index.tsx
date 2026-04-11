import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useChatsViewModel } from '@/src/presentation/viewmodels/useChatsViewModel';

export default function ChatsScreen() {
  const { chats } = useChatsViewModel();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>Chats</Text>
      </View>

      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        renderItem={({ item }) => (
          <Pressable style={styles.chatRow} onPress={() => router.push(`/chat/${item.id}`)}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E6EBF2',
  },
  title: { fontSize: 30, fontWeight: '800', color: '#1A2B44' },
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
});
