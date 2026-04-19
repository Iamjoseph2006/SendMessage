import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { StatusItem, getStatusesByUser, markStatusAsViewed } from '@/src/features/status/services/statusService';
import { getUsersByUids } from '@/src/features/users/services/userService';

export default function StatusViewerScreen() {
  const { userId } = useLocalSearchParams<{ userId: string | string[] }>();
  const normalizedUserId = Array.isArray(userId) ? userId[0] : userId;
  const { user } = useAuth();
  const router = useRouter();
  const [statuses, setStatuses] = useState<StatusItem[]>([]);
  const [index, setIndex] = useState(0);
  const [ownerName, setOwnerName] = useState('Estado');

  useEffect(() => {
    if (!normalizedUserId) return;

    getStatusesByUser(normalizedUserId).then(setStatuses).catch(() => setStatuses([]));
    getUsersByUids([normalizedUserId])
      .then(([owner]) => setOwnerName(owner?.name ?? owner?.email ?? 'Estado'))
      .catch(() => setOwnerName('Estado'));
  }, [normalizedUserId]);

  useEffect(() => {
    const current = statuses[index];
    if (current?.id && user?.uid) {
      markStatusAsViewed(current.id, user.uid).catch(() => undefined);
    }
  }, [index, statuses, user?.uid]);

  const current = useMemo(() => statuses[index] ?? null, [statuses, index]);

  if (!current) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.empty}>No hay estados para mostrar.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="close" color="#FFF" size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>{ownerName}</Text>
      </View>

      <View style={styles.progressWrap}>
        {statuses.map((item, idx) => (
          <View key={item.id} style={[styles.progressBar, idx <= index ? styles.progressActive : null]} />
        ))}
      </View>

      <View style={styles.viewerBody}>
        {current.imageUri ? <Image source={{ uri: current.imageUri }} style={styles.image} resizeMode="cover" /> : null}
        {!!current.content && <Text style={styles.content}>{current.content}</Text>}
        {current.location ? <Text style={styles.meta}>📍 {current.location.label ?? `${current.location.latitude.toFixed(4)}, ${current.location.longitude.toFixed(4)}`}</Text> : null}
        {current.audioUri ? <Text style={styles.meta}>🎤 Estado con audio</Text> : null}
      </View>

      <View style={styles.controls}>
        <Pressable disabled={index <= 0} onPress={() => setIndex((prev) => Math.max(0, prev - 1))}>
          <Ionicons name="chevron-back-circle" color={index <= 0 ? '#64758B' : '#FFFFFF'} size={38} />
        </Pressable>
        <Pressable disabled={index >= statuses.length - 1} onPress={() => setIndex((prev) => Math.min(statuses.length - 1, prev + 1))}>
          <Ionicons name="chevron-forward-circle" color={index >= statuses.length - 1 ? '#64758B' : '#FFFFFF'} size={38} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000' },
  empty: { color: '#FFF', textAlign: 'center', marginTop: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 10 },
  headerTitle: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  progressWrap: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, marginTop: 12 },
  progressBar: { flex: 1, height: 3, borderRadius: 2, backgroundColor: '#3A4B60' },
  progressActive: { backgroundColor: '#FFFFFF' },
  viewerBody: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16, gap: 10 },
  image: { width: '100%', height: '70%', borderRadius: 12 },
  content: { color: '#FFF', fontSize: 24, fontWeight: '700', textAlign: 'center' },
  meta: { color: '#D7E2EF', fontSize: 14 },
  controls: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 30 },
});
