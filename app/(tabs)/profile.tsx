import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useIsFocused } from '@react-navigation/native';

import { OnboardingButton } from '@/components/onboarding/button';
import { clearOnboardingAuthToken, getOnboardingAuthToken } from '@/lib/auth-session';
import { getCurrentUser, type UserPayload } from '@/lib/auth-api';
import { formatCurrency } from '@/lib/format';

const settingsItems: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: Href;
}[] = [
  {
    title: 'My Account',
    icon: 'person-outline',
    href: '/my-account' as Href,
  },
  {
    title: 'Change Password',
    icon: 'shield-checkmark-outline',
    href: '/profile-change-password' as Href,
  },
];

function LoadingState() {
  return (
    <View className="items-center justify-center flex-1 gap-4 px-8">
      <ActivityIndicator color="#0E9B10" size="large" />
      <Text className="text-center text-[15px] text-muted">Loading your profile...</Text>
    </View>
  );
}

function EmptyState({
  title,
  description,
  buttonLabel,
  onPress,
}: {
  title: string;
  description: string;
  buttonLabel: string;
  onPress: () => void;
}) {
  return (
    <View className="items-center justify-center flex-1 px-6">
      <View className="w-full max-w-[340px] rounded-[28px] border border-line bg-white px-6 py-8">
        <Text className="text-center text-[22px] font-semibold text-ink">{title}</Text>
        <Text className="mt-3 text-center text-[15px] leading-6 text-muted">{description}</Text>
        <OnboardingButton className="mt-7" label={buttonLabel} onPress={onPress} />
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const [user, setUser] = useState<UserPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    const token = getOnboardingAuthToken();

    if (!token) {
      setUser(null);
      setErrorMessage('Sign in again to load your profile.');
      setIsLoading(false);
      return;
    }

    let active = true;

    const loadProfile = async () => {
      try {
        setIsLoading(true);
        setErrorMessage('');

        const response = await getCurrentUser(token);

        if (!active) {
          return;
        }

        setUser(response.user);
      } catch (error) {
        if (!active) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : 'Unable to load your profile.');
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      active = false;
    };
  }, [isFocused]);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await clearOnboardingAuthToken();
      router.replace('/onboarding/login' as Href);
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <StatusBar style="dark" />
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <StatusBar style="dark" />
        <EmptyState
          buttonLabel="Go to Login"
          description={errorMessage || 'Your session is missing, so we cannot load the profile yet.'}
          onPress={() => router.replace('/onboarding/login' as Href)}
          title="Profile unavailable"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <StatusBar style="dark" />

      <View className="flex-1 bg-white">
        <View className="px-6 pt-5 pb-6 border-b border-line">
          <Text className="text-[24px] font-semibold tracking-tight text-ink">Profile</Text>
          <Text className="mt-2 text-[15px] text-muted">Manage your settings</Text>
        </View>

        <View className="flex-1 px-6 pt-6">
          <View className="rounded-[24px] border border-line bg-white px-4 py-4">
            <Text className="text-[13px] text-muted">Monthly Income</Text>
            <Text className="mt-2 text-[22px] font-semibold tracking-tight text-ink">
              {formatCurrency(user.monthlyIncome, 'GBP', 'en-GB')}
            </Text>
            <Text className="mt-1 text-[13px] text-muted">
              {user.primaryGoal
                ? `Focus: ${user.primaryGoal.charAt(0).toUpperCase()}${user.primaryGoal.slice(1)}`
                : 'Fixed Income'}
            </Text>

            <Pressable
              className="mt-4 items-center rounded-[12px] bg-[#E5F9DC] px-4 py-3"
              onPress={() => router.push('/profile-income' as Href)}
              style={({ pressed }) => ({
                opacity: pressed ? 0.84 : 1,
              })}>
              <Text className="text-[14px] font-medium text-brand-700">Update Income</Text>
            </Pressable>
          </View>

          <View className="mt-4 rounded-[20px] bg-[#F7F7F7] px-4 py-4">
            <Text className="text-[12px] uppercase tracking-[1px] text-muted">Signed in as</Text>
            <Text className="mt-2 text-[18px] font-semibold text-ink">{user.fullName}</Text>
            <Text className="mt-1 text-[14px] text-muted">{user.email}</Text>
          </View>

          <View className="mt-6">
            <Text className="text-[14px] font-medium text-muted">Account Settings</Text>

            <View className="gap-3 mt-3">
              {settingsItems.map((item) => (
                <Pressable
                  key={item.title}
                  className="flex-row items-center rounded-[16px] bg-[#F7F7F7] px-4 py-4"
                  onPress={() => router.push(item.href)}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.86 : 1,
                  })}>
                  <Ionicons color="#111827" name={item.icon} size={20} />
                  <Text className="ml-3 flex-1 text-[15px] font-medium text-ink">{item.title}</Text>
                  <Ionicons color="#667085" name="chevron-forward" size={18} />
                </Pressable>
              ))}
            </View>
          </View>

          <View className="mt-6">
            <Text className="text-[14px] font-medium text-muted">About</Text>

            <View className="flex-row items-center justify-between px-1 mt-3">
              <Text className="text-[14px] text-ink">Version</Text>
              <Text className="text-[14px] text-ink">1.0.0</Text>
            </View>
          </View>

          {errorMessage ? (
            <View className="mt-5 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-4">
              <Text className="text-[13px] leading-5 text-rose-700">{errorMessage}</Text>
            </View>
          ) : null}

          <Pressable
            className="mt-auto flex-row items-center justify-center gap-2 rounded-[14px] bg-[#FDECEC] px-4 py-4"
            disabled={isLoggingOut}
            onPress={() => {
              void handleLogout();
            }}
            style={({ pressed }) => ({
              opacity: isLoggingOut ? 0.5 : pressed ? 0.86 : 1,
            })}>
            <Ionicons color="#FF3B30" name="log-out-outline" size={18} />
            <Text className="text-[15px] font-medium text-[#FF3B30]">
              {isLoggingOut ? 'Logging Out...' : 'Log Out'}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
