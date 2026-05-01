import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Category = 'Remeras' | 'Buzos' | 'Gorras' | 'Merchandising';

type Product = {
  id: string;
  name: string;
  category: Category;
  priceARS: number;
  description: string;
  palette: [string, string];
};

const products: Product[] = [
  { id: 'remera-oversize', name: 'Remera Oversize Evento', category: 'Remeras', priceARS: 24990, description: 'Algodón premium para festivales y staff.', palette: ['#1D4ED8', '#1E293B'] },
  { id: 'remera-basica', name: 'Remera Básica Branding', category: 'Remeras', priceARS: 19990, description: 'Corte clásico y estampa durable.', palette: ['#0EA5E9', '#0F172A'] },
  { id: 'buzo-hoodie', name: 'Buzo Hoodie Corporate', category: 'Buzos', priceARS: 42990, description: 'Frisa premium con bordado frontal.', palette: ['#7C3AED', '#111827'] },
  { id: 'buzo-canguro', name: 'Buzo Canguro Team', category: 'Buzos', priceARS: 38990, description: 'Bolsillo frontal y capucha doble tela.', palette: ['#EC4899', '#1F2937'] },
  { id: 'gorra-snapback', name: 'Gorra Snapback Team', category: 'Gorras', priceARS: 18990, description: 'Visera plana y ajuste trasero.', palette: ['#16A34A', '#052E16'] },
  { id: 'gorra-trucker', name: 'Gorra Trucker Promo', category: 'Gorras', priceARS: 16990, description: 'Frente rígido con malla respirable.', palette: ['#F59E0B', '#1F2937'] },
  { id: 'kit-merch', name: 'Kit Merch Fan Pack', category: 'Merchandising', priceARS: 35990, description: 'Tote bag + taza + stickers + lanyard.', palette: ['#E11D48', '#1F2937'] },
  { id: 'combo-vip', name: 'Combo VIP Evento', category: 'Merchandising', priceARS: 49990, description: 'Pack premium para sponsors y artistas.', palette: ['#14B8A6', '#0F172A'] },
];

function DemoArtwork({ label, palette }: { label: string; palette: [string, string] }) {
  return (
    <View style={[styles.artwork, { backgroundColor: palette[0] }]}>
      <View style={[styles.artworkStripe, { backgroundColor: palette[1] }]} />
      <Text style={styles.artworkText}>DL EVENTOS</Text>
      <Text style={styles.artworkSub}>{label}</Text>
    </View>
  );
}

export default function StoreScreen() {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [uploadedDesign, setUploadedDesign] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  }, [search]);

  const grouped = useMemo(() => ({
    Remeras: filtered.filter((p) => p.category === 'Remeras'),
    Buzos: filtered.filter((p) => p.category === 'Buzos'),
    Gorras: filtered.filter((p) => p.category === 'Gorras'),
    Merchandising: filtered.filter((p) => p.category === 'Merchandising'),
  }), [filtered]);

  const total = useMemo(() => products.reduce((acc, p) => acc + p.priceARS * (cart[p.id] ?? 0), 0), [cart]);

  const addToCart = (id: string) => setCart((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));

  const pickDesign = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.9 });
    if (!result.canceled && result.assets?.[0]?.uri) return setUploadedDesign(result.assets[0].uri);
    Alert.alert('Sin imagen', 'No se seleccionó ningún diseño.');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.logo}>DL EVENTOS</Text>
          <Text style={styles.heroTitle}>Modo Demo 100% Web</Text>
          <Text style={styles.heroSubtitle}>Demo sin dependencias externas: catálogo, carrito y mockups funcionando solo con recursos locales de la app.</Text>
        </View>

        <TextInput placeholder="Buscar productos..." style={styles.input} value={search} onChangeText={setSearch} placeholderTextColor="#7B8794" />

        {(Object.keys(grouped) as Category[]).map((category) => (
          <View key={category} style={styles.categoryBlock}>
            <Text style={styles.sectionTitle}>{category}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
              {grouped[category].map((product) => (
                <View key={product.id} style={styles.productCard}>
                  <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
                    <DemoArtwork label={product.name} palette={product.palette} />
                    <DemoArtwork label={`${product.category} · Premium`} palette={[product.palette[1], product.palette[0]]} />
                  </ScrollView>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productDesc}>{product.description}</Text>
                  <Text style={styles.price}>ARS {product.priceARS.toLocaleString('es-AR')}</Text>
                  <Pressable style={styles.button} onPress={() => addToCart(product.id)}>
                    <Ionicons name="cart" size={16} color="#FFF" />
                    <Text style={styles.buttonText}>Agregar al carrito</Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </View>
        ))}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Subí tu diseño y probalo en mockups</Text>
          <Pressable style={[styles.button, styles.uploadButton]} onPress={pickDesign}>
            <Ionicons name="cloud-upload" size={16} color="#FFF" />
            <Text style={styles.buttonText}>Subir imagen</Text>
          </Pressable>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
            {products.slice(0, 3).map((product) => (
              <View key={product.id} style={[styles.mockup, { backgroundColor: product.palette[1] }]}>
                <Text style={styles.mockupBrand}>DL EVENTOS</Text>
                <View style={styles.mockupArea}>{uploadedDesign ? <Image source={{ uri: uploadedDesign }} style={styles.designOverlay} /> : <Text style={styles.mockupHint}>Tu diseño acá</Text>}</View>
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      <View style={styles.cartBar}>
        <Text style={styles.cartText}>Carrito: ARS {total.toLocaleString('es-AR')}</Text>
        <Pressable style={[styles.button, styles.checkout]}><Text style={styles.buttonText}>Finalizar compra</Text></Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0B1220' },
  content: { padding: 16, gap: 16, paddingBottom: 120 },
  hero: { backgroundColor: '#121A2E', padding: 18, borderRadius: 16, borderWidth: 1, borderColor: '#2B3A61' },
  logo: { color: '#D7E6FF', fontSize: 34, fontWeight: '900', letterSpacing: 2 },
  heroTitle: { color: '#FFF', fontWeight: '700', fontSize: 20, marginTop: 8 },
  heroSubtitle: { color: '#C2CEE5', marginTop: 6, lineHeight: 20 },
  input: { backgroundColor: '#E9EEF7', borderRadius: 12, paddingHorizontal: 12, height: 44, color: '#0F172A', fontWeight: '600' },
  categoryBlock: { gap: 10 },
  sectionTitle: { color: '#FFF', fontWeight: '800', fontSize: 18, marginBottom: 10 },
  carousel: { gap: 12, paddingRight: 8 },
  productCard: { width: 280, backgroundColor: '#121A2E', borderRadius: 14, padding: 10, borderWidth: 1, borderColor: '#2B3A61' },
  artwork: { width: 260, height: 180, borderRadius: 10, padding: 12, marginRight: 6, justifyContent: 'flex-end', overflow: 'hidden' },
  artworkStripe: { ...StyleSheet.absoluteFillObject, opacity: 0.4, transform: [{ skewY: '-8deg' }, { translateY: -40 }] },
  artworkText: { color: '#FFF', fontWeight: '900', letterSpacing: 1.5 },
  artworkSub: { color: '#E2E8F0', marginTop: 4, fontSize: 12 },
  productName: { color: '#FFF', fontWeight: '700', fontSize: 16, marginTop: 8 },
  productDesc: { color: '#C2CEE5', fontSize: 13, marginTop: 4 },
  price: { color: '#81F4C1', fontWeight: '800', marginTop: 8, marginBottom: 8 },
  button: { backgroundColor: '#2563EB', height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  buttonText: { color: '#FFF', fontWeight: '700' },
  card: { backgroundColor: '#121A2E', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#2B3A61' },
  uploadButton: { marginBottom: 12 },
  mockup: { width: 220, height: 260, borderRadius: 12, alignItems: 'center', justifyContent: 'center', padding: 12 },
  mockupBrand: { color: '#FFF', fontWeight: '900', marginBottom: 12 },
  mockupArea: { width: 140, height: 140, borderRadius: 10, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' },
  mockupHint: { color: '#334155', fontWeight: '700', fontSize: 12 },
  designOverlay: { width: 120, height: 120, borderRadius: 6 },
  cartBar: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 12, backgroundColor: '#0A1020', borderTopWidth: 1, borderTopColor: '#2B3A61', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cartText: { color: '#FFF', fontWeight: '800' },
  checkout: { paddingHorizontal: 16 },
});
