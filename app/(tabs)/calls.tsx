import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useCallsViewModel } from '@/src/presentation/viewmodels/useCallsViewModel';

const callTypeLabel = {
  incoming: 'Entrante',
  outgoing: 'Saliente',
  missed: 'Perdida',
} as const;

export default function CallsScreen() {
  const { calls } = useCallsViewModel();
  const [activeCall, setActiveCall] = useState<string | null>(null);
  const [callMode, setCallMode] = useState<'audio' | 'video'>('audio');

  const insets = useSafeAreaInsets();

  const triggerCall = (name: string, mode: 'audio' | 'video') => {
    setCallMode(mode);
    setActiveCall(name);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <Text style={styles.headerTitle}>Llamadas</Text>
      </View>
      <View style={styles.container}>
        {calls.map((call) => (
          <View style={styles.row} key={call.id}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{call.name.charAt(0)}</Text>
            </View>
            <View style={styles.dataWrap}>
              <Text style={styles.name}>{call.name}</Text>
              <Text style={styles.meta}>
                {callTypeLabel[call.type]} · {call.time}
              </Text>
            </View>
            <View style={styles.actions}>
              <Pressable style={styles.iconAction} onPress={() => triggerCall(call.name, 'audio')}>
                <Ionicons name="call" size={18} color="#1F7AE0" />
              </Pressable>
              <Pressable style={styles.iconAction} onPress={() => triggerCall(call.name, 'video')}>
                <Ionicons name="videocam" size={20} color="#1F7AE0" />
              </Pressable>
            </View>
          </View>
        ))}
      </View>

      {activeCall ? (
        <View style={styles.callBanner}>
          <Ionicons name={callMode === 'audio' ? 'call' : 'videocam'} size={15} color="#FFFFFF" />
          <Text style={styles.callBannerText}>
            {callMode === 'audio' ? 'Llamando' : 'Videollamando'} a {activeCall}...
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
  container: { paddingHorizontal: 16, paddingTop: 10, gap: 12 },
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
});
