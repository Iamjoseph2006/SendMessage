import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { createEvent, listEvents } from '@/src/features/gaming/services/eventService';
import { GameEvent } from '@/src/features/gaming/types';

export default function EventsScreen() {
  const { user } = useAuth();
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', game: '', mode: '', slots: '10', startsAt: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try { setEvents(await listEvents(user?.idToken)); } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar eventos.');
    } finally { setLoading(false); }
  }, [user?.idToken]);

  useEffect(() => { void load(); }, [load]);

  const canSubmit = useMemo(() => form.title && form.game && form.mode && form.slots, [form]);

  const create = async () => {
    if (!user?.idToken) return setError('Inicia sesión para crear eventos.');
    const slots = Number(form.slots);
    if (!canSubmit || !Number.isFinite(slots) || slots < 2) return setError('Completa formulario y slots válido (>=2).');

    const startsAt = form.startsAt.trim() || new Date().toISOString();

    setLoading(true);
    try {
      await createEvent({ title: form.title, game: form.game, mode: form.mode, slots, startsAt }, user.idToken);
      setForm({ title: '', game: '', mode: '', slots: '10', startsAt: '' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear evento.');
    } finally { setLoading(false); }
  };

  return <SafeAreaView style={styles.container}><Text style={styles.title}>Eventos</Text>
    <View style={styles.formCard}>
      <TextInput placeholder="Título" value={form.title} onChangeText={(v) => setForm((p) => ({ ...p, title: v }))} style={styles.input} />
      <TextInput placeholder="Juego" value={form.game} onChangeText={(v) => setForm((p) => ({ ...p, game: v }))} style={styles.input} />
      <TextInput placeholder="Modo (5v5, Duo...)" value={form.mode} onChangeText={(v) => setForm((p) => ({ ...p, mode: v }))} style={styles.input} />
      <TextInput placeholder="Slots" keyboardType="number-pad" value={form.slots} onChangeText={(v) => setForm((p) => ({ ...p, slots: v }))} style={styles.input} />
      <TextInput placeholder="Fecha ISO opcional" value={form.startsAt} onChangeText={(v) => setForm((p) => ({ ...p, startsAt: v }))} style={styles.input} />
      <Pressable style={[styles.button, !canSubmit && styles.buttonDisabled]} disabled={!canSubmit || loading} onPress={create}><Text style={styles.buttonText}>Crear evento</Text></Pressable>
    </View>
    {error ? <Text style={styles.error}>{error}</Text> : null}
    {loading ? <ActivityIndicator style={{ marginTop: 10 }} /> : null}
    <FlatList data={events} keyExtractor={(i) => i.id} contentContainerStyle={styles.list}
      renderItem={({ item }) => <View style={styles.card}><Text style={styles.name}>{item.title}</Text><Text>{item.game} · {item.mode}</Text><Text>{item.slots} slots</Text></View>} />
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' }, title: { fontSize: 28, fontWeight: '800', marginHorizontal: 16, marginVertical: 12 },
  formCard: { marginHorizontal: 16, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 10, gap: 8 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 10 },
  button: { backgroundColor: '#2563EB', borderRadius: 10, padding: 11, alignItems: 'center' }, buttonDisabled: { opacity: 0.45 }, buttonText: { color: '#FFF', fontWeight: '700' },
  error: { color: '#B91C1C', marginHorizontal: 16, marginTop: 8 }, list: { paddingHorizontal: 16, paddingBottom: 100, gap: 10, paddingTop: 12 },
  card: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, gap: 4 }, name: { fontSize: 16, fontWeight: '700' },
});
