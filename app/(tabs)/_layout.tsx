import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import React from 'react';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#1f7ae0',
        tabBarInactiveTintColor: '#8a98ab',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e6ebf2',
        },
        headerStyle: { backgroundColor: '#ffffff' },
        headerTitleStyle: { color: '#1a2b44' },
        headerTintColor: '#1a2b44',
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Chats',
          tabBarIcon: ({ color }) => <Ionicons size={22} name="chatbubble-ellipses" color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Comunidades',
          tabBarIcon: ({ color }) => <Ionicons size={22} name="people" color={color} />,
        }}
      />
    </Tabs>
  );
}
