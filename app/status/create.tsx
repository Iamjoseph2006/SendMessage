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
  Image,
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
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

  useEffect(() => {
    return () => {
      recorder.stop().catch(() => undefined);
    };
  }, [recorder]);

  const hasAnyContent = useMemo(
    () => Boolean(content.trim() || selectedImageUri || audioUri || location),
    [audioUri, content, location, selectedImageUri],
  );

  const onPickImage = async () => {
    setError(null);
    const result = await launchImageLibrary({ mediaType: 'photo' });
    if (result.errorMessage) {
      setError(result.errorMessage);
      return;
    }
    const uri = result.assets?.[0]?.uri;
    if (uri) {
      setSelectedImageUri(uri);
    }
  };

  const onTakePhoto = async () => {
    setError(null);
    const result = await launchCamera({ mediaType: 'photo' });
    if (result.errorMessage) {
      setError(result.errorMessage);
      return;
    }
    const uri = result.assets?.[0]?.uri;
    if (uri) {
      setSelectedImageUri(uri);
    }
  };

  const onPickLocation = async () => {
    setError(null);
    const permission = await Location.requestForegroundPermissionsAsync();

    if (permission.status !== 'granted') {
      setError('No se concedió permiso para usar tu ubicación.');
      return;
    }

    const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setLocation({
      latitude: current.coords.latitude,
      longitude: current.coords.longitude,
    });
  };

  const onToggleEmoji = (emoji: string) => {
    setPickedEmojis((prev) => (prev.includes(emoji) ? prev.filter((item) => item !== emoji) : [...prev, emoji]));
  };

  const onRecordAudio = async () => {
    setError(null);

    if (isRecording) {
      await recorder.stop();
      if (recorder.uri) {
        setAudioUri(recorder.uri);
      }
      setIsRecording(false);
      return;
    }

    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setError('No se concedió permiso para grabar audio.');
      return;
    }

    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setIsRecording(true);
  };

  const onCreateStatus = async () => {
    if (!user?.uid || !hasAnyContent || saving) {
      return;
    }

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
      setSelectedImageUri(null);
      setAudioUri(null);
      setLocation(null);
      setPickedEmojis([]);
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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={[styles.label, { color: palette.textPrimary }]}>Crea tu estado</Text>
          <View style={[styles.textStatusWrap, { backgroundColor: !selectedImageUri && !audioUri && !location ? backgroundColor : palette.surface }]}>
            <TextInput
              value={content}
              onChangeText={setContent}
              editable={!saving}
              multiline
              autoFocus
              placeholder="Escribe algo para tu estado..."
              placeholderTextColor={selectedImageUri || audioUri || location ? palette.textSecondary : '#E4EEFF'}
              style={[
                styles.input,
                {
                  color: selectedImageUri || audioUri || location ? palette.textPrimary : '#FFFFFF',
                  borderColor: palette.border,
                  backgroundColor: 'transparent',
                },
              ]}
            />
          </View>

          {!selectedImageUri && !audioUri && !location ? (
            <View style={styles.paletteRow}>
              {TEXT_BG_COLORS.map((color) => (
                <Pressable
                  key={color}
                  onPress={() => setBackgroundColor(color)}
                  style={[styles.colorDot, { backgroundColor: color }, backgroundColor === color ? styles.colorDotActive : null]}
                />
              ))}
            </View>
          ) : null}

          <View style={styles.actionsRow}>
            <Pressable style={styles.actionButton} onPress={onTakePhoto}>
              <Ionicons name="camera-outline" size={18} color="#FFF" />
              <Text style={styles.actionText}>Cámara</Text>
            </Pressable>
            <Pressable style={styles.actionButton} onPress={onPickImage}>
              <Ionicons name="image-outline" size={18} color="#FFF" />
              <Text style={styles.actionText}>Galería</Text>
            </Pressable>
            <Pressable style={styles.actionButton} onPress={onPickLocation}>
              <Ionicons name="location-outline" size={18} color="#FFF" />
              <Text style={styles.actionText}>Ubicación</Text>
            </Pressable>
            <Pressable style={[styles.actionButton, isRecording ? styles.recordingButton : null]} onPress={onRecordAudio}>
              <Ionicons name={isRecording ? 'stop-circle-outline' : 'mic-outline'} size={18} color="#FFF" />
              <Text style={styles.actionText}>{isRecording ? 'Detener' : 'Audio'}</Text>
            </Pressable>
          </View>

          <View style={styles.emojiRow}>
            {EMOJIS.map((emoji) => (
              <Pressable key={emoji} style={[styles.emojiChip, pickedEmojis.includes(emoji) ? styles.emojiChipActive : null]} onPress={() => onToggleEmoji(emoji)}>
                <Text style={styles.emojiText}>{emoji}</Text>
              </Pressable>
            ))}
          </View>

          {selectedImageUri ? <Image source={{ uri: selectedImageUri }} style={styles.previewImage} resizeMode="cover" /> : null}

          {location ? (
            <View style={styles.locationBadge}>
              <Ionicons name="location" size={18} color="#1F7AE0" />
              <Text style={styles.locationBadgeText}>Ubicación adjunta</Text>
            </View>
          ) : null}

          {audioUri ? (
            <View style={styles.chipInfo}>
              <Ionicons name="mic" size={14} color="#1F7AE0" />
              <Text style={styles.chipText}>Audio grabado listo para publicar</Text>
            </View>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable style={[styles.publishButton, !hasAnyContent ? styles.publishButtonDisabled : null]} disabled={saving || !hasAnyContent} onPress={onCreateStatus}>
            {saving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.publishText}>Publicar</Text>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24, gap: 12 },
  label: { fontSize: 16, fontWeight: '700' },
  input: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  textStatusWrap: { borderRadius: 14, padding: 2 },
  paletteRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  colorDot: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: '#FFFFFF55' },
  colorDotActive: { borderColor: '#FFFFFF', transform: [{ scale: 1.06 }] },
  actionsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1F7AE0',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  recordingButton: { backgroundColor: '#D93025' },
  actionText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emojiChip: {
    borderWidth: 1,
    borderColor: '#CCD6E3',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  emojiChipActive: { borderColor: '#1F7AE0', backgroundColor: '#EAF3FF' },
  emojiText: { fontSize: 17 },
  previewImage: { width: '100%', height: 200, borderRadius: 14 },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: '#EAF3FF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  locationBadgeText: { color: '#1F7AE0', fontWeight: '700', fontSize: 13 },
  chipInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipText: { color: '#47617F', fontSize: 13 },
  publishButton: {
    marginTop: 8,
    backgroundColor: '#1F7AE0',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 11,
  },
  publishButtonDisabled: { opacity: 0.55 },
  publishText: { color: '#FFF', fontWeight: '700' },
  error: { color: '#D93025' },
});
