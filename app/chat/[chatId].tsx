import Ionicons from '@expo/vector-icons/Ionicons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ActionSheetIOS,
  Animated,
  FlatList,
  Image,
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
import { chatSummaries } from '@/src/data/mock/mockData';
import { Message } from '@/src/domain/entities';
import { darkPalette, lightPalette, useAppTheme } from '@/src/presentation/theme/appTheme';
import { useConversationViewModel } from '@/src/presentation/viewmodels/useConversationViewModel';

const statusIcon = (status: Message['status']) => {
  if (status === 'read') return { name: 'checkmark-done', color: '#1F7AE0' } as const;
  if (status === 'received') return { name: 'checkmark-done', color: '#97A8BE' } as const;
  return { name: 'checkmark', color: '#97A8BE' } as const;
};

const attachActions = [
  { id: 'doc', icon: 'document-text-outline', label: 'Documento' },
  { id: 'gallery', icon: 'images-outline', label: 'Galería' },
  { id: 'camera', icon: 'camera-outline', label: 'Cámara' },
  { id: 'audio', icon: 'mic-outline', label: 'Audio' },
  { id: 'location', icon: 'location-outline', label: 'Ubicación' },
] as const;

const messageActions = ['Responder', 'Reenviar', 'Copiar', 'Destacar', 'Eliminar', 'Fijar', 'Traducir'] as const;
const quickReactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
const mockFiles = ['Contrato.pdf', 'PlanProyecto.docx', 'Resumen.xlsx'];
const mockPhotos = ['IMG_1024.JPG', 'IMG_1025.JPG', 'IMG_1026.JPG'];
const mapPrefix = 'map:';

export default function ConversationScreen() {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const { isDark } = useAppTheme();
  const palette = isDark ? darkPalette : lightPalette;
  const { messages, input, setInput, canSend, sendText, sendTemplateMessage } =
    useConversationViewModel(chatId);

  const [showAttach, setShowAttach] = useState(false);
  const [pickerType, setPickerType] = useState<'none' | 'doc' | 'gallery' | 'camera'>('none');
  const [isRecording, setIsRecording] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showChatInfo, setShowChatInfo] = useState(false);
  const [activeCallMode, setActiveCallMode] = useState<'audio' | 'video' | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [reactionByMessage, setReactionByMessage] = useState<Record<string, string>>({});
  const recordingPulse = useRef(new Animated.Value(1)).current;
  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const inputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();

  const chatName = chatSummaries.find((chat) => chat.id === chatId)?.name ?? 'Chat';
  const pickerItems = useMemo(() => (pickerType === 'doc' ? mockFiles : mockPhotos), [pickerType]);

  const pushAttachment = (kind: 'doc' | 'gallery' | 'camera', name: string) => {
    const prefix = kind === 'doc' ? '📄 Documento' : kind === 'gallery' ? '🖼️ Imagen' : '📷 Foto';
    sendTemplateMessage(`${prefix}: ${name}`);
    setPickerType('none');
    setShowAttach(false);
  };

  const openMessageActions = (message: Message) => {
    setSelectedMessageId(message.id);
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...messageActions, 'Cancelar'],
          cancelButtonIndex: messageActions.length,
          destructiveButtonIndex: 4,
        },
        (index) => {
          if (index === messageActions.length) return;
          const action = messageActions[index];
          if (action === 'Copiar') {
            sendTemplateMessage('📋 Mensaje copiado');
          }
          if (action === 'Eliminar') {
            sendTemplateMessage('🗑️ Mensaje eliminado');
          }
        },
      );
      return;
    }
    sendTemplateMessage('💬 Acción de mensaje seleccionada');
  };

  const requestLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  };

  const toggleRecording = async () => {
    if (isRecording) {
      recordingPulse.stopAnimation();
      setIsRecording(false);
      await sendTemplateMessage('🎤 Nota de voz (00:08)');
      return;
    }
    setIsRecording(true);

    Animated.loop(
      Animated.sequence([
        Animated.timing(recordingPulse, { toValue: 1.2, duration: 450, useNativeDriver: true }),
        Animated.timing(recordingPulse, { toValue: 1, duration: 450, useNativeDriver: true }),
      ]),
    ).start();
  };

  const openCameraCapture = async () => {
    const status = cameraPermission?.granted ? 'granted' : (await requestCameraPermission()).status;
    if (status !== 'granted') {
      return;
    }
    setShowCamera(true);
  };

  const takePicture = async () => {
    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.55 });
    if (!photo?.uri) return;
    await sendTemplateMessage(`📷 Foto enviada · ${photo.uri.split('/').pop()}`);
    setShowCamera(false);
  };

  const handleAction = async (id: (typeof attachActions)[number]['id']) => {
    if (id === 'doc') setPickerType('doc');
    if (id === 'gallery') setPickerType('gallery');
    if (id === 'camera') {
      await openCameraCapture();
      setShowAttach(false);
    }
    if (id === 'location') {
      const granted = await requestLocationPermission();
      if (granted) {
        const position = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = position.coords;
        await sendTemplateMessage(`${mapPrefix}${latitude.toFixed(5)},${longitude.toFixed(5)}`);
      } else {
        Linking.openSettings();
      }
      setShowAttach(false);
    }
    if (id === 'audio') {
      await toggleRecording();
      setShowAttach(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.safeArea}>
        <View style={[styles.header, { paddingTop: insets.top + 4, borderBottomColor: palette.border, backgroundColor: palette.surface }]}>
          <Pressable onPress={() => setShowChatInfo(true)}>
            <Text style={[styles.headerName, { color: palette.textPrimary }]}>{chatName}</Text>
            <Text style={[styles.headerSubtitle, { color: palette.textSecondary }]}>En línea</Text>
          </Pressable>
          <View style={styles.headerActions}>
            <Pressable style={styles.headerActionButton} onPress={() => setActiveCallMode('audio')}>
              <Ionicons name="call-outline" size={18} color="#1F7AE0" />
            </Pressable>
            <Pressable style={styles.headerActionButton} onPress={() => setActiveCallMode('video')}>
              <Ionicons name="videocam-outline" size={19} color="#1F7AE0" />
            </Pressable>
          </View>
        </View>

        <FlatList
          style={[styles.list, { backgroundColor: isDark ? '#0F1724' : '#F8FBFF' }]}
          contentContainerStyle={styles.listContent}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const icon = statusIcon(item.status);
            const reaction = reactionByMessage[item.id];
            const selected = selectedMessageId === item.id;
            const isMap = item.text.startsWith(mapPrefix);
            const locationData = isMap ? item.text.replace(mapPrefix, '') : '';
            const [lat, lng] = locationData.split(',');
            const mapUrl =
              isMap && lat && lng
                ? `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=15&size=600x320&markers=${lat},${lng},red-pushpin`
                : '';
            return (
              <Pressable onLongPress={() => openMessageActions(item)} delayLongPress={180}>
                {selected ? (
                  <View style={[styles.reactionBar, item.sender === 'me' ? styles.reactionRight : styles.reactionLeft]}>
                    {quickReactions.map((emoji) => (
                      <Pressable
                        key={`${item.id}-${emoji}`}
                        style={styles.reactionButton}
                        onPress={() => {
                          setReactionByMessage((prev) => ({ ...prev, [item.id]: emoji }));
                          setSelectedMessageId(null);
                        }}>
                        <Text style={styles.reactionEmoji}>{emoji}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
                <View
                  style={[
                    styles.bubble,
                    item.sender === 'me' ? styles.me : styles.contact,
                    selected && styles.selectedBubble,
                    item.sender === 'contact' && isDark && { backgroundColor: '#18263A', borderColor: '#2D4363' },
                  ]}>
                  {isMap ? (
                    <Pressable onPress={() => Linking.openURL(`https://maps.google.com/?q=${lat},${lng}`)}>
                      <Image source={{ uri: mapUrl }} style={styles.mapPreview} />
                      <Text style={[styles.mapCaption, item.sender === 'me' && styles.meText]}>Ubicación compartida</Text>
                    </Pressable>
                  ) : (
                    <Text style={[styles.bubbleText, item.sender === 'me' && styles.meText, isDark && item.sender === 'contact' && { color: '#E9F0FA' }]}>
                      {item.text}
                    </Text>
                  )}
                  <View style={styles.rowMeta}>
                    {reaction ? <Text style={styles.reactionTag}>{reaction}</Text> : null}
                    <Text style={styles.time}>{item.time}</Text>
                    {item.sender === 'me' ? <Ionicons name={icon.name} size={14} color={icon.color} /> : null}
                  </View>
                </View>
              </Pressable>
            );
          }}
        />

        {showAttach ? (
          <View style={styles.actionPanel}>
            {attachActions.map((action) => (
              <Pressable key={action.id} style={styles.actionButton} onPress={() => handleAction(action.id)}>
                <Ionicons name={action.icon} size={20} color="#1F7AE0" />
                <Text style={styles.actionText}>{action.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={[styles.composer, { borderTopColor: palette.border, backgroundColor: palette.surface }]}>
          <Pressable style={styles.smallButton} onPress={() => setShowAttach((prev) => !prev)}>
            <Ionicons name="attach" size={19} color="#1F7AE0" />
          </Pressable>
          <Pressable
            style={styles.smallButton}
            onPress={() => {
              inputRef.current?.focus();
              setInput((prev) => `${prev}😊`);
            }}>
            <Ionicons name="happy-outline" size={19} color="#1F7AE0" />
          </Pressable>
          <TextInput
            ref={inputRef}
            style={[styles.input, { borderColor: palette.border, backgroundColor: palette.surface, color: palette.textPrimary }]}
            placeholder="Mensaje"
            placeholderTextColor="#8C9DB0"
            value={input}
            onChangeText={setInput}
            multiline
            textAlignVertical="top"
          />
          <Pressable style={styles.sendButton} disabled={!canSend} onPress={sendText}>
            <Ionicons name="send" size={16} color="#FFF" />
          </Pressable>
        </View>

        {isRecording ? (
          <Animated.View style={[styles.recordingBadge, { transform: [{ scale: recordingPulse }] }]}>
            <Ionicons name="mic" size={14} color="#FFFFFF" />
            <Text style={styles.recordingText}>Grabando audio…</Text>
          </Animated.View>
        ) : null}

        {activeCallMode ? (
          <View style={styles.callBanner}>
            <Ionicons name={activeCallMode === 'audio' ? 'call' : 'videocam'} size={15} color="#FFFFFF" />
            <Text style={styles.callBannerText}>
              {activeCallMode === 'audio' ? 'Llamada' : 'Videollamada'} en curso con {chatName}
            </Text>
            <Pressable onPress={() => setActiveCallMode(null)} hitSlop={6}>
              <Ionicons name="close" size={17} color="#FFFFFF" />
            </Pressable>
          </View>
        ) : null}

        <Modal visible={showCamera} transparent animationType="slide" onRequestClose={() => setShowCamera(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.cameraCard}>
              <CameraView ref={cameraRef} style={styles.cameraPreview} facing="back" />
              <View style={styles.cameraActions}>
                <Pressable style={styles.cameraButton} onPress={() => setShowCamera(false)}>
                  <Text style={styles.cameraButtonText}>Cancelar</Text>
                </Pressable>
                <Pressable style={styles.cameraButton} onPress={takePicture}>
                  <Text style={styles.cameraButtonText}>Tomar foto</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={showChatInfo} transparent animationType="fade" onRequestClose={() => setShowChatInfo(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>{chatName}</Text>
              <Text style={styles.infoText}>Chat seguro · Mensajes sincronizados</Text>
              <Text style={styles.infoText}>Participantes: Tú y {chatName}</Text>
              <Pressable style={styles.infoClose} onPress={() => setShowChatInfo(false)}>
                <Text style={styles.infoCloseText}>Cerrar</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal visible={pickerType !== 'none'} transparent animationType="slide" onRequestClose={() => setPickerType('none')}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>
                {pickerType === 'doc' ? 'Seleccionar documento' : pickerType === 'camera' ? 'Tomar foto' : 'Seleccionar imagen'}
              </Text>
              {pickerItems.map((item) => {
                const kind = pickerType === 'none' ? 'gallery' : pickerType;
                return (
                  <Pressable key={item} style={styles.modalOption} onPress={() => pushAttachment(kind, item)}>
                    <Text style={styles.modalOptionText}>{item}</Text>
                  </Pressable>
                );
              })}
              <Pressable style={styles.modalClose} onPress={() => setPickerType('none')}>
                <Text style={styles.modalCloseText}>Cancelar</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerActionButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ECF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerName: { color: '#1A2B44', fontWeight: '700', fontSize: 18 },
  headerSubtitle: { color: '#6A7D95', marginTop: 2, fontSize: 13 },
  list: { flex: 1, backgroundColor: '#F8FBFF' },
  listContent: { padding: 12, gap: 12, paddingBottom: 30 },
  bubble: { maxWidth: '82%', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  me: { alignSelf: 'flex-end', backgroundColor: '#DDF0FF' },
  contact: { alignSelf: 'flex-start', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E3EAF4' },
  selectedBubble: { shadowColor: '#1F7AE0', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  bubbleText: { color: '#273A52', fontSize: 15 },
  mapPreview: { width: 240, height: 140, borderRadius: 12, backgroundColor: '#DCE7F5' },
  mapCaption: { color: '#1A2B44', fontSize: 12, marginTop: 6, fontWeight: '600' },
  meText: { color: '#1B3552' },
  rowMeta: { flexDirection: 'row', alignSelf: 'flex-end', alignItems: 'center', gap: 4, marginTop: 4 },
  reactionTag: { fontSize: 12 },
  time: { color: '#7388A4', fontSize: 11 },
  reactionBar: {
    position: 'absolute',
    top: -32,
    zIndex: 5,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    borderRadius: 18,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 4,
    borderWidth: 1,
    borderColor: '#E4EAF3',
  },
  reactionLeft: { left: 0 },
  reactionRight: { right: 0 },
  reactionButton: { paddingHorizontal: 3 },
  reactionEmoji: { fontSize: 18 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E6EBF2',
    backgroundColor: '#FFF',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 108,
    borderWidth: 1,
    borderColor: '#D8E1EE',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
    marginBottom: 2,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1F7AE0',
    marginBottom: 1,
  },
  actionPanel: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E6EBF2',
  },
  actionButton: {
    width: 80,
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECF4FF',
    borderRadius: 14,
    paddingVertical: 8,
  },
  actionText: { color: '#1F4E83', fontSize: 12, fontWeight: '600' },
  recordingBadge: {
    position: 'absolute',
    right: 18,
    bottom: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1F7AE0',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  recordingText: { color: '#FFFFFF', fontWeight: '600', fontSize: 12 },
  callBanner: {
    position: 'absolute',
    bottom: 80,
    left: 12,
    right: 12,
    backgroundColor: '#1F7AE0',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  callBannerText: { flex: 1, color: '#FFFFFF', fontWeight: '600' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(24,36,53,0.4)' },
  modalCard: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 8,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#22354D', marginBottom: 8 },
  modalOption: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F7',
  },
  modalOptionText: { color: '#1E3856', fontSize: 15 },
  modalClose: { marginTop: 8, backgroundColor: '#ECF4FF', borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  modalCloseText: { color: '#1F7AE0', fontWeight: '700' },
  cameraCard: {
    flex: 1,
    marginHorizontal: 0,
    marginBottom: 0,
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: '#0F1724',
  },
  cameraPreview: {
    width: '100%',
    height: '88%',
  },
  cameraActions: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    backgroundColor: '#172235',
  },
  cameraButton: {
    flex: 1,
    backgroundColor: '#1F7AE0',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 10,
  },
  cameraButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  infoCard: {
    marginHorizontal: 24,
    marginBottom: 40,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 8,
  },
  infoTitle: { fontSize: 18, fontWeight: '800', color: '#1A2B44' },
  infoText: { color: '#4E647E' },
  infoClose: {
    marginTop: 8,
    alignItems: 'center',
    backgroundColor: '#ECF4FF',
    borderRadius: 12,
    paddingVertical: 10,
  },
  infoCloseText: { color: '#1F7AE0', fontWeight: '700' },
});
