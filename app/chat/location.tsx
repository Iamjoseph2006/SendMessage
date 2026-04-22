import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Linking, Pressable, StyleSheet, Text, View, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChatLocationScreen() {
  const { latitude, longitude, label } = useLocalSearchParams<{ latitude: string; longitude: string; label?: string }>();
  const router = useRouter();
  const lat = Number(latitude);
  const lng = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.error}>Ubicación inválida.</Text>
      </SafeAreaView>
    );
  }

  const imageUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=14&size=900x520&markers=${lat},${lng},red-pushpin`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: 'Ubicación' }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}><Ionicons name="chevron-back" size={24} color="#FFF" /></Pressable>
        <Text style={styles.title}>{label || 'Ubicación compartida'}</Text>
      </View>
      <Image source={{ uri: imageUrl }} style={styles.map} resizeMode="cover" />
      <Pressable style={styles.openButton} onPress={() => Linking.openURL(`https://maps.google.com/?q=${lat},${lng}`)}>
        <Text style={styles.openButtonText}>Abrir en Google Maps</Text>
      </Pressable>
      <Text style={styles.coords}>{lat.toFixed(5)}, {lng.toFixed(5)}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0E1624' },
  header: { paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  map: { flex: 1, marginHorizontal: 14, borderRadius: 12 },
  openButton: { marginHorizontal: 16, marginTop: 12, backgroundColor: '#1F7AE0', borderRadius: 12, alignItems: 'center', paddingVertical: 12 },
  openButtonText: { color: '#FFF', fontWeight: '700' },
  coords: { color: '#C4D6ED', textAlign: 'center', padding: 10, fontSize: 12 },
  error: { color: '#FFF', textAlign: 'center', marginTop: 40 },
});
