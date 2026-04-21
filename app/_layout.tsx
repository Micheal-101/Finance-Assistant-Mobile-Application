import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';
import "./../global.css";
import { useColorScheme } from '@/hooks/use-color-scheme';
import { hasHydratedAuthSession, hydrateAuthSession } from '@/lib/auth-session';
import { initializeNotifications } from '@/lib/notifications';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isSessionReady, setIsSessionReady] = useState(hasHydratedAuthSession());

  useEffect(() => {
    void initializeNotifications();
  }, []);

  useEffect(() => {
    if (isSessionReady) {
      return;
    }

    let active = true;

    void hydrateAuthSession().finally(() => {
      if (active) {
        setIsSessionReady(true);
      }
    });

    return () => {
      active = false;
    };
  }, [isSessionReady]);

  if (!isSessionReady) {
    return (
      <View className="items-center justify-center flex-1 bg-white">
        <ActivityIndicator color="#0E9B10" size="large" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="monthly-summary" options={{ headerShown: false }} />
        <Stack.Screen name="overspending-alerts" options={{ headerShown: false }} />
        <Stack.Screen name="expense-category/[category]" options={{ headerShown: false }} />
        <Stack.Screen name="expense-details/[expenseId]" options={{ headerShown: false }} />
        <Stack.Screen name="profile-income" options={{ headerShown: false }} />
        <Stack.Screen name="my-account" options={{ headerShown: false }} />
        <Stack.Screen name="profile-change-password" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
