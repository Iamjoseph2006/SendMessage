import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { createCall, listenCallHistory, CallLog, CallType } from '@/src/features/calls/services/callService';
import { getUsers, UserProfile } from '@/src/features/users/services/userService';
import { darkPalette, lightPalette, useAppTheme } from '@/src/presentation/theme/appTheme';

export default function CallsScreen() {
  const { user } = useAuth();
  const { isDark } = useAppTheme();
  const palette = isDark ? darkPalette : lightPalette;

  const [calls, setCalls] = useState<CallLog[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [activeCall, setActiveCall] = useState<string | null>(null);
  const [callMode, setCallMode] = useState<CallType>('voice');
  const [error, setError] = useState<string | null>(null);

  const insets = useSafeAreaInsets();

  const loadData = useCallback(async () => {
    if (!user?.uid) {
      return;
    }

    try {
      const directory = await getUsers(user.uid);
      setUsers(directory.slice(0, 6));
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el historial de llamadas.');
    }
  }, [user?.uid]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!user?.uid) {
      setCalls([]);
      return;
    }

    const unsubscribe = listenCallHistory(
      user.uid,
      (nextCalls) => {
        setCalls(nextCalls);
        setError(null);
      },
      (listenError) => {
        setError(listenError.message);
      },
    );

    return unsubscribe;
  }, [user?.uid]);

  const usersById = useMemo(
    () =>
      users.reduce<Record<string, string>>((acc, item) => {
        acc[item.uid] = item.name || item.email;
        return acc;
      }, {}),
    [users],
  );

  const triggerCall = async (receiverId: string, mode: CallType) => {
    if (!user?.uid) {
      return;
    }

    try {
      setError(null);
      setCallMode(mode);
      const receiverName = usersById[receiverId] ?? 'Usuario';
      setActiveCall(receiverName);
      await createCall(user.uid, receiverId, mode);
      await loadData();
    } catch (callError) {
      setError(callError instanceof Error ? callError.message : 'No se pudo registrar la llamada.');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}> 
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}> 
        <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Llamadas</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {users.map((directoryUser) => {
          const displayName = directoryUser.name || directoryUser.email;

          return (
            <View style={[styles.row, { backgroundColor: palette.surface, borderColor: palette.border }]} key={directoryUser.uid}>
              <View style={[styles.avatar, { backgroundColor: isDark ? '#20314A' : '#E8F1FF' }]}>
                <Text style={[styles.avatarText, { color: palette.textPrimary }]}>{displayName.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.dataWrap}>
                <Text style={[styles.name, { color: palette.textPrimary }]}>{displayName}</Text>
                <Text style={[styles.meta, { color: palette.textSecondary }]}>{directoryUser.email}</Text>
              </View>
              <View style={styles.actions}>
              <Pressable
                style={[styles.iconAction, { backgroundColor: isDark ? '#21314A' : '#ECF4FF' }]}
                onPress={() => triggerCall(directoryUser.uid, 'voice')}>
                <Ionicons name="call" size={18} color={palette.accent} />
              </Pressable>
              <Pressable
                style={[styles.iconAction, { backgroundColor: isDark ? '#21314A' : '#ECF4FF' }]}
                onPress={() => triggerCall(directoryUser.uid, 'video')}>
                <Ionicons name="videocam" size={20} color={palette.accent} />
              </Pressable>
            </View>
            </View>
          );
        })}

        <Text style={[styles.historyTitle, { color: palette.textPrimary }]}>Historial</Text>
        {!calls.length ? (
          <Text style={[styles.meta, { color: palette.textSecondary }]}>Aún no hay llamadas registradas.</Text>
        ) : null}
        {calls.map((call) => {
          const isCaller = call.callerId === user?.uid;
          const counterpartId = isCaller ? call.receiverId : call.callerId;

          return (
            <Text key={call.id} style={[styles.meta, { color: palette.textSecondary }]}> 
              {isCaller ? 'Saliente' : 'Entrante'} · {usersById[counterpartId] ?? counterpartId} · {call.type} · {call.status}
            </Text>
          );
        })}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      {activeCall ? (
        <View style={styles.callBanner}>
          <Ionicons name={callMode === 'voice' ? 'call' : 'videocam'} size={15} color="#FFFFFF" />
          <Text style={styles.callBannerText}>
            {callMode === 'voice' ? 'Llamando' : 'Videollamando'} a {activeCall}...
          </Text>
          <Pressable onPress={() => setActiveCall(null)} hitSlop={6}>
            <Ionicons name="close" size={17} color="#FFFFFF" />
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFF' },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  headerTitle: { fontSize: 34, fontWeight: '800', color: '#1A2B44' },
  container: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 100, gap: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E6EBF2',
    borderRadius: 14,
    padding: 12,
    gap: 12,
  },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#E8F1FF', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '700', color: '#213652' },
  dataWrap: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: '#22354D' },
  meta: { marginTop: 2, color: '#6A7D95', fontSize: 13 },
  actions: { flexDirection: 'row', gap: 8 },
  iconAction: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ECF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyTitle: { marginTop: 6, fontWeight: '700', fontSize: 16 },
  callBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 20,
    backgroundColor: '#1F7AE0',
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  callBannerText: { flex: 1, color: '#FFFFFF', fontWeight: '600' },
  error: { color: '#D93025' },
});
