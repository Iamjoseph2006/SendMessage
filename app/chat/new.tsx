import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { createOrGetChat } from '@/src/features/chat/services/chatService';
import { useUsersDirectory } from '@/src/features/users/hooks/useUsersDirectory';
import { darkPalette, lightPalette, useAppTheme } from '@/src/presentation/theme/appTheme';
import { getAvatarInitials } from '@/src/shared/utils/avatar';

export default function NewChatScreen() {
  const { user } = useAuth();
  const { users, loading, error } = useUsersDirectory(user?.uid ?? null);
  const { isDark } = useAppTheme();
  const palette = isDark ? darkPalette : lightPalette;
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [startingChatWith, setStartingChatWith] = useState<string | null>(null);
  const [screenError, setScreenError] = useState<string | null>(null);

  const openOrCreateChat = async (contactUid: string) => {
    if (!user?.uid) {
      return;
    }

    setScreenError(null);
    setStartingChatWith(contactUid);

    try {
      const chatId = await createOrGetChat(user.uid, contactUid);
      router.replace(`/chat/${chatId}`);
    } catch (createError) {
      setScreenError(createError instanceof Error ? createError.message : 'No fue posible crear la conversación.');
    } finally {
      setStartingChatWith(null);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <Stack.Screen options={{ title: 'Iniciar chat' }} />

      {screenError || error ? <Text style={styles.error}>{screenError ?? error}</Text> : null}

      <FlatList
        contentContainerStyle={[styles.content, { paddingHorizontal: Math.max(12, Math.min(20, width * 0.05)) }]}
        data={users}
        keyExtractor={(item) => item.uid}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={styles.loading} size="small" />
          ) : (
            <Text style={[styles.empty, { color: palette.textSecondary }]}>No hay otros usuarios disponibles.</Text>
          )
        }
        renderItem={({ item }) => {
          const displayName = item.name || item.email;

          return (
            <Pressable
              style={[styles.row, { borderColor: palette.border, backgroundColor: palette.surface }]}
              disabled={startingChatWith === item.uid}
              onPress={() => openOrCreateChat(item.uid)}>
              <View style={[styles.avatar, { width: width < 360 ? 40 : 44, height: width < 360 ? 40 : 44, borderRadius: width < 360 ? 20 : 22 }]}>
                <Text style={styles.avatarText}>{getAvatarInitials(displayName)}</Text>
              </View>

              <View style={styles.textWrap}>
                <Text style={[styles.name, { color: palette.textPrimary }]}>{displayName}</Text>
                <Text style={[styles.email, { color: palette.textSecondary }]}>{item.email}</Text>
              </View>

              {startingChatWith === item.uid ? <ActivityIndicator size="small" /> : null}
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 16, gap: 10, paddingBottom: 30 },
  loading: { marginTop: 24 },
  row: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#BFD7F7',
  },
  avatarText: { fontWeight: '700', fontSize: 17, color: '#234' },
  textWrap: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700' },
  email: { fontSize: 13, marginTop: 1 },
  error: { color: '#D93025', marginHorizontal: 16, marginTop: 12 },
  empty: { textAlign: 'center', marginTop: 18 },
});
