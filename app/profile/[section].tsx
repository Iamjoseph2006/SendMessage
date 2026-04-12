import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { darkPalette, lightPalette, useAppTheme } from '@/src/presentation/theme/appTheme';

const sectionConfig = {
  notifications: {
    title: 'Notificaciones',
    icon: 'notifications-outline',
    rows: ['Mensajes', 'Llamadas', 'Estados'],
  },
  privacy: {
    title: 'Privacidad',
    icon: 'lock-closed-outline',
    rows: ['Última vez', 'Foto de perfil', 'Bloqueados'],
  },
  appearance: {
    title: 'Apariencia',
    icon: 'color-palette-outline',
    rows: ['Tema oscuro', 'Tamaño de texto', 'Fondo de chat'],
  },
  help: {
    title: 'Ayuda',
    icon: 'help-circle-outline',
    rows: ['Centro de ayuda', 'Contáctanos', 'Términos y privacidad'],
  },
} as const;

export default function ProfileSectionScreen() {
  const { isDark, setDarkMode } = useAppTheme();
  const { section } = useLocalSearchParams<{ section: keyof typeof sectionConfig }>();
  const current = sectionConfig[section] ?? sectionConfig.help;
  const palette = isDark ? darkPalette : lightPalette;
  const defaultPreferences = useMemo(
    () =>
      Object.fromEntries(
        current.rows.map((row, index) => [row, section === 'appearance' ? (row === 'Tema oscuro' ? isDark : index === 1) : index === 0]),
      ) as Record<string, boolean>,
    [current.rows, isDark, section],
  );
  const [preferences, setPreferences] = useState<Record<string, boolean>>(defaultPreferences);

  useEffect(() => {
    setPreferences(defaultPreferences);
  }, [defaultPreferences]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <Stack.Screen options={{ title: current.title }} />
      <View style={styles.container}>
        <View style={[styles.hero, { borderColor: palette.border, backgroundColor: palette.surface }]}>
          <Ionicons name={current.icon} size={24} color={palette.accent} />
          <Text style={[styles.heroTitle, { color: palette.textPrimary }]}>{current.title}</Text>
        </View>

        {current.rows.map((row) => (
          <View key={row} style={[styles.row, { borderColor: palette.border, backgroundColor: palette.surface }]}>
            <Text style={[styles.rowText, { color: palette.textPrimary }]}>{row}</Text>
            <Switch
              value={preferences[row]}
              onValueChange={(value) =>
                setPreferences((prev) => {
                  if (section === 'appearance' && row === 'Tema oscuro') {
                    setDarkMode(value);
                  }

                  return {
                    ...prev,
                    [row]: value,
                  };
                })
              }
              trackColor={{ true: palette.accent, false: '#5B6980' }}
            />
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { padding: 16, gap: 12 },
  hero: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E6EBF2',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroTitle: { color: '#22354D', fontWeight: '700', fontSize: 18 },
  row: {
    borderWidth: 1,
    borderColor: '#E6EBF2',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowText: { flex: 1, color: '#22354D', fontSize: 15, fontWeight: '600' },
});
