import { StyleSheet, Text, TextInput, View } from 'react-native';
import { darkPalette, lightPalette, useAppTheme } from '@/src/presentation/theme/appTheme';
import { typography } from '@/src/presentation/theme/typography';

type StatusComposerProps = {
  value: string;
  onChangeText: (value: string) => void;
  editable: boolean;
};

export function StatusComposer({ value, onChangeText, editable }: StatusComposerProps) {
  const { isDark } = useAppTheme();
  const palette = isDark ? darkPalette : lightPalette;

  return (
    <View style={[styles.card, { borderColor: palette.border, backgroundColor: palette.surface }]}> 
      <Text style={[styles.label, typography.caption, { color: palette.textSecondary }]}>Texto del estado</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        multiline
        placeholder="Comparte una actualización..."
        placeholderTextColor={palette.textSecondary}
        style={[styles.input, typography.body, { color: palette.textPrimary, borderColor: palette.border, backgroundColor: isDark ? '#111822' : '#F7FAFF' }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 10 },
  label: { fontSize: 12, textTransform: 'uppercase' },
  input: { minHeight: 110, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, textAlignVertical: 'top' },
});
