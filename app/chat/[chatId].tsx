import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { FlatList, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { chatSummaries } from '@/src/data/mock/mockData';
import { Message } from '@/src/domain/entities';
import { useConversationViewModel } from '@/src/presentation/viewmodels/useConversationViewModel';
import { useState } from 'react';

const statusIcon = (status: Message['status']) => {
  if (status === 'read') return { name: 'checkmark-done', color: '#1F7AE0' } as const;
  if (status === 'received') return { name: 'checkmark-done', color: '#97A8BE' } as const;
  return { name: 'checkmark', color: '#97A8BE' } as const;
};

const quickActions = [
  { id: 'doc', label: 'Documento', text: '📎 Documento adjunto' },
  { id: 'img', label: 'Imagen', text: '🖼️ Imagen enviada' },
  { id: 'camera', label: 'Cámara', text: '📷 Foto tomada y enviada' },
  { id: 'audio', label: 'Audio', text: '🎤 Audio (00:12)' },
  { id: 'location', label: 'Ubicación', text: '📍 Ubicación en tiempo real compartida' },
  { id: 'emoji', label: '😊 Emoji', text: '😊' },
];

export default function ConversationScreen() {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const { messages, input, setInput, canSend, sendText, sendTemplateMessage } =
    useConversationViewModel(chatId);
  const [showActions, setShowActions] = useState(false);

  const chatName = chatSummaries.find((chat) => chat.id === chatId)?.name ?? 'Chat';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerName}>{chatName}</Text>
        <Text style={styles.headerSubtitle}>En línea</Text>
      </View>

      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const icon = statusIcon(item.status);
          return (
            <View style={[styles.bubble, item.sender === 'me' ? styles.me : styles.contact]}>
              <Text style={[styles.bubbleText, item.sender === 'me' && styles.meText]}>{item.text}</Text>
              <View style={styles.rowMeta}>
                <Text style={styles.time}>{item.time}</Text>
                {item.sender === 'me' ? <Ionicons name={icon.name} size={14} color={icon.color} /> : null}
              </View>
            </View>
          );
        }}
      />

      {showActions ? (
        <View style={styles.actionPanel}>
          {quickActions.map((action) => (
            <Pressable
              key={action.id}
              style={styles.actionButton}
              onPress={() => {
                sendTemplateMessage(action.text);
                setShowActions(false);
              }}>
              <Text style={styles.actionText}>{action.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.composer}>
        <Pressable style={styles.smallButton} onPress={() => setShowActions((prev) => !prev)}>
          <Ionicons name="add" size={20} color="#1F7AE0" />
        </Pressable>
        <TextInput
          style={styles.input}
          placeholder="Mensaje"
          placeholderTextColor="#8C9DB0"
          value={input}
          onChangeText={setInput}
        />
        <Pressable style={styles.smallButton} onPress={() => sendTemplateMessage('😊')}>
          <Ionicons name="happy-outline" size={19} color="#1F7AE0" />
        </Pressable>
        <Pressable style={styles.sendButton} disabled={!canSend} onPress={sendText}>
          <Ionicons name="send" size={16} color="#FFF" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFF' },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#E6EBF2',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  headerName: { color: '#1A2B44', fontWeight: '700', fontSize: 18 },
  headerSubtitle: { color: '#6A7D95', marginTop: 2, fontSize: 13 },
  list: { flex: 1, backgroundColor: '#F8FBFF' },
  listContent: { padding: 12, gap: 10 },
  bubble: { maxWidth: '82%', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  me: { alignSelf: 'flex-end', backgroundColor: '#DDF0FF' },
  contact: { alignSelf: 'flex-start', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E3EAF4' },
  bubbleText: { color: '#273A52', fontSize: 15 },
  meText: { color: '#1B3552' },
  rowMeta: { flexDirection: 'row', alignSelf: 'flex-end', alignItems: 'center', gap: 4, marginTop: 4 },
  time: { color: '#7388A4', fontSize: 11 },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E6EBF2',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D8E1EE',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 15,
    backgroundColor: '#FFF',
  },
  smallButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ECF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1F7AE0',
  },
  actionPanel: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E6EBF2',
  },
  actionButton: {
    backgroundColor: '#ECF4FF',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  actionText: { color: '#1F4E83', fontSize: 13, fontWeight: '600' },
});
