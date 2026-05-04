import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { createSquad, listSquads } from '@/src/features/gaming/services/squadService';
import { Squad } from '@/src/features/gaming/types';

export default function SquadsScreen() {
  const { user } = useAuth();
  const [squads, setSquads] = useState<Squad[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', game: '', neededRole: '', maxMembers: '5' });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSquads(await listSquads(user?.idToken));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar squads.');
    } finally {
      setLoading(false);
    }
  }, [user?.idToken]);

  useEffect(() => { void load(); }, [load]);

  const canSubmit = useMemo(() => form.name.trim().length > 2 && form.game.trim().length > 1 && form.neededRole.trim().length > 1, [form]);

  const create = async () => {
    if (!user?.idToken) return setError('Inicia sesión para crear squads.');
    if (!canSubmit) return setError('Completa todos los campos del squad.');

    const maxMembers = Number(form.maxMembers);
    if (!Number.isFinite(maxMembers) || maxMembers < 2 || maxMembers > 20) return setError('maxMembers debe estar entre 2 y 20.');

    setLoading(true);
    try {
      await createSquad({ name: form.name, game: form.game, neededRole: form.neededRole, currentMembers: 1, maxMembers }, user.idToken);
      setForm({ name: '', game: '', neededRole: '', maxMembers: '5' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el squad.');
    } finally { setLoading(false); }
  };

  return <SafeAreaView style={styles.container}><Text style={styles.title}>Squads</Text>
    <View style={styles.formCard}>
      <TextInput placeholder="Nombre" value={form.name} onChangeText={(v) => setForm((p) => ({ ...p, name: v }))} style={styles.input} />
      <TextInput placeholder="Juego" value={form.game} onChangeText={(v) => setForm((p) => ({ ...p, game: v }))} style={styles.input} />
      <TextInput placeholder="Rol requerido" value={form.neededRole} onChangeText={(v) => setForm((p) => ({ ...p, neededRole: v }))} style={styles.input} />
      <TextInput placeholder="Máximo miembros (2-20)" keyboardType="number-pad" value={form.maxMembers} onChangeText={(v) => setForm((p) => ({ ...p, maxMembers: v }))} style={styles.input} />
      <Pressable style={[styles.button, !canSubmit && styles.buttonDisabled]} disabled={!canSubmit || loading} onPress={create}><Text style={styles.buttonText}>Crear squad</Text></Pressable>
    </View>
    {error ? <Text style={styles.error}>{error}</Text> : null}
    {loading ? <ActivityIndicator style={{ marginTop: 10 }} /> : null}
    <FlatList data={squads} keyExtractor={(i) => i.id} contentContainerStyle={styles.list}
      renderItem={({ item }) => <View style={styles.card}><Text style={styles.name}>{item.name}</Text><Text>{item.game} · Buscan {item.neededRole}</Text><Text>{item.currentMembers}/{item.maxMembers}</Text></View>} />
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
