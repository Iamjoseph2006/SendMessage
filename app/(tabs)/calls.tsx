import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { CallLog, CallType, createCall, deleteCall, listenCallHistory } from '@/src/features/calls/services/callService';
import { UserProfile, getUsers } from '@/src/features/users/services/userService';
import { darkPalette, lightPalette, useAppTheme } from '@/src/presentation/theme/appTheme';
import { getAvatarInitials } from '@/src/shared/utils/avatar';
import { toSafeDate } from '@/src/shared/utils/date';

const formatCallMoment = (createdAt?: CallLog['createdAt']) => {
  const date = toSafeDate(createdAt);
  if (!date) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const getCallDirection = (call: CallLog, userId?: string) => {
  if (!userId) return 'incoming' as const;
  return call.callerId === userId ? 'outgoing' : 'incoming';
};

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
      setUsers(directory.slice(0, 10));
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar llamadas.');
    }
  }, [user?.uid]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribe = listenCallHistory(
      user.uid,
      (nextCalls) => {
        setCalls(nextCalls);
        setError(null);
      },
      (listenError) => setError(listenError.message),
    );
    return unsubscribe;
  }, [user?.uid]);

  const usersById = useMemo(
    () => users.reduce<Record<string, string>>((acc, item) => {
      acc[item.uid] = item.name || item.email;
      return acc;
    }, {}),
    [users],
  );

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

  const groupedSummary = useMemo(() => {
    const missed = calls.filter((call) => call.status === 'missed').length;
    const outgoing = calls.filter((call) => getCallDirection(call, user?.uid) === 'outgoing').length;
    return { missed, outgoing, total: calls.length };
  }, [calls, user?.uid]);

  const onDeleteCall = (call: CallLog) => {
    Alert.alert('Eliminar llamada', '¿Quieres borrar este registro del historial?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCall(call.id);
            setError(null);
          } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar la llamada.');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}> 
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}> 
        <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Llamadas</Text>
        <Text style={[styles.headerSubtitle, { color: palette.textSecondary }]}>Llama rápido y revisa tu historial reciente.</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={[styles.summaryRow, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
          <View style={styles.summaryItem}><Text style={[styles.summaryValue, { color: palette.textPrimary }]}>{groupedSummary.total}</Text><Text style={[styles.summaryLabel, { color: palette.textSecondary }]}>Total</Text></View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}><Text style={[styles.summaryValue, { color: palette.textPrimary }]}>{groupedSummary.missed}</Text><Text style={[styles.summaryLabel, { color: palette.textSecondary }]}>Perdidas</Text></View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}><Text style={[styles.summaryValue, { color: palette.textPrimary }]}>{groupedSummary.outgoing}</Text><Text style={[styles.summaryLabel, { color: palette.textSecondary }]}>Salientes</Text></View>
        </View>

        <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Contactos frecuentes</Text>
        {users.map((directoryUser) => {
          const displayName = directoryUser.name || directoryUser.email;
          return (
            <View style={[styles.row, { backgroundColor: palette.surface, borderColor: palette.border }]} key={directoryUser.uid}>
              <View style={[styles.avatar, { backgroundColor: isDark ? '#20314A' : '#E8F1FF' }]}><Text style={[styles.avatarText, { color: isDark ? '#D9E8FF' : '#1E3A66' }]}>{getAvatarInitials(displayName)}</Text></View>
              <View style={styles.dataWrap}><Text style={[styles.name, { color: palette.textPrimary }]}>{displayName}</Text><Text style={[styles.meta, { color: palette.textSecondary }]}>{directoryUser.email}</Text></View>
              <View style={styles.actions}>
                <Pressable style={[styles.iconAction, { backgroundColor: palette.background, borderColor: palette.border }]} onPress={() => triggerCall(directoryUser, 'voice')}>
                  <Ionicons name="call-outline" size={18} color={palette.textPrimary} />
                </Pressable>
                <Pressable style={[styles.iconAction, { backgroundColor: palette.background, borderColor: palette.border }]} onPress={() => triggerCall(directoryUser, 'video')}>
                  <Ionicons name="videocam-outline" size={20} color={palette.textPrimary} />
                </Pressable>
              </View>
            </View>
          );
        })}

        <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Historial</Text>
        {!calls.length ? <Text style={[styles.meta, { color: palette.textSecondary }]}>Aún no hay llamadas registradas.</Text> : null}
        {calls.map((call) => {
          const direction = getCallDirection(call, user?.uid);
          const counterpartId = direction === 'outgoing' ? call.receiverId : call.callerId;
          const counterpartName = usersById[counterpartId] ?? counterpartId;
          const isMissed = call.status === 'missed';
          const directionColor = palette.textSecondary;
          const directionIcon = isMissed ? 'arrow-down-circle-outline' : direction === 'outgoing' ? 'arrow-up-outline' : 'arrow-down-outline';

          return (
            <View key={call.id} style={[styles.historyCard, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
              <View style={[styles.historyIconWrap, { backgroundColor: isDark ? '#1E2B3A' : '#EDF4FF' }]}>
                <Ionicons name={directionIcon as any} size={18} color={directionColor} />
              </View>
              <View style={styles.historyTextWrap}>
                <Text style={[styles.historyName, { color: palette.textPrimary }]}>{counterpartName}</Text>
                <Text style={[styles.historyMeta, { color: directionColor }]}>{isMissed ? 'Perdida' : direction === 'outgoing' ? 'Saliente' : 'Entrante'} · {call.type === 'video' ? 'Videollamada' : 'Llamada'}</Text>
              </View>
              <Text style={[styles.historyDate, { color: palette.textSecondary }]}>{formatCallMoment(call.createdAt)}</Text>
              <Pressable onPress={() => onDeleteCall(call)} style={[styles.deleteAction, { borderColor: palette.border, backgroundColor: palette.background }]}>
                <Ionicons name="trash-outline" size={16} color={palette.textSecondary} />
              </Pressable>
            </View>
          );
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
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, gap: 2 },
  headerTitle: { fontSize: 34, fontWeight: '800' },
  headerSubtitle: { fontSize: 13 },
  container: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 100, gap: 12 },
  summaryRow: { borderWidth: 1, borderRadius: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center', gap: 2 },
  summaryValue: { fontSize: 20, fontWeight: '800' },
  summaryLabel: { fontSize: 12, fontWeight: '600' },
  summaryDivider: { width: 1, alignSelf: 'stretch', backgroundColor: '#D0D7E4' },
  sectionTitle: { marginTop: 8, fontWeight: '800', fontSize: 17 },
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, padding: 12, gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '700' },
  dataWrap: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700' },
  meta: { marginTop: 2, fontSize: 13 },
  actions: { flexDirection: 'row', gap: 8 },
  iconAction: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  historyCard: { borderWidth: 1, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  historyIconWrap: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  historyTextWrap: { flex: 1, gap: 2 },
  historyName: { fontSize: 15, fontWeight: '700' },
  historyMeta: { fontSize: 12, fontWeight: '600' },
  historyDate: { fontSize: 12, fontWeight: '500' },
  deleteAction: { marginLeft: 6, width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
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
