import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Image, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import 'react-native-reanimated';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const [showBootSplash, setShowBootSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowBootSplash(false), 1700);
    return () => clearTimeout(timer);
  }, []);

  if (showBootSplash) {
    return (
      <SafeAreaView style={styles.splash}>
        <View style={styles.splashContent}>
          <Image source={require('@/assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.appName}>SendMessage</Text>
          <Text style={styles.appHint}>simple · rápido · seguro</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <ThemeProvider value={DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="chat/[chatId]" options={{ headerShown: false }} />
        <Stack.Screen name="profile/[section]" options={{ headerBackTitle: 'Perfil' }} />
      </Stack>
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashContent: {
    alignItems: 'center',
    gap: 10,
  },
  logo: {
    width: 112,
    height: 112,
    borderRadius: 24,
  },
  appName: {
    fontSize: 30,
    fontWeight: '800',
    color: '#25D366',
    letterSpacing: 0.2,
  },
  appHint: {
    color: '#6D7B8E',
    fontSize: 13,
    textTransform: 'lowercase',
  },
});
