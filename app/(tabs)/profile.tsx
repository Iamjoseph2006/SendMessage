import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { listenProfile, updateProfileName } from '@/src/features/profile/services/profileService';
import { UserProfile } from '@/src/features/users/services/userService';
import { darkPalette, lightPalette, useAppTheme } from '@/src/presentation/theme/appTheme';

const options = [
  { id: 'notifications', icon: 'notifications-outline', label: 'Notificaciones' },
  { id: 'privacy', icon: 'lock-closed-outline', label: 'Privacidad' },
  { id: 'appearance', icon: 'color-palette-outline', label: 'Apariencia' },
  { id: 'help', icon: 'help-circle-outline', label: 'Ayuda' },
] as const;

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { isDark } = useAppTheme();
  const palette = isDark ? darkPalette : lightPalette;
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [nextName, setNextName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!user?.uid) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const unsubscribe = listenProfile(
      user.uid,
      (nextProfile) => {
        setProfile(nextProfile);
        if (nextProfile) {
          console.log('Nombre:', nextProfile.name);
        }
        setLoading(false);
      },
      (listenError) => {
        setError(listenError.message);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [user?.uid]);

  const openEditProfile = () => {
    setError(null);
    setNextName(profile?.name || user?.displayName || '');
    setShowEditModal(true);
  };

  const saveProfileName = async () => {
    if (!user?.uid) {
      return;
    }

    const normalizedName = nextName.trim();
    const currentName = (profile?.name || '').trim();

    if (!normalizedName) {
      setError('El nombre no puede estar vacío.');
      return;
    }

    if (normalizedName === currentName) {
      setShowEditModal(false);
      return;
    }

    setSavingName(true);
    setError(null);

    try {
      await updateProfileName(user.uid, normalizedName);
      setShowEditModal(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No fue posible guardar tu nombre.');
    } finally {
      setSavingName(false);
    }
  };


  const handleLogout = async () => {
    if (loggingOut) {
      return;
    }

    setError(null);
    setLoggingOut(true);

    try {
      await logout();
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : 'No fue posible cerrar sesión.');
    } finally {
      setLoggingOut(false);
    }
  };
  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}> 
        <ActivityIndicator style={{ marginTop: 40 }} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}> 
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}> 
        <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Perfil</Text>
      </View>
      <View style={styles.container}>
        <View style={[styles.headerCard, { borderColor: palette.border, backgroundColor: palette.surface }]}> 
          <View style={[styles.profilePhoto, { backgroundColor: isDark ? '#21314A' : '#D9EAFF' }]}> 
            <Text style={[styles.profileInitial, { color: palette.textPrimary }]}>
              {(profile?.name || profile?.email || 'U').charAt(0)}
            </Text>
          </View>
          <Text style={[styles.name, { color: palette.textPrimary }]}>{profile?.name || profile?.email || 'Sin nombre'}</Text>
          <Text style={[styles.email, { color: palette.textSecondary }]}>{profile?.email ?? user?.email}</Text>
          <Pressable style={styles.editButton} onPress={openEditProfile}>
            <Text style={styles.editButtonText}>Editar perfil</Text>
          </Pressable>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        {options.map((option) => (
          <Pressable
            key={option.id}
            style={[styles.optionRow, { borderColor: palette.border, backgroundColor: palette.surface }]}
            onPress={() => router.push(`/profile/${option.id}`)}>
            <Ionicons name={option.icon} size={20} color={palette.accent} />
            <Text style={[styles.optionText, { color: palette.textPrimary }]}>{option.label}</Text>
            <Ionicons name="chevron-forward" size={18} color="#A1AFC1" />
          </Pressable>
        ))}

        <Pressable style={styles.logoutButton} disabled={loggingOut} onPress={handleLogout}>
          {loggingOut ? <ActivityIndicator color="#C62828" size="small" /> : <Text style={styles.logoutText}>Cerrar sesión</Text>}
        </Pressable>
      </View>

      <Modal visible={showEditModal} transparent animationType="fade" onRequestClose={() => setShowEditModal(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowEditModal(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: palette.surface }]} onPress={() => undefined}>
            <Text style={[styles.modalTitle, { color: palette.textPrimary }]}>Editar perfil</Text>
            <TextInput
              value={nextName}
              onChangeText={setNextName}
              editable={!savingName}
              autoCapitalize="words"
              placeholder="Tu nombre"
              placeholderTextColor={palette.textSecondary}
              style={[
                styles.input,
                {
                  color: palette.textPrimary,
                  borderColor: palette.border,
                  backgroundColor: isDark ? '#121A28' : '#F8FBFF',
                },
              ]}
            />

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelButton} disabled={savingName} onPress={() => setShowEditModal(false)}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable style={styles.saveButton} disabled={savingName} onPress={saveProfileName}>
                {savingName ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.saveButtonText}>Guardar</Text>}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
    gap: 8,
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
  name: { fontSize: 20, fontWeight: '700' },
  email: { fontSize: 14 },
  editButton: {
    marginTop: 6,
    backgroundColor: '#E8F1FF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  editButtonText: { color: '#1F57A4', fontWeight: '700' },
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
  error: { color: '#D93025' },
  logoutButton: {
    marginTop: 8,
    backgroundColor: '#FEECEC',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  logoutText: { color: '#C62828', fontWeight: '700' },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalCard: {
    width: '88%',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F1F4F9',
  },
  cancelButtonText: { color: '#42526B', fontWeight: '700' },
  saveButton: {
    minWidth: 90,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#1F7AE0',
    alignItems: 'center',
  },
  saveButtonText: { color: '#FFF', fontWeight: '700' },
});
