import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#1F7AE0',
        tabBarInactiveTintColor: '#8A98AB',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E6EBF2',
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
      <Tabs.Screen
        name="index"
        options={{
          title: 'Chats',
          tabBarIcon: ({ color }) => <Ionicons size={24} name="chatbubble-ellipses" color={color} />,
        }}
      />
      <Tabs.Screen
        name="calls"
        options={{
          title: 'Llamadas',
          tabBarIcon: ({ color }) => <Ionicons size={24} name="call" color={color} />,
        }}
      />
      <Tabs.Screen
        name="status"
        options={{
          title: 'Estados',
          tabBarIcon: ({ color }) => <Ionicons size={24} name="radio" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <Ionicons size={24} name="person" color={color} />,
        }}
      />
    </Tabs>
  );
}
