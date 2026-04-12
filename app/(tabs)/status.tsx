import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { getStatuses, createStatus, StatusItem } from '@/src/features/status/services/statusService';
import { getUsersByUids } from '@/src/features/users/services/userService';
import { darkPalette, lightPalette, useAppTheme } from '@/src/presentation/theme/appTheme';

export default function StatusScreen() {
  const { user } = useAuth();
  const { isDark } = useAppTheme();
  const palette = isDark ? darkPalette : lightPalette;
  const [showCreator, setShowCreator] = useState(false);
  const [content, setContent] = useState('');
  const [statuses, setStatuses] = useState<StatusItem[]>([]);
  const [usersById, setUsersById] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const loadStatuses = async () => {
    try {
      const nextStatuses = await getStatuses();
      setStatuses(nextStatuses);
      const userIds = [...new Set(nextStatuses.map((item) => item.userId).filter(Boolean))];
      const users = await getUsersByUids(userIds);
      const map = users.reduce<Record<string, string>>((acc, item) => {
        acc[item.uid] = item.name;
        return acc;
      }, {});
      setUsersById(map);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los estados.');
    }
  };

  useEffect(() => {
    loadStatuses();
  }, []);

  const onCreateStatus = async () => {
    if (!user?.uid) {
      return;
    }

    try {
      setError(null);
      await createStatus(user.uid, content);
      setContent('');
      setShowCreator(false);
      await loadStatuses();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'No se pudo crear el estado.');
    }
  };

  const rows = useMemo(
    () =>
      statuses.map((status) => ({
        ...status,
        owner: status.userId === user?.uid ? 'Tu estado' : usersById[status.userId] ?? 'Usuario',
      })),
    [statuses, user?.uid, usersById],
  );

  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Estados</Text>
      </View>
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable style={[styles.addStatus, { borderColor: palette.border, backgroundColor: palette.surface }]} onPress={() => setShowCreator(true)}>
          <View style={[styles.avatar, { backgroundColor: isDark ? '#21314A' : '#EAF3FF' }]}>
            <Ionicons name="add" size={22} color={palette.accent} />
          </View>
          <View style={styles.myStatusText}>
            <Text style={[styles.title, { color: palette.textPrimary }]}>Mi estado</Text>
            <Text style={[styles.subtitle, { color: palette.textSecondary }]}>Comparte una actualización</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#A1AFC1" />
        </Pressable>

        {rows.map((status) => (
          <View key={status.id} style={styles.row}>
            <View style={styles.storyRing} />
            <View style={styles.statusTextWrap}>
              <Text style={[styles.title, { color: palette.textPrimary }]}>{status.owner}</Text>
              <Text style={[styles.subtitle, { color: palette.textSecondary }]}>{status.content}</Text>
            </View>
          </View>
        ))}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <Modal visible={showCreator} transparent animationType="slide" onRequestClose={() => setShowCreator(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: palette.surface }]}>
            <Text style={[styles.modalTitle, { color: palette.textPrimary }]}>Nuevo estado</Text>
            <TextInput
              style={[styles.captionInput, { borderColor: palette.border, color: palette.textPrimary }]}
              value={content}
              onChangeText={setContent}
              placeholder="Escribe un estado..."
              placeholderTextColor="#8C9DB0"
              multiline
            />
            <Pressable style={styles.publishButton} onPress={onCreateStatus}>
              <Text style={styles.publishText}>Publicar</Text>
            </Pressable>
            <Pressable style={styles.cancelButton} onPress={() => setShowCreator(false)}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFF' },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  headerTitle: { fontSize: 34, fontWeight: '800', color: '#1A2B44' },
  container: { paddingHorizontal: 16, paddingTop: 10, gap: 14, paddingBottom: 30 },
  addStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6EBF2',
    padding: 12,
  },
  myStatusText: { flex: 1 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#EAF3FF', alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusTextWrap: { flex: 1 },
  storyRing: { width: 46, height: 46, borderRadius: 23, borderWidth: 3, borderColor: '#1F7AE0', backgroundColor: '#F5FAFF' },
  title: { color: '#22354D', fontWeight: '700', fontSize: 16 },
  subtitle: { color: '#6A7D95', marginTop: 1 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(24,36,53,0.4)' },
  modalCard: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 12,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#22354D' },
  captionInput: {
    minHeight: 86,
    borderWidth: 1,
    borderColor: '#E6EBF2',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  publishButton: {
    backgroundColor: '#1F7AE0',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 10,
  },
  publishText: { color: '#FFF', fontWeight: '700' },
  cancelButton: { alignItems: 'center', paddingVertical: 10 },
  cancelText: { color: '#1F7AE0', fontWeight: '700' },
  error: { color: '#D93025' },
});
