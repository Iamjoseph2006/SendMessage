import Ionicons from '@expo/vector-icons/Ionicons';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
} from 'expo-audio';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { useChat } from '@/src/features/chat/hooks/useChat';
import { ChatLocation, ChatMessage, getChatById, markChatAsRead } from '@/src/features/chat/services/chatService';
import { getUsers, UserProfile, getUsersByUids, listenUserById } from '@/src/features/users/services/userService';
import { darkPalette, lightPalette, useAppTheme } from '@/src/presentation/theme/appTheme';

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

function AudioBubble({ uri, isMe }: { uri: string; isMe: boolean }) {
  const player = useAudioPlayer(uri || undefined);
  const status = useAudioPlayerStatus(player);

  return (
    <View style={[styles.audioBubble, isMe ? styles.audioBubbleMe : null]}>
      <Pressable onPress={() => (status.playing ? player.pause() : player.play())} style={styles.audioButton}>
        <Ionicons name={status.playing ? 'pause' : 'play'} size={16} color="#FFF" />
      </Pressable>
      <Text style={[styles.audioLabel, isMe ? styles.meText : null]}>{status.playing ? 'Reproduciendo audio...' : 'Audio'}</Text>
    </View>
  );
}

const getMessagePreview = (message: Pick<ChatMessage, 'type' | 'text'>) => {
  if (message.type === 'image') return '📷 Imagen';
  if (message.type === 'audio') return '🎤 Audio';
  if (message.type === 'location') return '📍 Ubicación';
  return message.text || 'Mensaje';
};

export default function ConversationScreen() {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const router = useRouter();
  const { isDark } = useAppTheme();
  const palette = isDark ? darkPalette : lightPalette;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const {
    messages,
    input,
    setInput,
    canSend,
    sendText,
    sendImage,
    sendAudio,
    sendLocation,
    forwardMessage,
    editOwnMessage,
    deleteForMe,
    deleteForEveryone,
    togglePin,
    toggleStar,
    replyingTo,
    setReplyingTo,
    react,
    loading,
    error,
  } = useChat(chatId ?? null, user?.uid ?? null);

  const [chatName, setChatName] = useState('Chat');
  const [contactProfile, setContactProfile] = useState<UserProfile | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showAttachSheet, setShowAttachSheet] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
  const [contacts, setContacts] = useState<UserProfile[]>([]);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const visibleMessages = useMemo(
    () => messages.filter((message) => !message.deletedFor?.includes(user?.uid ?? '')),
    [messages, user?.uid],
  );

  useEffect(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, [visibleMessages.length]);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => listRef.current?.scrollToEnd({ animated: true }));
    return () => showSub.remove();
  }, []);

  useEffect(() => {
    if (!chatId || !user?.uid) return;
    markChatAsRead(chatId, user.uid).catch(() => undefined);
  }, [chatId, user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    getUsers(user.uid).then((directory) => setContacts(directory.slice(0, 8))).catch(() => setContacts([]));
  }, [user?.uid]);

  useEffect(() => {
    if (!chatId || !user?.uid) return;

    let unsubscribePresence: (() => void) | undefined;
    getChatById(chatId)
      .then(async (chat) => {
        const contactUid = chat?.participants.find((participantUid) => participantUid !== user.uid);
        if (!contactUid) {
          setChatName('Chat');
          return;
        }

        const [profile] = await getUsersByUids([contactUid]);
        setContactProfile(profile ?? null);
        setChatName(profile?.name ?? profile?.email ?? 'Chat');
        unsubscribePresence = listenUserById(contactUid, (nextProfile) => setContactProfile(nextProfile));
      })
      .catch(() => {
        setChatName('Chat');
        setContactProfile(null);
      });

    return () => unsubscribePresence?.();
  }, [chatId, user?.uid]);

  useEffect(() => () => { recorder.stop().catch(() => undefined); }, [recorder]);

  const openAttachPicker = () => setShowAttachSheet(true);

  const handlePickPhoto = async () => {
    setShowAttachSheet(false);
    const result = await launchImageLibrary({ mediaType: 'photo' });
    const uri = result.assets?.[0]?.uri;
    if (uri) await sendImage(uri);
  };

  const handleCamera = async () => {
    setShowAttachSheet(false);
    const result = await launchCamera({ mediaType: 'photo' });
    const uri = result.assets?.[0]?.uri;
    if (uri) await sendImage(uri);
  };

  const handleLocation = async () => {
    setShowAttachSheet(false);
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Permiso requerido', 'Debes conceder permiso de ubicación para compartirla.');
      return;
    }

    const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const location: ChatLocation = { latitude: current.coords.latitude, longitude: current.coords.longitude };
    await sendLocation(location);
  };

  const handleShareContact = async () => {
    if (!contacts.length) {
      Alert.alert('Contactos', 'No hay contactos para compartir.');
      return;
    }
    setShowAttachSheet(false);
    const first = contacts[0];
    await setInput(`👤 Contacto: ${first.name || first.email} (${first.email})`);
  };

  const onAudioPress = async () => {
    if (isRecording) {
      await recorder.stop();
      if (recorder.uri) await sendAudio(recorder.uri);
      setIsRecording(false);
      return;
    }

    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso requerido', 'Debes conceder permiso de micrófono para enviar audios.');
      return;
    }

    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setIsRecording(true);
  };

  const openContext = (message: ChatMessage) => {
    setSelectedMessage(message);
    setShowContextMenu(true);
  };

  const renderReactions = (message: ChatMessage) => {
    const entries = Object.entries(message.reactions ?? {}).filter(([, users]) => users.length > 0);
    if (!entries.length) return null;
    return (
      <View style={styles.reactionRow}>
        {entries.map(([emoji, users]) => (
          <Text key={`${message.id}-${emoji}`} style={styles.reactionChip}>{emoji} {users.length}</Text>
        ))}
      </View>
    );
  };

  const availabilityLabel = useMemo(() => {
    if (!contactProfile) return 'No disponible';
    if (contactProfile.online) return 'En línea';
    const lastSeenDate = contactProfile.lastSeen?.toDate();
    if (!lastSeenDate) return 'No disponible';
    const time = new Intl.DateTimeFormat('es-ES', { hour: 'numeric', minute: '2-digit' }).format(lastSeenDate);
    return `Última vez a las ${time}`;
  }, [contactProfile]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 8 : 0} style={styles.safeArea}>
        <View style={[styles.header, { borderBottomColor: palette.border, backgroundColor: palette.surface }]}> 
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color={palette.textPrimary} />
          </Pressable>
          <Pressable style={styles.headerTextWrap} onPress={() => router.push(`/chat/info/${chatId}`)}>
            <Text style={[styles.headerName, { color: palette.textPrimary }]} numberOfLines={1}>{chatName}</Text>
            <Text style={[styles.headerSubtitle, { color: contactProfile?.online ? '#14A44D' : palette.textSecondary }]} numberOfLines={1}>{availabilityLabel}</Text>
          </Pressable>
          <Pressable onPress={() => router.push(`/chat/info/${chatId}`)} style={styles.infoButton}>
            <Ionicons name="information-circle-outline" size={21} color={palette.textSecondary} />
          </Pressable>
        </View>

        {loading ? <ActivityIndicator style={styles.loading} size="large" /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <FlatList
          ref={listRef}
          data={visibleMessages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: 10 }]}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => {
            const isMe = item.senderId === user?.uid;
            const locationLink = item.location ? `https://maps.google.com/?q=${item.location.latitude},${item.location.longitude}` : '';

            return (
              <Pressable onLongPress={() => openContext(item)} style={[styles.bubble, isMe ? styles.me : styles.contact]}>
                {item.replyTo ? (
                  <View style={styles.replyWrap}>
                    <Text style={styles.replyText} numberOfLines={1}>↪ {item.replyTo.senderId === user?.uid ? 'Tú' : 'Contacto'}: {getMessagePreview(item.replyTo as ChatMessage)}</Text>
                  </View>
                ) : null}
                {item.forwardedFrom ? <Text style={styles.forwardTag}>Reenviado</Text> : null}
                {item.type === 'image' && item.mediaUrl ? <Image source={{ uri: item.mediaUrl }} style={styles.image} /> : null}
                {item.type === 'audio' && item.audioUrl ? <AudioBubble uri={item.audioUrl} isMe={isMe} /> : null}
                {item.type === 'location' && item.location ? (
                  <Pressable onPress={() => Linking.openURL(locationLink)}>
                    <Text style={[styles.locationText, isMe ? styles.meText : null]}>📍 Ver ubicación</Text>
                  </Pressable>
                ) : null}
                {item.text ? <Text style={[styles.messageText, isMe ? styles.meText : null]}>{item.text}</Text> : null}
                {renderReactions(item)}
              </Pressable>
            );
          }}
          ListEmptyComponent={!loading ? <Text style={[styles.empty, { color: palette.textSecondary }]}>Aún no hay mensajes en esta conversación.</Text> : null}
        />

        {replyingTo ? (
          <View style={[styles.replyingBar, { borderColor: palette.border, backgroundColor: palette.surface }]}> 
            <Text style={[styles.replyingLabel, { color: palette.textSecondary }]} numberOfLines={1}>Respondiendo: {getMessagePreview(replyingTo)}</Text>
            <Pressable onPress={() => setReplyingTo(null)}><Ionicons name="close" size={16} color={palette.textSecondary} /></Pressable>
          </View>
        ) : null}

        <View style={[styles.composer, { borderTopColor: palette.border, backgroundColor: palette.surface, paddingBottom: Platform.OS === 'ios' ? Math.max(6, insets.bottom) : 8 }]}>
          <Pressable style={styles.attachButton} onPress={openAttachPicker}><Ionicons name="add" size={20} color={palette.textPrimary} /></Pressable>
          <TextInput
            style={[styles.input, { borderColor: palette.border, color: palette.textPrimary }]}
            placeholder="Mensaje"
            placeholderTextColor="#8C9DB0"
            value={input}
            onChangeText={setInput}
            onFocus={() => listRef.current?.scrollToEnd({ animated: true })}
          />
          <Pressable style={[styles.audioAction, isRecording ? styles.audioActionRecording : null]} onPress={onAudioPress}><Ionicons name={isRecording ? 'stop' : 'mic'} size={16} color="#FFF" /></Pressable>
          <Pressable style={[styles.sendButton, !canSend && styles.sendButtonDisabled]} disabled={!canSend} onPress={sendText}><Ionicons name="send" size={16} color="#FFF" /></Pressable>
        </View>
      </KeyboardAvoidingView>

      <Modal transparent visible={showAttachSheet} animationType="slide" onRequestClose={() => setShowAttachSheet(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setShowAttachSheet(false)}>
          <View style={styles.sheetContainer}>
            {[
              { icon: 'images', label: 'Fotos', onPress: handlePickPhoto, color: '#1F7AE0' },
              { icon: 'camera', label: 'Cámara', onPress: handleCamera, color: '#009688' },
              { icon: 'location', label: 'Ubicación', onPress: handleLocation, color: '#F57C00' },
              { icon: 'person', label: 'Contacto', onPress: handleShareContact, color: '#8E24AA' },
              { icon: 'document-text', label: 'Documento', onPress: () => setShowAttachSheet(false), color: '#546E7A' },
              { icon: 'stats-chart', label: 'Encuesta', onPress: () => setShowAttachSheet(false), color: '#2E7D32' },
              { icon: 'calendar', label: 'Evento', onPress: () => setShowAttachSheet(false), color: '#C2185B' },
              { icon: 'sparkles', label: 'Imágenes IA', onPress: () => setShowAttachSheet(false), color: '#5E35B1' },
            ].map((action) => (
              <Pressable key={action.label} style={styles.sheetItem} onPress={action.onPress}>
                <View style={[styles.sheetIconCircle, { backgroundColor: action.color }]}><Ionicons name={action.icon as any} size={22} color="#FFF" /></View>
                <Text style={styles.sheetLabel}>{action.label}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal transparent visible={showContextMenu} animationType="fade" onRequestClose={() => setShowContextMenu(false)}>
        <Pressable style={styles.contextOverlay} onPress={() => setShowContextMenu(false)}>
          <View style={styles.contextCard}>
            <View style={styles.contextReactions}>
              {REACTIONS.map((emoji) => (
                <Pressable
                  key={emoji}
                  onPress={() => {
                    if (selectedMessage) react(selectedMessage, emoji);
                    setShowContextMenu(false);
                  }}>
                  <Text style={styles.contextReactionEmoji}>{emoji}</Text>
                </Pressable>
              ))}
            </View>
            {[
              { icon: 'arrow-undo', label: 'Responder', onPress: () => selectedMessage && setReplyingTo(selectedMessage) },
              { icon: 'share-social', label: 'Reenviar', onPress: () => selectedMessage && forwardMessage(selectedMessage) },
              { icon: 'copy', label: 'Copiar', onPress: () => selectedMessage && setInput(selectedMessage.text || '') },
              { icon: 'information-circle-outline', label: 'Info', onPress: () => Alert.alert('Info', selectedMessage ? getMessagePreview(selectedMessage) : '') },
              { icon: 'star', label: 'Destacar', onPress: () => selectedMessage && toggleStar(selectedMessage) },
              { icon: 'pin', label: 'Conservar/Fijar', onPress: () => selectedMessage && togglePin(selectedMessage) },
              { icon: 'create', label: 'Editar', onPress: () => selectedMessage && editOwnMessage(selectedMessage.id, `${selectedMessage.text} ✏️`) },
              { icon: 'trash', label: 'Eliminar', onPress: () => selectedMessage && deleteForMe(selectedMessage.id) },
              { icon: 'trash-bin', label: 'Eliminar para todos', onPress: () => selectedMessage && deleteForEveryone(selectedMessage.id) },
            ].map((action) => (
              <Pressable
                key={action.label}
                style={styles.contextRow}
                onPress={() => {
                  action.onPress();
                  setShowContextMenu(false);
                }}>
                <Ionicons name={action.icon as any} size={18} color="#DCE7F8" />
                <Text style={styles.contextLabel}>{action.label}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 10 },
  backButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTextWrap: { flex: 1, gap: 1 },
  infoButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerName: { fontSize: 18, fontWeight: '700' },
  headerSubtitle: { fontSize: 12, fontWeight: '600' },
  loading: { marginTop: 12 },
  listContent: { paddingHorizontal: 12, paddingVertical: 14, gap: 8, flexGrow: 1 },
  bubble: { maxWidth: '82%', borderRadius: 16, paddingVertical: 8, paddingHorizontal: 12, gap: 4 },
  me: { alignSelf: 'flex-end', backgroundColor: '#1F7AE0' },
  contact: { alignSelf: 'flex-start', backgroundColor: '#1A2430' },
  replyWrap: { borderLeftWidth: 2, borderLeftColor: '#8AB7EE', paddingLeft: 6 },
  replyText: { fontSize: 12, color: '#A4BEDA' },
  forwardTag: { fontSize: 11, color: '#A7B5C5', fontStyle: 'italic' },
  image: { width: 180, height: 180, borderRadius: 10 },
  audioBubble: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  audioBubbleMe: { alignSelf: 'flex-end' },
  audioButton: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#2C5D95', alignItems: 'center', justifyContent: 'center' },
  audioLabel: { fontSize: 12, color: '#DDE9F6' },
  locationText: { textDecorationLine: 'underline', color: '#CBE5FF', fontWeight: '700' },
  messageText: { fontSize: 15, color: '#E6F0FF' },
  meText: { color: '#FFFFFF' },
  reactionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  reactionChip: { backgroundColor: '#00000040', color: '#FFF', borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2, fontSize: 11 },
  replyingBar: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', gap: 8, alignItems: 'center' },
  replyingLabel: { flex: 1, fontSize: 12 },
  composer: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 10, paddingTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  attachButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  audioAction: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#1F7AE0', alignItems: 'center', justifyContent: 'center' },
  audioActionRecording: { backgroundColor: '#D93025' },
  input: { flex: 1, borderWidth: 1, borderRadius: 23, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15 },
  sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1F7AE0', alignItems: 'center', justifyContent: 'center' },
  sendButtonDisabled: { opacity: 0.5 },
  empty: { textAlign: 'center', marginTop: 22 },
  error: { color: '#D93025', marginHorizontal: 12, marginTop: 8 },
  sheetOverlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
  sheetContainer: { backgroundColor: '#111923', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  sheetItem: { width: '22%', alignItems: 'center', gap: 6 },
  sheetIconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  sheetLabel: { color: '#E3EEFF', textAlign: 'center', fontSize: 12, fontWeight: '600' },
  contextOverlay: { flex: 1, backgroundColor: '#00000090', justifyContent: 'center', padding: 20 },
  contextCard: { backgroundColor: '#121A25', borderRadius: 18, padding: 14, gap: 8 },
  contextReactions: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, paddingHorizontal: 4 },
  contextReactionEmoji: { fontSize: 28 },
  contextRow: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 8 },
  contextLabel: { color: '#DCE7F8', fontSize: 14, fontWeight: '600' },
});
