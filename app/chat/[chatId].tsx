import Ionicons from '@expo/vector-icons/Ionicons';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
} from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { useChat } from '@/src/features/chat/hooks/useChat';
import { ChatLocation, ChatMessage, getChatById, listenChatById, markChatAsRead } from '@/src/features/chat/services/chatService';
import { getUsers, UserProfile, getUsersByUids, listenUserById } from '@/src/features/users/services/userService';
import { darkPalette, lightPalette, useAppTheme } from '@/src/presentation/theme/appTheme';
import { toSafeDate, toSafeMillis } from '@/src/shared/utils/date';

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

const formatMessageTime = (timestamp?: ChatMessage['createdAt']) => {
  const date = toSafeDate(timestamp);
  if (!date) return '';
  return new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' }).format(date);
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
  const [usersMap, setUsersMap] = useState<Record<string, UserProfile>>({});
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDraft, setEditDraft] = useState('');
  const [chatReadMap, setChatReadMap] = useState<Record<string, ChatMessage['createdAt']>>({});
  const [composerHeight, setComposerHeight] = useState(44);
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
    if (!chatId) return;
    const unsubscribe = listenChatById(
      chatId,
      (chat) => setChatReadMap(chat?.lastReadAtByUser ?? {}),
      () => setChatReadMap({}),
    );
    return unsubscribe;
  }, [chatId]);

  useEffect(() => {
    if (!user?.uid) return;
    getUsers(user.uid).then((directory) => setContacts(directory.slice(0, 8))).catch(() => setContacts([]));
  }, [user?.uid]);

  useEffect(() => {
    const senderUids = [...new Set(visibleMessages.map((message) => message.senderId))];
    if (!senderUids.length) return;

    getUsersByUids(senderUids)
      .then((profiles) => {
        const nextMap = profiles.reduce<Record<string, UserProfile>>((acc, profile) => {
          acc[profile.uid] = profile;
          return acc;
        }, {});
        setUsersMap(nextMap);
      })
      .catch(() => setUsersMap({}));
  }, [visibleMessages]);

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

  useEffect(() => () => {
    recorder.stop().catch(() => undefined);
  }, [recorder]);

  const openAttachPicker = () => setShowAttachSheet(true);

  const getSenderName = (senderId?: string) => {
    if (!senderId) return 'Contacto';
    if (senderId === user?.uid) return 'Tú';
    const profile = usersMap[senderId];
    return profile?.name ?? profile?.email ?? 'Contacto';
  };

  const handlePickPhoto = async () => {
    setShowAttachSheet(false);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso requerido', 'Debes conceder permiso de galería para compartir imágenes.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      allowsEditing: false,
      selectionLimit: 1,
    });

    if (result.canceled) return;
    const uri = result.assets?.[0]?.uri;
    if (uri) await sendImage(uri);
  };

  const handleCamera = async () => {
    setShowAttachSheet(false);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso requerido', 'Debes conceder permiso de cámara para tomar fotos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      allowsEditing: false,
    });

    if (result.canceled) return;
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

  const handleVoiceCall = () => {
    const phone = (contactProfile as UserProfile & { phone?: string } | null)?.phone?.trim();
    if (!phone) {
      Alert.alert('Llamada', `Llamar a ${chatName}`);
      return;
    }
    Linking.openURL(`tel:${phone}`).catch(() => Alert.alert('Error', 'No se pudo iniciar la llamada.'));
  };

  const handleVideoCall = () => {
    Alert.alert('Videollamada', `Iniciar videollamada con ${chatName}`);
  };

  const openMessageInfo = (message: ChatMessage) => {
    Alert.alert(
      'Información del mensaje',
      `Enviado por: ${getSenderName(message.senderId)}\nHora: ${formatMessageTime(message.createdAt) || 'Sin hora'}\nTipo: ${message.type}`,
    );
  };

  const openEditFlow = () => {
    if (!selectedMessage) return;
    if (selectedMessage.senderId !== user?.uid) {
      Alert.alert('Editar', 'Solo puedes editar mensajes enviados por ti.');
      return;
    }
    setEditDraft(selectedMessage.text ?? '');
    setShowContextMenu(false);
    setShowEditModal(true);
  };

  const submitEditMessage = async () => {
    if (!selectedMessage) return;
    await editOwnMessage(selectedMessage.id, editDraft);
    setShowEditModal(false);
  };

  const renderReactions = (message: ChatMessage) => {
    const entries = Object.entries(message.reactions ?? {}).filter(([, users]) => users.length > 0);
    if (!entries.length) return null;
    return (
      <View style={styles.reactionRow}>
        {entries.map(([emoji, users]) => (
          <Text key={`${message.id}-${emoji}`} style={[styles.reactionChip, { backgroundColor: isDark ? '#FFFFFF20' : '#00000012', color: isDark ? '#F5F7FF' : '#1C2D44' }]}>
            {emoji} {users.length}
          </Text>
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

  const getOwnMessageStatus = (message: ChatMessage): 'sent' | 'delivered' | 'read' => {
    if (!user?.uid || !chatId) {
      return 'sent';
    }

    const recipientUid = chatId
      .split('_')
      .find((participantUid) => participantUid && participantUid !== user.uid);
    const recipientLastReadAt = recipientUid ? chatReadMap[recipientUid] : null;
    const sentAt = toSafeMillis(message.createdAt);
    const readAtMillis = toSafeMillis(recipientLastReadAt);

    if (readAtMillis >= sentAt && sentAt > 0) {
      return 'read';
    }

    if (message.deliveredAt) {
      return 'delivered';
    }

    return 'sent';
  };

  const renderMessageStatus = (message: ChatMessage) => {
    const status = getOwnMessageStatus(message);
    if (status === 'read') {
      return <Ionicons name="checkmark-done" size={14} color="#7ED0FF" />;
    }
    if (status === 'delivered') {
      return <Ionicons name="checkmark-done" size={14} color="#DDEBFF" />;
    }
    return <Ionicons name="checkmark" size={12} color="#DDEBFF" />;
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 8 : 0}
        style={styles.safeArea}>
        <View style={[styles.header, { borderBottomColor: palette.border, backgroundColor: palette.surface }]}> 
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color={palette.textPrimary} />
          </Pressable>
          <Pressable style={styles.headerTextWrap} onPress={() => router.push(`/chat/info/${chatId}`)}>
            <Text style={[styles.headerName, { color: palette.textPrimary }]} numberOfLines={1}>{chatName}</Text>
            <Text style={[styles.headerSubtitle, { color: contactProfile?.online ? '#14A44D' : palette.textSecondary }]} numberOfLines={1}>{availabilityLabel}</Text>
          </Pressable>
          <Pressable
            onPress={handleVideoCall}
            style={[
              styles.cleanHeaderAction,
              { backgroundColor: isDark ? '#253140' : '#EAF2FF' },
            ]}>
            <Ionicons name="videocam-outline" size={20} color={isDark ? '#BFD9FF' : '#1B67C9'} />
          </Pressable>
          <Pressable
            onPress={handleVoiceCall}
            style={[
              styles.cleanHeaderAction,
              { backgroundColor: isDark ? '#253140' : '#EAF2FF' },
            ]}>
            <Ionicons name="call-outline" size={18} color={isDark ? '#BFD9FF' : '#1B67C9'} />
          </Pressable>
          <Pressable onPress={() => router.push(`/chat/info/${chatId}`)} style={styles.cleanHeaderAction}>
            <Ionicons name="information-circle-outline" size={21} color={palette.textSecondary} />
          </Pressable>
        </View>

        {loading ? <ActivityIndicator style={styles.loading} size="large" /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <FlatList
          ref={listRef}
          data={visibleMessages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: 12 }]}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => {
            const isMe = item.senderId === user?.uid;
            const locationLink = item.location ? `https://maps.google.com/?q=${item.location.latitude},${item.location.longitude}` : '';
            const bubbleBackground = isMe ? '#0A84FF' : isDark ? '#2A2C32' : '#F1F2F6';
            const bubbleTextColor = isMe ? '#FFFFFF' : isDark ? '#F3F6FC' : '#1A2430';

            return (
              <Pressable onLongPress={() => openContext(item)} style={[styles.bubble, isMe ? styles.me : styles.contact, { backgroundColor: bubbleBackground }]}> 
                {item.replyTo ? (
                  <View style={[styles.replyWrap, { borderLeftColor: isMe ? '#D7E8FF' : '#5B8AC5' }]}>
                    <Text style={[styles.replyText, { color: isMe ? '#EAF4FF' : isDark ? '#B9C5D9' : '#486B92' }]} numberOfLines={1}>
                      ↪ {getSenderName(item.replyTo.senderId)}: {getMessagePreview(item.replyTo as ChatMessage)}
                    </Text>
                  </View>
                ) : null}
                {item.forwardedFrom ? <Text style={[styles.forwardTag, { color: isMe ? '#EAF3FF' : isDark ? '#B8C4D8' : '#5A6778' }]}>Reenviado</Text> : null}
                {item.type === 'image' && item.mediaUrl ? <Image source={{ uri: item.mediaUrl }} style={styles.image} /> : null}
                {item.type === 'audio' && item.audioUrl ? <AudioBubble uri={item.audioUrl} isMe={isMe} /> : null}
                {item.type === 'location' && item.location ? (
                  <Pressable onPress={() => Linking.openURL(locationLink)}>
                    <Text style={[styles.locationText, { color: isMe ? '#E7F2FF' : isDark ? '#9CCBFF' : '#0E5FB4' }]}>📍 Ver ubicación</Text>
                  </Pressable>
                ) : null}
                {item.text ? <Text style={[styles.messageText, { color: bubbleTextColor }]}>{item.text}</Text> : null}
                {renderReactions(item)}
                <View style={styles.messageMeta}>
                  <Text style={[styles.messageTime, { color: isMe ? '#DDEBFF' : isDark ? '#AEB8C9' : '#6A7587' }]}>{formatMessageTime(item.createdAt)}</Text>
                  {isMe ? renderMessageStatus(item) : null}
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={!loading ? <Text style={[styles.empty, { color: palette.textSecondary }]}>Aún no hay mensajes en esta conversación.</Text> : null}
        />

        {replyingTo ? (
          <View style={[styles.replyingBar, { borderColor: palette.border, backgroundColor: palette.surface }]}> 
            <Text style={[styles.replyingLabel, { color: palette.textSecondary }]} numberOfLines={1}>
              Respondiendo a {getSenderName(replyingTo.senderId)}: {getMessagePreview(replyingTo)}
            </Text>
            <Pressable onPress={() => setReplyingTo(null)}><Ionicons name="close" size={16} color={palette.textSecondary} /></Pressable>
          </View>
        ) : null}

        <View style={[styles.composer, { borderTopColor: palette.border, backgroundColor: palette.surface, paddingBottom: Platform.OS === 'ios' ? Math.max(6, insets.bottom) : 8 }]}>
          <Pressable style={styles.attachButton} onPress={openAttachPicker}><Ionicons name="add" size={20} color={palette.textPrimary} /></Pressable>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: palette.border,
                color: palette.textPrimary,
                backgroundColor: isDark ? '#111822' : '#FFF',
                height: composerHeight,
              },
            ]}
            placeholder="Mensaje"
            placeholderTextColor="#8C9DB0"
            value={input}
            onChangeText={setInput}
            multiline
            textAlignVertical="top"
            onContentSizeChange={(event) => {
              const nextHeight = Math.min(120, Math.max(44, event.nativeEvent.contentSize.height + 14));
              setComposerHeight(nextHeight);
            }}
            onFocus={() => listRef.current?.scrollToEnd({ animated: true })}
          />
          <Pressable style={[styles.audioAction, isRecording ? styles.audioActionRecording : null]} onPress={onAudioPress}><Ionicons name={isRecording ? 'stop' : 'mic'} size={16} color="#FFF" /></Pressable>
          <Pressable style={[styles.sendButton, !canSend && styles.sendButtonDisabled]} disabled={!canSend} onPress={sendText}><Ionicons name="send" size={16} color="#FFF" /></Pressable>
        </View>
      </KeyboardAvoidingView>

      <Modal transparent visible={showAttachSheet} animationType="slide" onRequestClose={() => setShowAttachSheet(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setShowAttachSheet(false)}>
          <View style={[styles.sheetContainer, { backgroundColor: palette.surface }]}> 
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
                <Text style={[styles.sheetLabel, { color: palette.textPrimary }]}>{action.label}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal transparent visible={showContextMenu} animationType="fade" onRequestClose={() => setShowContextMenu(false)}>
        <Pressable style={styles.contextOverlay} onPress={() => setShowContextMenu(false)}>
          <View style={[styles.contextCard, { backgroundColor: palette.surface }]}> 
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
              {
                icon: 'share-social',
                label: 'Reenviar',
                onPress: async () => {
                  if (!selectedMessage) return;
                  await forwardMessage(selectedMessage);
                  Alert.alert('Mensaje reenviado', 'Se envió una copia del mensaje en este chat.');
                },
              },
              {
                icon: 'copy',
                label: 'Copiar',
                onPress: () => {
                  if (!selectedMessage?.text) return;
                  setInput(selectedMessage.text);
                  Alert.alert('Copiado', 'Texto copiado al cuadro de escritura para reutilizarlo.');
                },
              },
              { icon: 'information-circle-outline', label: 'Info', onPress: () => selectedMessage && openMessageInfo(selectedMessage) },
              { icon: 'star', label: 'Destacar', onPress: () => selectedMessage && toggleStar(selectedMessage) },
              { icon: 'pin', label: 'Conservar/Fijar', onPress: () => selectedMessage && togglePin(selectedMessage) },
              { icon: 'create', label: 'Editar', onPress: openEditFlow },
              {
                icon: 'trash',
                label: 'Eliminar',
                onPress: () =>
                  selectedMessage &&
                  Alert.alert('Eliminar', '¿Eliminar este mensaje para ti?', [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Eliminar', style: 'destructive', onPress: () => deleteForMe(selectedMessage.id) },
                  ]),
              },
              {
                icon: 'trash-bin',
                label: 'Eliminar para todos',
                onPress: () =>
                  selectedMessage &&
                  Alert.alert('Eliminar para todos', 'Esta acción eliminará el mensaje para todos los participantes.', [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Eliminar', style: 'destructive', onPress: () => deleteForEveryone(selectedMessage.id) },
                  ]),
              },
            ].map((action) => (
              <Pressable
                key={action.label}
                style={styles.contextRow}
                onPress={async () => {
                  await action.onPress();
                  setShowContextMenu(false);
                }}>
                <Ionicons name={action.icon as any} size={18} color={palette.textPrimary} />
                <Text style={[styles.contextLabel, { color: palette.textPrimary }]}>{action.label}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal transparent visible={showEditModal} animationType="fade" onRequestClose={() => setShowEditModal(false)}>
        <View style={styles.contextOverlay}>
          <View style={[styles.editCard, { backgroundColor: palette.surface }]}> 
            <Text style={[styles.editTitle, { color: palette.textPrimary }]}>Editar mensaje</Text>
            <TextInput
              value={editDraft}
              onChangeText={setEditDraft}
              multiline
              style={[styles.editInput, { borderColor: palette.border, color: palette.textPrimary }]}
            />
            <View style={styles.editActions}>
              <Pressable onPress={() => setShowEditModal(false)} style={styles.editActionButton}>
                <Text style={[styles.editActionText, { color: palette.textSecondary }]}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={submitEditMessage} style={styles.editActionButton}>
                <Text style={[styles.editActionText, { color: '#0A84FF' }]}>Guardar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 4, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 10 },
  backButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTextWrap: { flex: 1, gap: 1 },
  cleanHeaderAction: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  headerName: { fontSize: 18, fontWeight: '700' },
  headerSubtitle: { fontSize: 12, fontWeight: '600' },
  loading: { marginTop: 12 },
  listContent: { paddingHorizontal: 12, paddingVertical: 14, gap: 8, flexGrow: 1 },
  bubble: { maxWidth: '84%', borderRadius: 20, paddingTop: 9, paddingBottom: 6, paddingHorizontal: 13, gap: 4 },
  me: { alignSelf: 'flex-end', borderBottomRightRadius: 7 },
  contact: { alignSelf: 'flex-start', borderBottomLeftRadius: 7 },
  replyWrap: { borderLeftWidth: 2, paddingLeft: 6 },
  replyText: { fontSize: 12 },
  forwardTag: { fontSize: 11, fontStyle: 'italic' },
  image: { width: 200, height: 200, borderRadius: 12 },
  audioBubble: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  audioBubbleMe: { alignSelf: 'flex-end' },
  audioButton: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#2C5D95', alignItems: 'center', justifyContent: 'center' },
  audioLabel: { fontSize: 12, color: '#DDE9F6' },
  locationText: { textDecorationLine: 'underline', fontWeight: '700' },
  messageText: { fontSize: 15, lineHeight: 20 },
  meText: { color: '#FFFFFF' },
  messageMeta: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: 4, marginTop: 2 },
  messageTime: { fontSize: 11 },
  reactionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  reactionChip: { borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2, fontSize: 11 },
  replyingBar: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', gap: 8, alignItems: 'center' },
  replyingLabel: { flex: 1, fontSize: 12 },
  composer: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 10, paddingTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  attachButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  audioAction: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#0A84FF', alignItems: 'center', justifyContent: 'center' },
  audioActionRecording: { backgroundColor: '#D93025' },
  input: { flex: 1, borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, fontSize: 15, maxHeight: 120 },
  sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#0A84FF', alignItems: 'center', justifyContent: 'center' },
  sendButtonDisabled: { opacity: 0.5 },
  empty: { textAlign: 'center', marginTop: 22 },
  error: { color: '#D93025', marginHorizontal: 12, marginTop: 8 },
  sheetOverlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
  sheetContainer: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  sheetItem: { width: '22%', alignItems: 'center', gap: 6 },
  sheetIconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  sheetLabel: { textAlign: 'center', fontSize: 12, fontWeight: '600' },
  contextOverlay: { flex: 1, backgroundColor: '#00000090', justifyContent: 'center', padding: 20 },
  contextCard: { borderRadius: 18, padding: 14, gap: 8 },
  contextReactions: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, paddingHorizontal: 4 },
  contextReactionEmoji: { fontSize: 28 },
  contextRow: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 8 },
  contextLabel: { fontSize: 14, fontWeight: '600' },
  editCard: { borderRadius: 16, padding: 14, gap: 10 },
  editTitle: { fontSize: 16, fontWeight: '700' },
  editInput: { borderWidth: 1, borderRadius: 12, minHeight: 80, padding: 10, textAlignVertical: 'top' },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  editActionButton: { paddingVertical: 6, paddingHorizontal: 8 },
  editActionText: { fontSize: 14, fontWeight: '700' },
});
