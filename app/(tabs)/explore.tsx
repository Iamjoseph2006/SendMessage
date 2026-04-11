import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

// Datos de muestra locales para simular historias y comunidades.
const stories = [
  { id: '1', name: 'Equipo Producto', status: 'Nueva historia · 2 min' },
  { id: '2', name: 'Soporte', status: 'Nueva historia · 10 min' },
  { id: '3', name: 'Comunidad Móvil', status: 'Visto · 1 h' },
];

const channels = [
  { id: 'c1', title: 'Lanzamientos', members: '15.2K suscriptores' },
  { id: 'c2', title: 'Tips de Productividad', members: '9.8K suscriptores' },
  { id: 'c3', title: 'Noticias Tech', members: '24.1K suscriptores' },
];

export default function ExploreScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Historias y Comunidades</Text>
        <Text style={styles.subtitle}>
          Vista exploratoria del MVP. Todo está en local mientras definimos backend.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Historias</Text>
          {stories.map((story) => (
            <Pressable key={story.id} style={styles.rowCard}>
              <View style={styles.storyAvatar} />
              <View>
                <Text style={styles.rowTitle}>{story.name}</Text>
                <Text style={styles.rowMeta}>{story.status}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Canales y Comunidades</Text>
          {channels.map((channel) => (
            <Pressable key={channel.id} style={styles.channelCard}>
              <Text style={styles.rowTitle}>{channel.title}</Text>
              <Text style={styles.rowMeta}>{channel.members}</Text>
              <Text style={styles.channelAction}>Unirse</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
    gap: 16,
  },
  title: {
    color: '#1a2b44',
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: '#5f7086',
    fontSize: 15,
    lineHeight: 22,
  },
  section: {
    gap: 10,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f2',
  },
  sectionTitle: {
    color: '#30445f',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 2,
  },
  rowCard: {
    borderRadius: 12,
    backgroundColor: '#f7faff',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#e6edf8',
  },
  storyAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#d8e8ff',
    borderWidth: 2,
    borderColor: '#b9d7ff',
  },
  rowTitle: {
    color: '#24364d',
    fontWeight: '700',
    fontSize: 15,
  },
  rowMeta: {
    color: '#6d8099',
    marginTop: 2,
  },
  channelCard: {
    backgroundColor: '#f7faff',
    padding: 12,
    borderRadius: 12,
    gap: 3,
    borderWidth: 1,
    borderColor: '#e6edf8',
  },
  channelAction: {
    color: '#1f7ae0',
    marginTop: 6,
    fontWeight: '700',
  },
});
