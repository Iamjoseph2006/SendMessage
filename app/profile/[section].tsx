import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIconButton } from '@/src/presentation/components/ui/AppIconButton';
import { darkPalette, lightPalette, useAppTheme } from '@/src/presentation/theme/appTheme';

type OptionItem = {
  key: string;
  title: string;
  subtitle: string;
  type: 'toggle' | 'action';
  defaultValue?: boolean;
  onPress?: () => void;
};

const STORAGE_PREFIX = '@profile_settings:';

export default function ProfileSectionScreen() {
  const { isDark, setDarkMode } = useAppTheme();
  const router = useRouter();
  const { section } = useLocalSearchParams<{ section: 'notifications' | 'privacy' | 'appearance' | 'help' }>();
  const palette = isDark ? darkPalette : lightPalette;
  const [preferences, setPreferences] = useState<Record<string, boolean>>({});

  const options = useMemo<OptionItem[]>(() => {
    switch (section) {
      case 'notifications':
        return [
          { key: 'msg_notifications', title: 'Mensajes', subtitle: 'Avisos cuando recibes mensajes nuevos', type: 'toggle', defaultValue: true },
          { key: 'call_notifications', title: 'Llamadas', subtitle: 'Alertas de llamadas entrantes y perdidas', type: 'toggle', defaultValue: true },
          { key: 'status_notifications', title: 'Estados', subtitle: 'Notifica estados recientes de tus contactos', type: 'toggle', defaultValue: true },
        ];
      case 'privacy':
        return [
          { key: 'show_last_seen', title: 'Última vez', subtitle: 'Permitir que vean tu última conexión', type: 'toggle', defaultValue: true },
          { key: 'show_profile_photo', title: 'Foto de perfil', subtitle: 'Mostrar tu foto a tus contactos', type: 'toggle', defaultValue: true },
          {
            key: 'blocked_list',
            title: 'Usuarios bloqueados',
            subtitle: 'Administra tu lista de bloqueados',
            type: 'action',
            onPress: () => Alert.alert('Bloqueados', 'Pronto podrás gestionar contactos bloqueados desde esta sección.'),
          },
        ];
      case 'appearance':
        return [
          { key: 'dark_mode', title: 'Tema oscuro', subtitle: 'Cambia entre tema claro y oscuro', type: 'toggle', defaultValue: isDark },
          { key: 'compact_bubbles', title: 'Burbujas compactas', subtitle: 'Reduce espacio entre mensajes', type: 'toggle', defaultValue: false },
          {
            key: 'chat_wallpaper',
            title: 'Fondo de chat',
            subtitle: 'Selecciona un fondo para tus conversaciones',
            type: 'action',
            onPress: () => Alert.alert('Fondo de chat', 'Esta opción quedará lista cuando añadas una galería de fondos.'),
          },
        ];
      case 'help':
      default:
        return [
          {
            key: 'help_center',
            title: 'Centro de ayuda',
            subtitle: 'Guías rápidas de uso de SendMessage',
            type: 'action',
            onPress: () => Alert.alert('Ayuda', 'Puedes crear un chat, enviar multimedia y publicar estados desde las pestañas principales.'),
          },
          {
            key: 'contact_support',
            title: 'Contactar soporte',
            subtitle: 'Enviar correo al equipo',
            type: 'action',
            onPress: () => Linking.openURL('mailto:soporte@sendmessage.app?subject=Soporte%20SendMessage').catch(() => {
              Alert.alert('Error', 'No se pudo abrir la app de correo.');
            }),
          },
          {
            key: 'terms',
            title: 'Términos y privacidad',
            subtitle: 'Consultar políticas de uso',
            type: 'action',
            onPress: () => Linking.openURL('https://firebase.google.com/support/privacy').catch(() => {
              Alert.alert('Error', 'No se pudo abrir el enlace.');
            }),
          },
        ];
    }
  }, [isDark, section]);

  const title =
    section === 'notifications'
      ? 'Notificaciones'
      : section === 'privacy'
        ? 'Privacidad'
        : section === 'appearance'
          ? 'Apariencia'
          : 'Ayuda';

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      const next: Record<string, boolean> = {};
      await Promise.all(
        options
          .filter((item) => item.type === 'toggle')
          .map(async (item) => {
            const stored = await AsyncStorage.getItem(`${STORAGE_PREFIX}${item.key}`);
            next[item.key] = stored == null ? Boolean(item.defaultValue) : stored === 'true';
          }),
      );

      if (isMounted) {
        setPreferences(next);
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [options]);

  const onToggle = async (item: OptionItem, value: boolean) => {
    setPreferences((prev) => ({ ...prev, [item.key]: value }));
    await AsyncStorage.setItem(`${STORAGE_PREFIX}${item.key}`, String(value));

    if (item.key === 'dark_mode') {
      setDarkMode(value);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <Stack.Screen options={{ title }} />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={[styles.hero, { borderColor: palette.border, backgroundColor: palette.surface }]}>
          <Ionicons
            name={section === 'notifications' ? 'notifications-outline' : section === 'privacy' ? 'lock-closed-outline' : section === 'appearance' ? 'color-palette-outline' : 'help-circle-outline'}
            size={24}
            color={palette.accent}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.heroTitle, { color: palette.textPrimary }]}>{title}</Text>
            <Text style={[styles.heroSubtitle, { color: palette.textSecondary }]}>Ajustes reales del perfil guardados en el dispositivo.</Text>
          </View>
        </View>

        {options.map((item) => (
          <View key={item.key} style={[styles.row, { borderColor: palette.border, backgroundColor: palette.surface }]}>
            <View style={styles.rowInfo}>
              <Text style={[styles.rowText, { color: palette.textPrimary }]}>{item.title}</Text>
              <Text style={[styles.rowSubtext, { color: palette.textSecondary }]}>{item.subtitle}</Text>
            </View>

            {item.type === 'toggle' ? (
              <Switch
                value={Boolean(preferences[item.key])}
                onValueChange={(value) => {
                  void onToggle(item, value);
                }}
                trackColor={{ true: palette.accent, false: '#5B6980' }}
              />
            ) : (
              <AppIconButton iconName="chevron-forward" size={16} variant="soft" onPress={item.onPress} />
            )}
          </View>
        ))}

        <Pressable style={[styles.backButton, { borderColor: palette.border }]} onPress={() => router.back()}>
          <Text style={[styles.backText, { color: palette.textPrimary }]}>Volver al perfil</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { padding: 16, gap: 12 },
  hero: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroTitle: { fontWeight: '700', fontSize: 18 },
  heroSubtitle: { fontSize: 13, marginTop: 2 },
  row: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowInfo: { flex: 1 },
  rowText: { fontSize: 15, fontWeight: '700' },
  rowSubtext: { fontSize: 12, marginTop: 2 },
  backButton: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  backText: { fontWeight: '700' },
});
