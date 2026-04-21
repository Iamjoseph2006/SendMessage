import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { darkPalette, lightPalette, useAppTheme } from '@/src/presentation/theme/appTheme';
import { typography } from '@/src/presentation/theme/typography';

type Action = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
};

export function StatusActionBar({ actions }: { actions: Action[] }) {
  const { isDark } = useAppTheme();
  const palette = isDark ? darkPalette : lightPalette;

  return (
    <View style={styles.row}>
      {actions.map((action) => (
        <Pressable
          key={action.key}
          onPress={action.onPress}
          disabled={action.disabled}
          style={({ pressed }) => [
            styles.action,
            {
              backgroundColor: action.danger ? '#D93025' : palette.accent,
              opacity: action.disabled ? 0.4 : pressed ? 0.78 : 1,
            },
          ]}>
          <Ionicons name={action.icon} size={16} color="#FFFFFF" />
          <Text style={[styles.label, typography.caption]}>{action.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  action: { minWidth: 96, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 10 },
  label: { color: '#FFF', fontSize: 13 },
});
