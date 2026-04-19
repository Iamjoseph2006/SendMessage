import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { createCall, listenCallHistory, CallLog, CallType } from '@/src/features/calls/services/callService';
import { getUsers, UserProfile } from '@/src/features/users/services/userService';
import { darkPalette, lightPalette, useAppTheme } from '@/src/presentation/theme/appTheme';
import { getAvatarInitials } from '@/src/shared/utils/avatar';

export default function CallsScreen() {
  const { user } = useAuth();
  const { isDark } = useAppTheme();
  const palette = isDark ? darkPalette : lightPalette;
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [activeCallUser, setActiveCallUser] = useState<UserProfile | null>(null);
  const [callMode, setCallMode] = useState<CallType>('voice');
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  const loadData = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const directory = await getUsers(user.uid);
      setUsers(directory.slice(0, 8));
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar llamadas.');
    }
  }, [user?.uid]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribe = listenCallHistory(user.uid, (nextCalls) => { setCalls(nextCalls); setError(null); }, (listenError) => setError(listenError.message));
    return unsubscribe;
  }, [user?.uid]);

  const usersById = useMemo(() => users.reduce<Record<string, string>>((acc, item) => { acc[item.uid] = item.name || item.email; return acc; }, {}), [users]);

  const triggerCall = async (receiver: UserProfile, mode: CallType) => {
    if (!user?.uid) return;
    setCallMode(mode);
    setActiveCallUser(receiver);
    try {
      await createCall(user.uid, receiver.uid, mode);
      await loadData();
    } catch (callError) {
      setError(callError instanceof Error ? callError.message : 'No se pudo registrar llamada.');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}> 
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}><Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Llamadas</Text></View>

      <ScrollView contentContainerStyle={styles.container}>
        {users.map((directoryUser) => {
          const displayName = directoryUser.name || directoryUser.email;
          return (
            <View style={[styles.row, { backgroundColor: palette.surface, borderColor: palette.border }]} key={directoryUser.uid}>
              <View style={[styles.avatar, { backgroundColor: isDark ? '#20314A' : '#E8F1FF' }]}><Text style={[styles.avatarText, { color: palette.textPrimary }]}>{getAvatarInitials(displayName)}</Text></View>
              <View style={styles.dataWrap}><Text style={[styles.name, { color: palette.textPrimary }]}>{displayName}</Text><Text style={[styles.meta, { color: palette.textSecondary }]}>{directoryUser.email}</Text></View>
              <View style={styles.actions}>
                <Pressable style={styles.iconAction} onPress={() => triggerCall(directoryUser, 'voice')}><Ionicons name="call" size={18} color="#63D481" /></Pressable>
                <Pressable style={styles.iconAction} onPress={() => triggerCall(directoryUser, 'video')}><Ionicons name="videocam" size={20} color="#78A9FF" /></Pressable>
              </View>
            </View>
          );
        })}

        <Text style={[styles.historyTitle, { color: palette.textPrimary }]}>Historial</Text>
        {!calls.length ? <Text style={[styles.meta, { color: palette.textSecondary }]}>Aún no hay llamadas registradas.</Text> : null}
        {calls.map((call) => {
          const isCaller = call.callerId === user?.uid;
          const counterpartId = isCaller ? call.receiverId : call.callerId;
          return <Text key={call.id} style={[styles.meta, { color: palette.textSecondary }]}>{isCaller ? 'Saliente' : 'Entrante'} · {usersById[counterpartId] ?? counterpartId} · {call.type} · {call.status}</Text>;
        })}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      {activeCallUser ? (
        <ImageBackground source={{ uri: 'https://images.unsplash.com/photo-1528459105426-b954836706fe?q=80&w=1200&auto=format&fit=crop' }} style={styles.callScreen} imageStyle={styles.callBg}>
          <View style={styles.callOverlay}>
            <Text style={styles.callName}>{activeCallUser.name || activeCallUser.email}</Text>
            <Text style={styles.callState}>{callMode === 'voice' ? 'Llamando…' : 'Videollamando…'}</Text>
            <View style={styles.bigAvatar}><Text style={styles.bigAvatarText}>{getAvatarInitials(activeCallUser.name || activeCallUser.email)}</Text></View>
            <View style={styles.floatControls}>
              <Pressable style={[styles.controlBtn, { backgroundColor: '#2D3A4A' }]}><Ionicons name="mic-off" size={20} color="#FFF" /></Pressable>
              <Pressable style={[styles.controlBtn, { backgroundColor: '#2D3A4A' }]}><Ionicons name="volume-high" size={20} color="#FFF" /></Pressable>
              <Pressable style={[styles.controlBtn, { backgroundColor: '#2D3A4A' }]}><Ionicons name="videocam" size={20} color="#FFF" /></Pressable>
              <Pressable style={[styles.controlBtn, { backgroundColor: '#2D3A4A' }]}><Ionicons name="ellipsis-horizontal" size={20} color="#FFF" /></Pressable>
            </View>
            <Pressable style={styles.hangBtn} onPress={() => setActiveCallUser(null)}><Ionicons name="call" size={22} color="#FFF" style={{ transform: [{ rotate: '135deg' }] }} /></Pressable>
          </View>
        </ImageBackground>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  headerTitle: { fontSize: 34, fontWeight: '800' },
  container: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 100, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, padding: 12, gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '700' },
  dataWrap: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700' },
  meta: { marginTop: 2, fontSize: 13 },
  actions: { flexDirection: 'row', gap: 8 },
  iconAction: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1B2532', alignItems: 'center', justifyContent: 'center' },
  historyTitle: { marginTop: 6, fontWeight: '700', fontSize: 16 },
  error: { color: '#D93025' },
  callScreen: { ...StyleSheet.absoluteFillObject },
  callBg: { opacity: 0.35 },
  callOverlay: { flex: 1, backgroundColor: '#0A1019EE', alignItems: 'center', paddingTop: 120 },
  callName: { color: '#FFF', fontSize: 34, fontWeight: '700' },
  callState: { color: '#A9BBD1', marginTop: 8, fontSize: 16 },
  bigAvatar: { width: 170, height: 170, borderRadius: 85, backgroundColor: '#21324A', alignItems: 'center', justifyContent: 'center', marginTop: 50 },
  bigAvatarText: { color: '#E8F1FF', fontSize: 56, fontWeight: '800' },
  floatControls: { marginTop: 56, flexDirection: 'row', gap: 14 },
  controlBtn: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  hangBtn: { position: 'absolute', bottom: 84, width: 72, height: 72, borderRadius: 36, backgroundColor: '#E53935', alignItems: 'center', justifyContent: 'center' },
});
