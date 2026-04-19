import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { getChatById } from '@/src/features/chat/services/chatService';
import { UserProfile, getUserById } from '@/src/features/users/services/userService';
import { darkPalette, lightPalette, useAppTheme } from '@/src/presentation/theme/appTheme';
import { getAvatarInitials } from '@/src/shared/utils/avatar';

export default function ChatContactInfoScreen() {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const { isDark } = useAppTheme();
  const palette = isDark ? darkPalette : lightPalette;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chatId || !user?.uid) {
      setLoading(false);
      return;
    }

    getChatById(chatId)
      .then(async (chat) => {
        const contactUid = chat?.participants.find((participantId) => participantId !== user.uid);
        if (!contactUid) {
          setProfile(null);
          return;
        }

        const contact = await getUserById(contactUid);
        setProfile(contact);
      })
      .finally(() => setLoading(false));
  }, [chatId, user?.uid]);

  const rows = useMemo(
    () => [
      { label: 'Nombre', value: profile?.name || 'Sin nombre' },
      { label: 'Correo', value: profile?.email || 'No disponible' },
      { label: 'UID', value: profile?.uid || 'No disponible' },
      { label: 'Estado', value: profile?.online ? 'En línea' : 'Desconectado' },
    ],
    [profile],
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <Stack.Screen options={{ title: 'Info del contacto' }} />

      {loading ? <ActivityIndicator style={styles.loader} size="large" /> : null}

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.profileCard, { borderColor: palette.border, backgroundColor: palette.surface }]}>
          {profile?.photoURL ? (
            <Image source={{ uri: profile.photoURL }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: isDark ? '#253650' : '#D9EAFF' }]}>
              <Text style={[styles.avatarText, { color: palette.textPrimary }]}>{getAvatarInitials(profile?.name ?? profile?.email)}</Text>
            </View>
          )}
          <Text style={[styles.name, { color: palette.textPrimary }]}>{profile?.name || 'Contacto'}</Text>
          <Text style={[styles.subtitle, { color: palette.textSecondary }]}>{profile?.online ? 'Disponible ahora' : 'No disponible'}</Text>
        </View>

        <View style={[styles.infoCard, { borderColor: palette.border, backgroundColor: palette.surface }]}>
          {rows.map((row) => (
            <View key={row.label} style={styles.row}>
              <Text style={[styles.label, { color: palette.textSecondary }]}>{row.label}</Text>
              <Text style={[styles.value, { color: palette.textPrimary }]}>{row.value}</Text>
            </View>
          ))}
        </View>

        <Pressable style={styles.chatButton} onPress={() => router.replace(`/chat/${chatId}`)}>
          <Ionicons name="chatbubble-ellipses-outline" size={18} color="#FFF" />
          <Text style={styles.chatButtonText}>Volver al chat</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loader: { marginTop: 24 },
  content: { padding: 16, gap: 14, paddingBottom: 28 },
  profileCard: { borderRadius: 16, borderWidth: 1, alignItems: 'center', padding: 18, gap: 8 },
  avatar: { width: 86, height: 86, borderRadius: 43, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 32, fontWeight: '700' },
  name: { fontSize: 20, fontWeight: '700' },
  subtitle: { fontSize: 13 },
  infoCard: { borderRadius: 14, borderWidth: 1, padding: 12, gap: 12 },
  row: { gap: 4 },
  label: { fontSize: 12, fontWeight: '600' },
  value: { fontSize: 15, fontWeight: '600' },
  chatButton: {
    marginTop: 6,
    backgroundColor: '#1F7AE0',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 12,
  },
  chatButtonText: { color: '#FFF', fontWeight: '700' },
});
