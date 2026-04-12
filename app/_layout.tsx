import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AuthNavigator from '@/src/navigation/AuthNavigator';
import { AppThemeProvider, useAppTheme } from '@/src/presentation/theme/appTheme';
import 'react-native-reanimated';

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
    <AppThemeProvider>
      <RootNavigator />
    </AppThemeProvider>
  );
}

function RootNavigator() {
  const { isDark } = useAppTheme();

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <AuthNavigator />
      <StatusBar style={isDark ? 'light' : 'dark'} />
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
    color: '#1F7AE0',
    letterSpacing: 0.2,
  },
  appHint: {
    color: '#6D7B8E',
    fontSize: 13,
    textTransform: 'lowercase',
  },
});
