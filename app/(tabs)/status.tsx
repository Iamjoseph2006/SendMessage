import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useStatusesViewModel } from '@/src/presentation/viewmodels/useStatusesViewModel';

export default function StatusScreen() {
  const { statuses } = useStatusesViewModel();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Pressable style={styles.addStatus}>
          <View style={styles.avatar}>
            <Ionicons name="add" size={22} color="#1F7AE0" />
          </View>
          <View>
            <Text style={styles.title}>Mi estado</Text>
            <Text style={styles.subtitle}>Toca para compartir una actualización</Text>
          </View>
        </Pressable>

        {statuses.map((status) => (
          <View key={status.id} style={styles.row}>
            <View style={[styles.storyRing, status.viewed && styles.storyRingViewed]} />
            <View>
              <Text style={styles.title}>{status.name}</Text>
              <Text style={styles.subtitle}>{status.time}</Text>
            </View>
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFF' },
  container: { paddingHorizontal: 16, paddingTop: 10, gap: 14 },
  addStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6EBF2',
    padding: 12,
  },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#EAF3FF', alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  storyRing: { width: 46, height: 46, borderRadius: 23, borderWidth: 3, borderColor: '#1F7AE0', backgroundColor: '#F5FAFF' },
  storyRingViewed: { borderColor: '#BCC9D8' },
  title: { color: '#22354D', fontWeight: '700', fontSize: 16 },
  subtitle: { color: '#6A7D95', marginTop: 1 },
});
