import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useCallsViewModel } from '@/src/presentation/viewmodels/useCallsViewModel';

const callTypeLabel = {
  incoming: 'Entrante',
  outgoing: 'Saliente',
  missed: 'Perdida',
} as const;

export default function CallsScreen() {
  const { calls } = useCallsViewModel();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
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
              <Pressable style={styles.iconAction}>
                <Ionicons name="call" size={18} color="#1F7AE0" />
              </Pressable>
              <Pressable style={styles.iconAction}>
                <Ionicons name="videocam" size={20} color="#1F7AE0" />
              </Pressable>
            </View>
          </View>
        ))}
      </View>
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
});
