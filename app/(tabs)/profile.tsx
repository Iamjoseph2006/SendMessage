import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useProfileViewModel } from '@/src/presentation/viewmodels/useProfileViewModel';

const options = [
  { id: 'notifications', icon: 'notifications-outline', label: 'Notificaciones' },
  { id: 'privacy', icon: 'lock-closed-outline', label: 'Privacidad' },
  { id: 'appearance', icon: 'color-palette-outline', label: 'Apariencia' },
  { id: 'help', icon: 'help-circle-outline', label: 'Ayuda' },
] as const;

export default function ProfileScreen() {
  const { profile } = useProfileViewModel();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  if (!profile) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <Text style={styles.headerTitle}>Perfil</Text>
      </View>
      <View style={styles.container}>
        <View style={styles.headerCard}>
          <View style={styles.profilePhoto}>
            <Text style={styles.profileInitial}>{profile.name.charAt(0)}</Text>
          </View>
          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.about}>{profile.about}</Text>
          <Text style={styles.phone}>{profile.phone}</Text>
        </View>

        {options.map((option) => (
          <Pressable key={option.id} style={styles.optionRow} onPress={() => router.push(`/profile/${option.id}`)}>
            <Ionicons name={option.icon} size={20} color="#1F7AE0" />
            <Text style={styles.optionText}>{option.label}</Text>
            <Ionicons name="chevron-forward" size={18} color="#A1AFC1" />
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFF' },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  headerTitle: { fontSize: 34, fontWeight: '800', color: '#1A2B44' },
  container: { padding: 16, gap: 12 },
  headerCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E6EBF2',
    alignItems: 'center',
    padding: 18,
    gap: 4,
  },
  profilePhoto: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#D9EAFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  profileInitial: { fontSize: 28, fontWeight: '800', color: '#214060' },
  name: { fontSize: 22, fontWeight: '800', color: '#1A2B44' },
  about: { fontSize: 15, color: '#5C6F89' },
  phone: { fontSize: 14, color: '#7A8CA5' },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6EBF2',
    paddingVertical: 13,
    paddingHorizontal: 12,
  },
  optionText: { flex: 1, color: '#253952', fontWeight: '600', fontSize: 15 },
});
