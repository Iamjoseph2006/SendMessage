import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { darkPalette, lightPalette, useAppTheme } from '@/src/presentation/theme/appTheme';

export default function TabLayout() {
  const { isDark } = useAppTheme();
  const palette = isDark ? darkPalette : lightPalette;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: palette.textSecondary,
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopColor: palette.border,
          height: 70,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerShown: false,
      }}>
      {[
        { name: 'index', title: 'Chats', icon: 'chatbubble-ellipses' },
        { name: 'calls', title: 'Llamadas', icon: 'call' },
        { name: 'status', title: 'Estados', icon: 'radio' },
        { name: 'store', title: 'Tienda', icon: 'storefront' },
        { name: 'profile', title: 'Perfil', icon: 'person' },
      ].map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, focused }) => (
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: focused ? (isDark ? '#223956' : '#E8F2FF') : 'transparent',
                }}>
                <Ionicons size={20} name={tab.icon as any} color={color} />
              </View>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
