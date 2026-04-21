import Ionicons from '@expo/vector-icons/Ionicons';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import * as Location from 'expo-location';
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
  TextInput,
  View,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { StatusActionBar } from '@/src/features/status/components/StatusActionBar';
import { StatusPreviewCard } from '@/src/features/status/components/StatusPreviewCard';
import { CreateStatusInput, StatusLocation, createStatus } from '@/src/features/status/services/statusService';
import { darkPalette, lightPalette, useAppTheme } from '@/src/presentation/theme/appTheme';

const EMOJIS = ['😀', '😂', '😍', '🔥', '🙏', '💙', '🎉', '😎'];
const TEXT_BG_COLORS = ['#1F7AE0', '#3F8C5A', '#8A4FFF', '#C96200', '#29323D', '#BE2F6B'];
const SAVE_TIMEOUT_MS = 15000;

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

  useEffect(() => () => {
    recorder.stop().catch(() => undefined);
  }, [recorder]);

  const hasAnyContent = useMemo(() => Boolean(content.trim() || selectedImageUri || audioUri || location), [audioUri, content, location, selectedImageUri]);

  const onPickImage = async () => {
    setError(null);
    const result = await launchImageLibrary({ mediaType: 'photo' });
    if (result.errorMessage) return setError(result.errorMessage);
    const uri = result.assets?.[0]?.uri;
    if (uri) setSelectedImageUri(uri);
  };

  const onTakePhoto = async () => {
    setError(null);
    const result = await launchCamera({ mediaType: 'photo' });
    if (result.errorMessage) return setError(result.errorMessage);
    const uri = result.assets?.[0]?.uri;
    if (uri) setSelectedImageUri(uri);
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
      if (recorder.uri) setAudioUri(recorder.uri);
      setIsRecording(false);
      return;
    }

    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) return setError('No se concedió permiso para grabar audio.');

    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setIsRecording(true);
  };

  const clearAttachments = () => {
    setSelectedImageUri(null);
    setAudioUri(null);
    setLocation(null);
    setPickedEmojis([]);
  };

  const onCreateStatus = async () => {
    if (!user?.uid || !hasAnyContent || saving) return;

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
            <Text style={[styles.label, { color: palette.textPrimary }]}>Crear estado</Text>
            <Pressable onPress={clearAttachments} style={[styles.ghostAction, { borderColor: palette.border }]}>
              <Ionicons name="refresh" size={14} color={palette.textSecondary} />
              <Text style={[styles.ghostActionText, { color: palette.textSecondary }]}>Limpiar</Text>
            </Pressable>
          </View>

          <StatusPreviewCard
            text={content}
            imageUri={selectedImageUri}
            audioUri={audioUri}
            location={location}
            emojis={pickedEmojis}
            backgroundColor={backgroundColor}
          />

          <View style={[styles.editorCard, { borderColor: palette.border, backgroundColor: palette.surface }]}> 
            <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>Texto</Text>
            <TextInput
              value={content}
              onChangeText={setContent}
              editable={!saving}
              multiline
              placeholder="Escribe algo para tu estado..."
              placeholderTextColor={palette.textSecondary}
              style={[styles.input, { color: palette.textPrimary, borderColor: palette.border, backgroundColor: isDark ? '#111822' : '#F7FAFF' }]}
            />
            {!selectedImageUri && !audioUri && !location ? (
              <View style={styles.paletteRow}>
                {TEXT_BG_COLORS.map((color) => (
                  <Pressable key={color} onPress={() => setBackgroundColor(color)} style={[styles.colorDot, { backgroundColor: color }, backgroundColor === color ? styles.colorDotActive : null]} />
                ))}
              </View>
            ) : null}
          </View>

          <StatusActionBar
            actions={[
              { key: 'camera', icon: 'camera-outline', label: 'Cámara', onPress: onTakePhoto },
              { key: 'gallery', icon: 'image-outline', label: 'Galería', onPress: onPickImage },
              { key: 'location', icon: 'location-outline', label: 'Ubicación', onPress: onPickLocation },
              { key: 'audio', icon: isRecording ? 'stop-circle-outline' : 'mic-outline', label: isRecording ? 'Detener' : 'Audio', onPress: onRecordAudio, danger: isRecording },
            ]}
          />

          <View style={[styles.editorCard, { borderColor: palette.border, backgroundColor: palette.surface }]}> 
            <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>Reacciones rápidas</Text>
            <View style={styles.emojiRow}>
              {EMOJIS.map((emoji) => (
                <Pressable key={emoji} style={[styles.emojiChip, { borderColor: palette.border, backgroundColor: pickedEmojis.includes(emoji) ? (isDark ? '#1E3A61' : '#EAF3FF') : 'transparent' }]} onPress={() => onToggleEmoji(emoji)}>
                  <Text style={styles.emojiText}>{emoji}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable style={[styles.publishButton, { backgroundColor: palette.accent }, (!hasAnyContent || saving) ? styles.publishButtonDisabled : null]} disabled={saving || !hasAnyContent} onPress={onCreateStatus}>
            {saving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.publishText}>Publicar estado</Text>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 24, fontWeight: '800' },
  ghostAction: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  ghostActionText: { fontWeight: '700', fontSize: 13 },
  editorCard: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 10 },
  fieldLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  input: { minHeight: 110, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, textAlignVertical: 'top' },
  paletteRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  colorDot: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: '#FFFFFF55' },
  colorDotActive: { borderColor: '#FFFFFF', transform: [{ scale: 1.06 }] },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emojiChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  emojiText: { fontSize: 18 },
  publishButton: { borderRadius: 12, alignItems: 'center', paddingVertical: 13, marginTop: 4 },
  publishButtonDisabled: { opacity: 0.55 },
  publishText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
  error: { color: '#D93025', fontSize: 13, fontWeight: '600' },
});
