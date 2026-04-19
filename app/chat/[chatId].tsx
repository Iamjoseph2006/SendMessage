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
  Keyboard,
  Image,
  KeyboardAvoidingView,
  Linking,
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
import { UserProfile, getUsersByUids, listenUserById } from '@/src/features/users/services/userService';
import { darkPalette, lightPalette, useAppTheme } from '@/src/presentation/theme/appTheme';

const EDIT_WINDOW_MS = 15 * 60 * 1000;

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

const getMessagePreview = (message: ChatMessage) => {
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
  const hasAutoScrolledRef = useRef(false);

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
    loading,
    error,
  } = useChat(chatId ?? null, user?.uid ?? null);
  const [chatName, setChatName] = useState('Chat');
  const [contactProfile, setContactProfile] = useState<UserProfile | null>(null);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);

  const visibleMessages = useMemo(
    () => messages.filter((message) => !message.deletedFor?.includes(user?.uid ?? '')),
    [messages, user?.uid],
  );

  const pinnedMessage = useMemo(() => visibleMessages.find((message) => message.isPinned), [visibleMessages]);

  useEffect(() => {
    if (!visibleMessages.length) {
      return;
    }

    const shouldAnimate = hasAutoScrolledRef.current;
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: shouldAnimate });
      hasAutoScrolledRef.current = true;
    });
  }, [visibleMessages]);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      listRef.current?.scrollToEnd({ animated: true });
    });

    return () => {
      showSub.remove();
    };
  }, []);

  useEffect(() => {
    if (!chatId || !user?.uid) {
      return;
    }

    markChatAsRead(chatId, user.uid).catch(() => undefined);
  }, [chatId, user?.uid]);

  useEffect(() => {
    if (!chatId || !user?.uid) {
      return;
    }

    let unsubscribePresence: (() => void) | undefined;
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
        setContactProfile(profile ?? null);
        setChatName(profile?.name ?? profile?.email ?? 'Chat');
        unsubscribePresence = listenUserById(contactUid, (nextProfile) => {
          setContactProfile(nextProfile);
        });
      })
      .catch(() => {
        setChatName('Chat');
        setContactProfile(null);
      });

    return () => {
      unsubscribePresence?.();
    };
  }, [chatId, user?.uid]);

  useEffect(() => {
    if (!loading && visibleMessages.length > 0) {
      listRef.current?.scrollToEnd({ animated: false });
    }
  }, [chatId, loading, visibleMessages.length]);

  const availabilityLabel = useMemo(() => {
    if (!contactProfile) {
      return 'No disponible';
    }

    if (contactProfile.online) {
      return 'En línea';
    }

    const lastSeenDate = contactProfile.lastSeen?.toDate();
    if (!lastSeenDate) {
      return 'No disponible';
    }

    const now = new Date();
    const isToday = now.toDateString() === lastSeenDate.toDateString();
    const time = new Intl.DateTimeFormat('es-ES', { hour: 'numeric', minute: '2-digit' }).format(lastSeenDate);
    if (isToday) {
      return `Última vez hoy a las ${time}`;
    }

    const dateLabel = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: '2-digit' }).format(lastSeenDate);
    return `Última vez ${dateLabel} a las ${time}`;
  }, [contactProfile]);

  useEffect(() => {
    return () => {
      recorder.stop().catch(() => undefined);
    };
  }, [recorder]);

  const openPicker = () => {
    Alert.alert('Adjuntar', 'Selecciona qué deseas enviar', [
      {
        text: 'Cámara',
        onPress: async () => {
          const result = await launchCamera({ mediaType: 'photo' });
          const uri = result.assets?.[0]?.uri;
          if (uri) {
            await sendImage(uri);
          }
        },
      },
      {
        text: 'Galería',
        onPress: async () => {
          const result = await launchImageLibrary({ mediaType: 'photo' });
          const uri = result.assets?.[0]?.uri;
          if (uri) {
            await sendImage(uri);
          }
        },
      },
      {
        text: 'Ubicación',
        onPress: async () => {
          const permission = await Location.requestForegroundPermissionsAsync();
          if (permission.status !== 'granted') {
            Alert.alert('Permiso requerido', 'Debes conceder permiso de ubicación para compartirla.');
            return;
          }

          const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const location: ChatLocation = {
            latitude: current.coords.latitude,
            longitude: current.coords.longitude,
          };
          await sendLocation(location);
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const onAudioPress = async () => {
    if (isRecording) {
      await recorder.stop();
      if (recorder.uri) {
        await sendAudio(recorder.uri);
      }
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

  const onMessageActions = (message: ChatMessage) => {
    const isMe = message.senderId === user?.uid;
    const createdAtMs = message.createdAt?.toMillis() ?? 0;
    const canEdit = isMe && Date.now() - createdAtMs <= EDIT_WINDOW_MS && message.type === 'text';

    Alert.alert('Mensaje', getMessagePreview(message), [
      { text: 'Responder', onPress: () => setReplyingTo(message) },
      { text: 'Reenviar', onPress: () => forwardMessage(message) },
      { text: 'Copiar', onPress: () => setInput(message.text || '') },
      { text: message.isPinned ? 'Quitar fijado' : 'Fijar', onPress: () => togglePin(message) },
      { text: message.isStarredBy?.includes(user?.uid ?? '') ? 'Quitar destacado' : 'Destacar', onPress: () => toggleStar(message) },
      canEdit
        ? {
            text: 'Editar',
            onPress: () => {
              Alert.prompt('Editar mensaje', 'Actualiza el texto', async (value) => {
                if (value) {
                  await editOwnMessage(message.id, value);
                }
              }, 'plain-text', message.text);
            },
          }
        : { text: 'Info', onPress: () => Alert.alert('Info', `Tipo: ${message.type}\nEnviado por: ${message.senderId}`) },
      { text: 'Eliminar para mí', style: 'destructive', onPress: () => deleteForMe(message.id) },
      isMe ? { text: 'Eliminar para todos', style: 'destructive', onPress: () => deleteForEveryone(message.id) } : { text: 'Cerrar', style: 'cancel' },
    ]);
  };

  const emptyState = useMemo(
    () => <Text style={[styles.empty, { color: palette.textSecondary }]}>Aún no hay mensajes en esta conversación.</Text>,
    [palette.textSecondary],
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}> 
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 6 : 0}
        style={styles.safeArea}>
        <View style={[styles.header, { borderBottomColor: palette.border, backgroundColor: palette.surface }]}> 
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color={palette.textPrimary} />
          </Pressable>
          <Pressable style={styles.headerTextWrap} onPress={() => router.push(`/chat/info/${chatId}`)}>
            <Text style={[styles.headerName, { color: palette.textPrimary }]} numberOfLines={1}>
              {chatName}
            </Text>
            <Text style={[styles.headerSubtitle, { color: contactProfile?.online ? '#14A44D' : palette.textSecondary }]} numberOfLines={1}>
              {availabilityLabel}
            </Text>
          </Pressable>
          <Pressable onPress={() => router.push(`/chat/info/${chatId}`)} style={styles.infoButton}>
            <Ionicons name="information-circle-outline" size={21} color={palette.textSecondary} />
          </Pressable>
        </View>

        {pinnedMessage ? (
          <View style={[styles.pinnedBar, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Ionicons name="pin" size={14} color="#1F7AE0" />
            <Text style={[styles.pinnedText, { color: palette.textPrimary }]} numberOfLines={1}>
              {getMessagePreview(pinnedMessage)}
            </Text>
          </View>
        ) : null}

        {loading ? <ActivityIndicator style={styles.loading} size="large" /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <FlatList
          ref={listRef}
          data={visibleMessages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: 24 + insets.bottom }]}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={!loading ? emptyState : null}
          renderItem={({ item }) => {
            const isMe = item.senderId === user?.uid;
            const locationLink = item.location ? `https://maps.google.com/?q=${item.location.latitude},${item.location.longitude}` : '';

            return (
              <Pressable onLongPress={() => onMessageActions(item)} style={[styles.bubble, isMe ? styles.me : styles.contact]}>
                {item.replyTo ? (
                  <View style={styles.replyWrap}>
                    <Text style={styles.replyText} numberOfLines={1}>
                      ↪ {item.replyTo.senderId === user?.uid ? 'Tú' : 'Contacto'}: {getMessagePreview(item.replyTo as ChatMessage)}
                    </Text>
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

                {item.text ? <Text style={[styles.messageText, isMe && styles.meText]}>{item.text}</Text> : null}
                {item.editedAt ? <Text style={[styles.editedText, isMe ? styles.meText : null]}>Editado</Text> : null}
              </Pressable>
            );
          }}
        />

        {replyingTo ? (
          <View style={[styles.replyingBar, { borderColor: palette.border, backgroundColor: palette.surface }]}> 
            <Text style={[styles.replyingLabel, { color: palette.textSecondary }]} numberOfLines={1}>
              Respondiendo: {getMessagePreview(replyingTo)}
            </Text>
            <Pressable onPress={() => setReplyingTo(null)}>
              <Ionicons name="close" size={16} color={palette.textSecondary} />
            </Pressable>
          </View>
        ) : null}

        <View
          style={[
            styles.composer,
            {
              borderTopColor: palette.border,
              backgroundColor: palette.surface,
              paddingBottom: Platform.OS === 'ios' ? Math.max(6, insets.bottom - 2) : 8,
            },
          ]}>
          <Pressable style={styles.attachButton} onPress={openPicker}>
            <Ionicons name="add" size={20} color={palette.textPrimary} />
          </Pressable>
          <TextInput
            style={[styles.input, { borderColor: palette.border, color: palette.textPrimary }]}
            placeholder="Mensaje"
            placeholderTextColor="#8C9DB0"
            value={input}
            onChangeText={setInput}
            onFocus={() => listRef.current?.scrollToEnd({ animated: true })}
          />
          <Pressable style={[styles.audioAction, isRecording ? styles.audioActionRecording : null]} onPress={onAudioPress}>
            <Ionicons name={isRecording ? 'stop' : 'mic'} size={16} color="#FFF" />
          </Pressable>
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
  headerTextWrap: { flex: 1, gap: 1 },
  infoButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerName: { fontSize: 18, fontWeight: '700' },
  headerSubtitle: { fontSize: 12, fontWeight: '600' },
  pinnedBar: { flexDirection: 'row', gap: 8, borderBottomWidth: 1, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center' },
  pinnedText: { flex: 1, fontSize: 13, fontWeight: '600' },
  loading: { marginTop: 12 },
  listContent: { paddingHorizontal: 12, paddingVertical: 14, gap: 8, flexGrow: 1 },
  bubble: {
    maxWidth: '82%',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 4,
  },
  me: { alignSelf: 'flex-end', backgroundColor: '#1F7AE0' },
  contact: { alignSelf: 'flex-start', backgroundColor: '#E2ECF8' },
  replyWrap: { borderLeftWidth: 2, borderLeftColor: '#8AB7EE', paddingLeft: 6 },
  replyText: { fontSize: 12, color: '#4E6A88' },
  forwardTag: { fontSize: 11, color: '#5E7187', fontStyle: 'italic' },
  image: { width: 180, height: 180, borderRadius: 10 },
  audioBubble: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  audioBubbleMe: { alignSelf: 'flex-end' },
  audioButton: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#2C5D95', alignItems: 'center', justifyContent: 'center' },
  audioLabel: { fontSize: 12, color: '#22354D' },
  locationText: { textDecorationLine: 'underline', color: '#0F4A85', fontWeight: '700' },
  messageText: { fontSize: 15, color: '#13253B' },
  meText: { color: '#FFFFFF' },
  editedText: { fontSize: 11, color: '#7089A5' },
  replyingBar: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', gap: 8, alignItems: 'center' },
  replyingLabel: { flex: 1, fontSize: 12 },
  composer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attachButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  audioAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1F7AE0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioActionRecording: { backgroundColor: '#D93025' },
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
