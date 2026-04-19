import Ionicons from '@expo/vector-icons/Ionicons';
import { Audio } from 'expo-av';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { CreateStatusInput, StatusLocation, createStatus } from '@/src/features/status/services/statusService';
import { darkPalette, lightPalette, useAppTheme } from '@/src/presentation/theme/appTheme';

const EMOJIS = ['😀', '😂', '😍', '🔥', '🙏', '💙', '🎉', '😎'];
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
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (recording) {
        recording.stopAndUnloadAsync().catch(() => undefined);
      }
    };
  }, [recording]);

  const hasAnyContent = useMemo(
    () => Boolean(content.trim() || selectedImageUri || audioUri || location),
    [audioUri, content, location, selectedImageUri],
  );

  const onPickImage = async () => {
    setError('La selección de imágenes no está disponible en Expo Go para esta versión.');
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

    if (recording) {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      if (uri) {
        setAudioUri(uri);
      }
      return;
    }

    const permission = await Audio.requestPermissionsAsync();
    if (!permission.granted) {
      setError('No se concedió permiso para grabar audio.');
      return;
    }

    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const nextRecording = new Audio.Recording();
    await nextRecording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    await nextRecording.startAsync();
    setRecording(nextRecording);
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
          <TextInput
            value={content}
            onChangeText={setContent}
            editable={!saving}
            multiline
            autoFocus
            placeholder="Escribe algo para tu estado..."
            placeholderTextColor={palette.textSecondary}
            style={[
              styles.input,
              {
                color: palette.textPrimary,
                borderColor: palette.border,
                backgroundColor: palette.surface,
              },
            ]}
          />

          <View style={styles.actionsRow}>
            <Pressable style={styles.actionButton} onPress={onPickImage}>
              <Ionicons name="image-outline" size={18} color="#FFF" />
              <Text style={styles.actionText}>Galería</Text>
            </Pressable>
            <Pressable style={styles.actionButton} onPress={onPickLocation}>
              <Ionicons name="location-outline" size={18} color="#FFF" />
              <Text style={styles.actionText}>Ubicación</Text>
            </Pressable>
            <Pressable style={[styles.actionButton, recording ? styles.recordingButton : null]} onPress={onRecordAudio}>
              <Ionicons name={recording ? 'stop-circle-outline' : 'mic-outline'} size={18} color="#FFF" />
              <Text style={styles.actionText}>{recording ? 'Detener' : 'Audio'}</Text>
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
