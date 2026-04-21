import Ionicons from '@expo/vector-icons/Ionicons';
import { Image, StyleSheet, Text, View } from 'react-native';
import { StatusLocation } from '@/src/features/status/services/statusService';
import { darkPalette, lightPalette, useAppTheme } from '@/src/presentation/theme/appTheme';
import { typography } from '@/src/presentation/theme/typography';

type Props = {
  text: string;
  imageUri: string | null;
  audioUri: string | null;
  location: StatusLocation | null;
  emojis: string[];
  backgroundColor: string;
};

export function StatusPreviewCard({ text, imageUri, audioUri, location, emojis, backgroundColor }: Props) {
  const { isDark } = useAppTheme();
  const palette = isDark ? darkPalette : lightPalette;
  const hasMedia = Boolean(imageUri || audioUri || location);

  return (
    <View style={[styles.card, { borderColor: palette.border, backgroundColor: palette.surface }]}> 
      <Text style={[styles.title, typography.heading, { color: palette.textPrimary }]}>Vista previa</Text>
      <View style={[styles.previewBody, { backgroundColor: hasMedia ? (isDark ? '#121D2B' : '#F4F8FF') : backgroundColor }]}> 
        {imageUri ? <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" /> : null}
        {text.trim() ? <Text style={[styles.text, typography.accent, { color: hasMedia ? palette.textPrimary : '#FFFFFF' }]}>{text.trim()}</Text> : null}
        {!!emojis.length ? <Text style={styles.emojiText}>{emojis.join(' ')}</Text> : null}
        {location ? (
          <View style={styles.metaRow}><Ionicons name="location" size={14} color={palette.accent} /><Text style={[styles.metaText, typography.body, { color: palette.textSecondary }]}>Ubicación adjunta</Text></View>
        ) : null}
        {audioUri ? (
          <View style={styles.metaRow}><Ionicons name="mic" size={14} color={palette.accent} /><Text style={[styles.metaText, typography.body, { color: palette.textSecondary }]}>Audio listo para publicar</Text></View>
        ) : null}
        {!text.trim() && !imageUri && !audioUri && !location && !emojis.length ? (
          <Text style={[styles.empty, typography.body, { color: '#EAF3FF' }]}>Tu estado aparecerá aquí.</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 10 },
  title: { fontSize: 15 },
  previewBody: { borderRadius: 14, minHeight: 180, padding: 14, justifyContent: 'center', gap: 8 },
  image: { width: '100%', minHeight: 180, maxHeight: 260, borderRadius: 12 },
  text: { fontSize: 18, lineHeight: 24 },
  emojiText: { fontSize: 24 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13 },
  empty: { textAlign: 'center', fontSize: 14 },
});
