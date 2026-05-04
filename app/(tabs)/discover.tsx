import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { createDiscoverProfile, listDiscoverProfiles } from '@/src/features/gaming/services/discoverService';
import { buildFreeSquadTip } from '@/src/features/gaming/services/aiCoachService';
import { topMatches } from '@/src/features/gaming/services/matchmakingService';
import { getDailyMissions } from '@/src/features/gaming/services/engagementService';
import { GamerProfile } from '@/src/features/gaming/types';
import { useDebouncedValue } from '@/src/features/gaming/pro/useDebouncedValue';
import { getProfileCompleteness } from '@/src/features/gaming/pro/profileCompleteness';
import { hasToxicText } from '@/src/features/gaming/pro/toxicityGuard';
import { getPingTier } from '@/src/features/gaming/pro/pingTier';
import { buildSessionPlan } from '@/src/features/gaming/pro/sessionPlanner';
import { cacheProfiles, readCachedProfiles } from '@/src/features/gaming/pro/cacheProfiles';
import { getMockLeaderboard } from '@/src/features/gaming/pro/leaderboardService';
import { gamingFlags } from '@/src/features/gaming/pro/featureFlags';
import { explainPercent } from '@/src/features/gaming/pro/recommendationText';
import { trackGamingEvent } from '@/src/features/gaming/pro/analytics';


export default function DiscoverScreen() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<GamerProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ gamerTag: '', favoriteGame: '', rank: '', role: '', region: '' });
  const debouncedGame = useDebouncedValue(form.favoriteGame, 250);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listDiscoverProfiles(user?.idToken);
      setProfiles(result);
      void cacheProfiles(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar perfiles.');
    } finally {
      setLoading(false);
    }
  }, [user?.idToken]);

  useEffect(() => {
    void load();
    void readCachedProfiles().then((cached) => { if (cached.length > 0) setProfiles((prev) => (prev.length ? prev : cached)); });
  }, [load]);

  const canSubmit = useMemo(() => Object.values(form).every((value) => value.trim().length >= 2), [form]);
  const completeness = useMemo(() => getProfileCompleteness(form), [form]);
  const pingTier = useMemo(() => getPingTier(form.region || 'LATAM'), [form.region]);
  const sessionPlan = useMemo(() => buildSessionPlan(form.rank || 'silver'), [form.rank]);
  const leaderboard = useMemo(() => getMockLeaderboard(), []);
  const tip = useMemo(() => buildFreeSquadTip({
    favoriteGame: form.favoriteGame || profiles[0]?.favoriteGame || 'Valorant',
    rank: form.rank || profiles[0]?.rank || 'Silver',
    role: form.role || profiles[0]?.role || 'Flex',
    region: form.region || profiles[0]?.region || 'LATAM',
  }), [form.favoriteGame, form.rank, form.region, form.role, profiles]);


  const matches = useMemo(() => topMatches({
    favoriteGame: form.favoriteGame || 'Valorant',
    rank: form.rank || 'Silver',
    role: form.role || 'Flex',
    region: form.region || 'LATAM',
  }, profiles), [form.favoriteGame, form.rank, form.region, form.role, profiles]);


  const missions = useMemo(() => {
    const todaySeed = Number(new Date().toISOString().slice(0, 10).replace(/-/g, ''));
    return getDailyMissions(todaySeed, 2);
  }, []);

  const create = async () => {
    if (!user?.idToken) return setError('Inicia sesión para crear perfiles.');
    if (gamingFlags.toxicityGuard && hasToxicText(form.gamerTag + ' ' + form.role)) return setError('Lenguaje no permitido en perfil.');
    if (!canSubmit) return setError('Completa todos los campos (mínimo 2 caracteres).');

    setLoading(true);
    setError(null);
    try {
      await createDiscoverProfile({ ...form, favoriteGame: debouncedGame || form.favoriteGame, platform: 'PC' }, user.idToken);
      trackGamingEvent('profile_created', { region: form.region, rank: form.rank, completeness });
      setForm({ gamerTag: '', favoriteGame: '', rank: '', role: '', region: '' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el perfil gamer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Discover gamers</Text>
      <View style={styles.formCard}>
        <TextInput placeholder="GamerTag" value={form.gamerTag} onChangeText={(v) => setForm((p) => ({ ...p, gamerTag: v }))} style={styles.input} />
        <TextInput placeholder="Juego" value={form.favoriteGame} onChangeText={(v) => setForm((p) => ({ ...p, favoriteGame: v }))} style={styles.input} />
        <TextInput placeholder="Rango" value={form.rank} onChangeText={(v) => setForm((p) => ({ ...p, rank: v }))} style={styles.input} />
        <TextInput placeholder="Rol" value={form.role} onChangeText={(v) => setForm((p) => ({ ...p, role: v }))} style={styles.input} />
        <TextInput placeholder="Región" value={form.region} onChangeText={(v) => setForm((p) => ({ ...p, region: v }))} style={styles.input} />
        <Pressable style={[styles.button, !canSubmit && styles.buttonDisabled]} disabled={!canSubmit || loading} onPress={create}><Text style={styles.buttonText}>Crear perfil</Text></Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? <ActivityIndicator style={{ marginTop: 10 }} /> : null}

      <View style={styles.tipCard}>
        <Text style={styles.tipTitle}>AI Coach (gratis, local)</Text>
        <Text style={styles.tipSummary}>{tip.summary}</Text>
        {tip.recommendations.map((item) => (
          <Text key={item} style={styles.tipItem}>• {item}</Text>
        ))}
      </View>



      <View style={styles.tipCard}>
        <Text style={styles.tipTitle}>Top matches (gratis)</Text>
        {matches.length === 0 ? <Text style={styles.tipItem}>Sin candidatos todavía.</Text> : matches.map((match) => (
          <Text key={match.profile.id} style={styles.tipItem}>• {match.profile.gamerTag}: {match.score}% {explainPercent(match.score)} ({match.reasons.join(', ')})</Text>
        ))}
      </View>



      <View style={styles.tipCard}>
        <Text style={styles.tipTitle}>Misiones diarias</Text>
        {missions.map((mission) => (
          <Text key={mission.id} style={styles.tipItem}>• {mission.title} — {mission.reward}</Text>
        ))}
      </View>


      <View style={styles.tipCard}>
        <Text style={styles.tipTitle}>Perfil pro</Text>
        <Text style={styles.tipItem}>Completitud: {completeness}%</Text>
        <Text style={styles.tipItem}>Ping esperado: {pingTier}</Text>
        <Text style={styles.tipItem}>Plan de sesión: {sessionPlan.join(' · ')}</Text>
      </View>

      {gamingFlags.leaderboard ? <View style={styles.tipCard}>
        <Text style={styles.tipTitle}>Leaderboard semanal</Text>
        {leaderboard.map((row) => <Text key={row.gamerTag} style={styles.tipItem}>• {row.gamerTag} — {row.points} pts</Text>)}
      </View> : null}

      <FlatList
        data={profiles}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.tag}>{item.gamerTag}</Text>
            <Text>{item.favoriteGame} · {item.rank}</Text>
            <Text>{item.role} · {item.region}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  title: { fontSize: 28, fontWeight: '800', marginHorizontal: 16, marginVertical: 12 },
  formCard: { marginHorizontal: 16, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 10, gap: 8 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 10 },
  button: { backgroundColor: '#2563EB', borderRadius: 10, padding: 11, alignItems: 'center' },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { color: '#FFF', fontWeight: '700' },
  error: { color: '#B91C1C', marginHorizontal: 16, marginTop: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 100, gap: 10, paddingTop: 12 },
  card: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, gap: 4 },
  tag: { fontSize: 16, fontWeight: '700' },
  tipCard: { marginHorizontal: 16, marginTop: 10, backgroundColor: '#EEF6FF', borderRadius: 12, padding: 12, gap: 4 },
  tipTitle: { fontWeight: '800', color: '#1D4ED8' },
  tipSummary: { fontWeight: '600', color: '#1E3A8A' },
  tipItem: { color: '#1F2937' },
});
