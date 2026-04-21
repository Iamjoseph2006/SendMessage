import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import { darkPalette, lightPalette, useAppTheme } from '@/src/presentation/theme/appTheme';
import { typography } from '@/src/presentation/theme/typography';

export function EmptyStatusState() {
  const { isDark } = useAppTheme();
  const palette = isDark ? darkPalette : lightPalette;

  return (
    <View style={[styles.card, { borderColor: palette.border, backgroundColor: palette.surface }]}> 
      <Ionicons name="sparkles-outline" size={24} color={palette.accent} />
      <Text style={[styles.title, typography.heading, { color: palette.textPrimary }]}>Sin estados recientes</Text>
      <Text style={[styles.description, typography.body, { color: palette.textSecondary }]}>Publica tu primer estado o espera nuevas actualizaciones de tus contactos.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, padding: 16, gap: 8, alignItems: 'flex-start' },
  title: { fontSize: 15 },
  description: { fontSize: 14, lineHeight: 20 },
});
