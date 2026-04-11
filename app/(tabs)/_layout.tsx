import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#57a2ff',
        tabBarInactiveTintColor: '#8eaedc',
        tabBarStyle: {
          backgroundColor: '#0a3b82',
          borderTopColor: '#2f63b4',
        },
        headerStyle: { backgroundColor: '#0a3b82' },
        headerTitleStyle: { color: 'white' },
        headerTintColor: Colors[colorScheme ?? 'light'].text,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Chats',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="message.fill" color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Comunidades',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="person.3.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
