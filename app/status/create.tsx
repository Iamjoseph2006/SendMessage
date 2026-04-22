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
import { File as ExpoFile } from 'expo-file-system';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { EmptyStatusState } from '@/src/features/status/components/EmptyStatusState';
import { StatusActionBar } from '@/src/features/status/components/StatusActionBar';
import { StatusComposer } from '@/src/features/status/components/StatusComposer';
import { StatusPreviewCard } from '@/src/features/status/components/StatusPreviewCard';
import { CreateStatusInput, StatusLocation, createStatus } from '@/src/features/status/services/statusService';
import { darkPalette, lightPalette, useAppTheme } from '@/src/presentation/theme/appTheme';
import { typography } from '@/src/presentation/theme/typography';

const EMOJIS = ['😀', '😂', '😍', '🔥', '🙏', '💙', '🎉', '😎'];
const TEXT_BG_COLORS = ['#1F7AE0', '#3F8C5A', '#8A4FFF', '#C96200', '#29323D', '#BE2F6B'];
const SAVE_TIMEOUT_MS = 15000;
const isValidLocalUri = (uri: string) => /^(file|content|ph):\/\//.test(uri);

const validateLocalMediaUri = (uri: string) => {
  if (!isValidLocalUri(uri)) return false;
  const file = new ExpoFile(uri);
  return Boolean(file.exists && file.type === 'file' && typeof file.size === 'number' && file.size > 0 && file.uri);
};

export default function CreateStatusScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { isDark } = useAppTheme();
  const palette = isDark ? darkPalette : lightPalette;
  const insets = useSafeAreaInsets();

  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [location, setLocation] = useState<StatusLocation | null>(null);
  const [pickedEmojis, setPickedEmojis] = useState<string[]>([]);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [backgroundColor, setBackgroundColor] = useState<string>(TEXT_BG_COLORS[0]);
  const audioPlayer = useAudioPlayer(audioUri || undefined);
  const audioPlayerStatus = useAudioPlayerStatus(audioPlayer);

  useEffect(() => () => {
    recorder.stop().catch(() => undefined);
    setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => undefined);
  }, [recorder]);

  const hasAnyContent = useMemo(() => Boolean(content.trim() || selectedImageUri || audioUri || location), [audioUri, content, location, selectedImageUri]);

  const pickImage = async (source: 'camera' | 'library') => {
    setError(null);
    try {
      const permission =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        setError(source === 'camera' ? 'Debes conceder permisos de cámara.' : 'Debes conceder permisos de galería.');
        return;
      }

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9, allowsEditing: false })
          : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9, allowsEditing: false, selectionLimit: 1 });

      if (result.canceled) return;
      const uri = result.assets?.[0]?.uri;
      if (!uri) {
        setError('No se pudo obtener la imagen.');
        return;
      }
      if (!validateLocalMediaUri(uri)) {
        setError('El archivo seleccionado ya no está disponible.');
        return;
      }
      setSelectedImageUri(uri);
    } catch (pickError) {
      setError(pickError instanceof Error ? pickError.message : 'Error al seleccionar imagen.');
    }
  };

  const onPickLocation = async () => {
    setError(null);
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') return setError('No se concedió permiso para usar tu ubicación.');
    const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setLocation({ latitude: current.coords.latitude, longitude: current.coords.longitude });
  };

  const onToggleEmoji = (emoji: string) => {
    setPickedEmojis((prev) => (prev.includes(emoji) ? prev.filter((item) => item !== emoji) : [...prev, emoji]));
  };

  const onRecordAudio = async () => {
    setError(null);
    if (isRecording) {
      await recorder.stop();
      if (recorder.uri) {
        if (validateLocalMediaUri(recorder.uri)) {
          setAudioUri(recorder.uri);
        } else {
          setError('El audio grabado no es válido o ya no está disponible.');
        }
      }
      setIsRecording(false);
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      return;
    }

    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) return setError('No se concedió permiso para grabar audio.');

    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setAudioUri(null);
    setIsRecording(true);
  };

  const clearAttachments = () => {
    setSelectedImageUri(null);
    setAudioUri(null);
    setLocation(null);
    setPickedEmojis([]);
    setError(null);
  };

  const onCreateStatus = async () => {
    if (!user?.uid || !hasAnyContent || saving || isRecording) return;

    setSaving(true);
    setError(null);

    const payload: CreateStatusInput = {
      content,
      imageUri: selectedImageUri,
      audioUri,
      location,
      emojis: pickedEmojis,
      backgroundColor: !selectedImageUri && !audioUri && !location ? backgroundColor : null,
    };

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('La publicación tardó demasiado. Revisa internet e inténtalo de nuevo.')), SAVE_TIMEOUT_MS);
    });

    try {
      await Promise.race([createStatus(user.uid, payload), timeoutPromise]);
      setContent('');
      clearAttachments();
      setBackgroundColor(TEXT_BG_COLORS[0]);
      router.back();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'No se pudo crear el estado.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}> 
      <Stack.Screen options={{ title: 'Nuevo estado' }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.safeArea} keyboardVerticalOffset={Math.max(0, insets.top - 4)}>
        <ScrollView contentContainerStyle={[styles.container, { paddingBottom: Math.max(20, insets.bottom + 10) }]} keyboardShouldPersistTaps="handled">
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.label, typography.title, { color: palette.textPrimary }]}>Crear estado</Text>
              <Text style={[styles.subLabel, typography.body, { color: palette.textSecondary }]}>Comparte texto, foto, audio o ubicación</Text>
            </View>
            <Pressable onPress={clearAttachments} style={[styles.ghostAction, { borderColor: palette.border }]}>
              <Ionicons name="trash-outline" size={14} color={palette.textSecondary} />
              <Text style={[styles.ghostActionText, typography.caption, { color: palette.textSecondary }]}>Descartar</Text>
            </Pressable>
          </View>

          {!hasAnyContent ? <EmptyStatusState /> : null}

          <StatusPreviewCard
            text={content}
            imageUri={selectedImageUri}
            audioUri={audioUri}
            location={location}
            emojis={pickedEmojis}
            backgroundColor={backgroundColor}
          />
          {audioUri ? (
            <View style={[styles.audioDraft, { borderColor: palette.border, backgroundColor: palette.surface }]}>
              <Pressable style={styles.audioPlay} onPress={() => (audioPlayerStatus.playing ? audioPlayer.pause() : audioPlayer.play())}>
                <Ionicons name={audioPlayerStatus.playing ? 'pause' : 'play'} size={14} color="#FFF" />
              </Pressable>
              <Text style={[typography.body, { color: palette.textPrimary, flex: 1 }]}>Audio listo para publicar</Text>
              <Pressable onPress={() => setAudioUri(null)}><Ionicons name="close-circle-outline" size={20} color={palette.textSecondary} /></Pressable>
            </View>
          ) : null}

          <StatusComposer value={content} onChangeText={setContent} editable={!saving} />

          {!selectedImageUri && !audioUri && !location ? (
            <View style={[styles.editorCard, { borderColor: palette.border, backgroundColor: palette.surface }]}> 
              <Text style={[styles.fieldLabel, typography.caption, { color: palette.textSecondary }]}>Fondo del estado</Text>
              <View style={styles.paletteRow}>
                {TEXT_BG_COLORS.map((color) => (
                  <Pressable key={color} onPress={() => setBackgroundColor(color)} style={[styles.colorDot, { backgroundColor: color }, backgroundColor === color ? styles.colorDotActive : null]} />
                ))}
              </View>
            </View>
          ) : null}

          <StatusActionBar
            actions={[
              { key: 'camera', icon: 'camera-outline', label: 'Cámara', onPress: () => pickImage('camera') },
              { key: 'gallery', icon: 'image-outline', label: 'Galería', onPress: () => pickImage('library') },
              { key: 'location', icon: 'location-outline', label: 'Ubicación', onPress: onPickLocation },
              { key: 'audio', icon: isRecording ? 'stop-circle-outline' : 'mic-outline', label: isRecording ? 'Detener' : 'Audio', onPress: onRecordAudio, danger: isRecording },
            ]}
          />

          <View style={[styles.editorCard, { borderColor: palette.border, backgroundColor: palette.surface }]}> 
            <Text style={[styles.fieldLabel, typography.caption, { color: palette.textSecondary }]}>Reacciones rápidas</Text>
            <View style={styles.emojiRow}>
              {EMOJIS.map((emoji) => (
                <Pressable key={emoji} style={[styles.emojiChip, { borderColor: palette.border, backgroundColor: pickedEmojis.includes(emoji) ? (isDark ? '#1E3A61' : '#EAF3FF') : 'transparent' }]} onPress={() => onToggleEmoji(emoji)}>
                  <Text style={styles.emojiText}>{emoji}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {error ? <Text style={[styles.error, typography.caption]}>{error}</Text> : null}

          <Pressable style={[styles.publishButton, { backgroundColor: palette.accent }, (!hasAnyContent || saving || isRecording) ? styles.publishButtonDisabled : null]} disabled={saving || !hasAnyContent || isRecording} onPress={onCreateStatus}>
            {saving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={[styles.publishText, typography.heading]}>Publicar estado</Text>}
          </Pressable>
          {isRecording ? <Text style={[styles.recordingInfo, typography.caption, { color: '#D93025' }]}>Grabando audio… toca “Detener” para adjuntarlo.</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 28 },
  subLabel: { fontSize: 13, marginTop: 2 },
  ghostAction: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  ghostActionText: { fontSize: 13 },
  editorCard: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 10 },
  fieldLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4 },
  paletteRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  colorDot: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: '#FFFFFF55' },
  colorDotActive: { borderColor: '#FFFFFF', transform: [{ scale: 1.06 }] },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emojiChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  emojiText: { fontSize: 18 },
  publishButton: { borderRadius: 14, alignItems: 'center', paddingVertical: 13, marginTop: 4 },
  publishButtonDisabled: { opacity: 0.55 },
  publishText: { color: '#FFF', fontSize: 15 },
  error: { color: '#D93025', fontSize: 13 },
  recordingInfo: { fontSize: 12, textAlign: 'center' },
  audioDraft: { borderWidth: 1, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  audioPlay: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1F7AE0' },
});
