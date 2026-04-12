import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStatusesViewModel } from '@/src/presentation/viewmodels/useStatusesViewModel';
import { darkPalette, lightPalette, useAppTheme } from '@/src/presentation/theme/appTheme';

type LocalStatus = {
  id: string;
  name: string;
  time: string;
  viewed: boolean;
  caption?: string;
};

export default function StatusScreen() {
  const { statuses } = useStatusesViewModel();
  const { isDark } = useAppTheme();
  const palette = isDark ? darkPalette : lightPalette;
  const [showCreator, setShowCreator] = useState(false);
  const [caption, setCaption] = useState('');
  const [myStatuses, setMyStatuses] = useState<LocalStatus[]>([]);

  const createStatus = (type: 'gallery' | 'camera') => {
    const nextStatus: LocalStatus = {
      id: `my-${Date.now()}`,
      name: 'Tu estado',
      time: 'Ahora',
      viewed: false,
      caption: `${type === 'gallery' ? '🖼️ Estado desde galería' : '📷 Estado desde cámara'} ${caption ? `· ${caption}` : ''}`,
    };
    setMyStatuses((prev) => [nextStatus, ...prev]);
    setCaption('');
    setShowCreator(false);
  };

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

        {[...myStatuses, ...statuses].map((status) => {
          const subtitle = (status as LocalStatus).caption ?? status.time;
          return (
          <View key={status.id} style={styles.row}>
            <View style={[styles.storyRing, status.viewed && styles.storyRingViewed]} />
            <View style={styles.statusTextWrap}>
              <Text style={[styles.title, { color: palette.textPrimary }]}>{status.name}</Text>
              <Text style={[styles.subtitle, { color: palette.textSecondary }]}>{subtitle}</Text>
            </View>
          </View>
          );
        })}
      </ScrollView>

      <Modal visible={showCreator} transparent animationType="slide" onRequestClose={() => setShowCreator(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: palette.surface }]}>
            <Text style={[styles.modalTitle, { color: palette.textPrimary }]}>Nuevo estado</Text>
            <TextInput
              style={[styles.captionInput, { borderColor: palette.border, color: palette.textPrimary }]}
              value={caption}
              onChangeText={setCaption}
              placeholder="Escribe algo y agrega emojis 😊"
              placeholderTextColor="#8C9DB0"
              multiline
            />
            <View style={styles.modalActions}>
              <Pressable style={[styles.optionButton, { backgroundColor: isDark ? '#21314A' : '#ECF4FF' }]} onPress={() => createStatus('gallery')}>
                <Ionicons name="images-outline" size={20} color={palette.accent} />
                <Text style={styles.optionText}>Galería</Text>
              </Pressable>
              <Pressable style={[styles.optionButton, { backgroundColor: isDark ? '#21314A' : '#ECF4FF' }]} onPress={() => createStatus('camera')}>
                <Ionicons name="camera-outline" size={20} color={palette.accent} />
                <Text style={styles.optionText}>Cámara</Text>
              </Pressable>
              <Pressable style={[styles.optionButton, { backgroundColor: isDark ? '#21314A' : '#ECF4FF' }]} onPress={() => setCaption((prev) => `${prev} 😊`)}>
                <Ionicons name="happy-outline" size={20} color={palette.accent} />
                <Text style={styles.optionText}>Emoji</Text>
              </Pressable>
            </View>
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
  storyRingViewed: { borderColor: '#BCC9D8' },
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
  modalActions: { flexDirection: 'row', gap: 10 },
  optionButton: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#ECF4FF',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 10,
  },
  optionText: { fontSize: 12, fontWeight: '600', color: '#1F4E83' },
  cancelButton: { alignItems: 'center', paddingVertical: 10 },
  cancelText: { color: '#1F7AE0', fontWeight: '700' },
});
