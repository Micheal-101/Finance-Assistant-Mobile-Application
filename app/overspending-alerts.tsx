import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { type Href, useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';

import { OnboardingButton } from '@/components/onboarding/button';
import {
  getOverspendingAlerts,
  type ExpenseCategory,
  type OverspendingAlertsResponse,
} from '@/lib/auth-api';
import { getOnboardingAuthToken } from '@/lib/auth-session';
import { getCached, getCachedUserPrefs, setCached } from '@/lib/cache';
import { formatCurrency, getCurrentMonthKey } from '@/lib/format';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const categoryVisuals: Record<
  ExpenseCategory,
  {
    icon: IoniconName;
    iconTint: string;
    iconBg: string;
  }
> = {
  health: { icon: 'medkit-outline', iconTint: '#F59E0B', iconBg: '#FFF7E8' },
  groceries: { icon: 'cart-outline', iconTint: '#F59E0B', iconBg: '#FFF7E8' },
  utilities: { icon: 'flash-outline', iconTint: '#F59E0B', iconBg: '#FFF7E8' },
  entertainment: { icon: 'ticket-outline', iconTint: '#9333EA', iconBg: '#F3E8FF' },
  dining: { icon: 'restaurant-outline', iconTint: '#0891B2', iconBg: '#DBEAFE' },
  transport: { icon: 'car-outline', iconTint: '#DC2626', iconBg: '#FEE2E2' },
  other: { icon: 'ellipsis-horizontal-circle-outline', iconTint: '#64748B', iconBg: '#E2E8F0' },
};

function LoadingState() {
  return (
    <View className="flex-1 items-center justify-center gap-4 px-8">
      <ActivityIndicator color="#0E9B10" size="large" />
      <Text className="text-center text-[15px] text-muted">Loading your alerts...</Text>
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
    <View className="flex-1 items-center justify-center px-6">
      <View className="w-full max-w-[340px] rounded-[28px] border border-line bg-white px-6 py-8">
        <Text className="text-center text-[22px] font-semibold text-ink">{title}</Text>
        <Text className="mt-3 text-center text-[15px] leading-6 text-muted">{description}</Text>
        <OnboardingButton className="mt-7" label={buttonLabel} onPress={onPress} />
      </View>
    </View>
  );
}

function AlertCard({
  alert,
  currency,
  locale,
}: {
  alert: OverspendingAlertsResponse['alerts'][number];
  currency: string;
  locale: string;
}) {
  const router = useRouter();
  const visual = categoryVisuals[alert.key];
  const riskLabel = alert.risk === 'medium' ? 'Medium Risk' : 'Low Risk';
  const description =
    alert.risk === 'medium'
      ? `${alert.name} spending is running well above your usual pattern this month.`
      : `${alert.name} spending is slightly above your recent average. Keep an eye on it before it grows.`;
  const fmt = (amount: number) => formatCurrency(amount, currency, locale);

  return (
    <View className="rounded-[28px] border border-[#F6C453] bg-[#FFFDF3] px-6 py-6">
      <View className="flex-row items-start gap-4">
        <View
          className="h-14 w-14 items-center justify-center rounded-full"
          style={{ backgroundColor: visual.iconBg }}>
          <Ionicons color={visual.iconTint} name={visual.icon} size={26} />
        </View>

        <View className="flex-1">
          <View className="flex-row flex-wrap items-center gap-3">
            <Text className="text-[18px] font-semibold text-ink">{alert.name}</Text>
            <View className="rounded-full bg-[#FF9F0A] px-4 py-1.5">
              <Text className="text-[13px] font-medium text-white">{riskLabel}</Text>
            </View>
          </View>

          <Text className="mt-3 text-[16px] leading-8 text-slate-600">
            {description} You&apos;re currently {alert.percentageAboveAverage}% above your average.
          </Text>
        </View>
      </View>

      <View className="mt-6 rounded-[22px] bg-white px-6 py-6">
        <View className="flex-row justify-between gap-6">
          <View className="flex-1">
            <Text className="text-[14px] text-[#A16207]">Current Spending</Text>
            <Text className="mt-4 text-[24px] font-semibold tracking-tight text-[#92400E]">
              {fmt(alert.currentSpending)}
            </Text>
          </View>

          <View className="flex-1">
            <Text className="text-[14px] text-[#A16207]">6-Month Average</Text>
            <Text className="mt-4 text-[24px] font-semibold tracking-tight text-[#92400E]">
              {fmt(alert.sixMonthAverage)}
            </Text>
          </View>
        </View>

        <View className="mt-6 flex-row items-center gap-2">
          <Ionicons color="#92400E" name="trending-up-outline" size={20} />
          <Text className="text-[16px] font-medium text-[#92400E]">
            +{alert.percentageAboveAverage}% vs average
          </Text>
        </View>
      </View>

      <View className="mt-6 flex-row gap-3">
        <Pressable
          className="flex-1 items-center rounded-[16px] bg-white px-4 py-4"
          onPress={() =>
            router.push({
              pathname: '/expense-category/[category]',
              params: { category: alert.key },
            })
          }
          style={({ pressed }) => ({
            opacity: pressed ? 0.86 : 1,
          })}>
          <Text className="text-[16px] font-medium text-[#92400E]">View Category</Text>
        </Pressable>

        <Pressable
          className="flex-1 flex-row items-center justify-center gap-2 rounded-[16px] bg-[#111827] px-4 py-4"
          onPress={() =>
            router.push({
              pathname: '/(tabs)/assistant',
              params: {
                prompt: `Why is ${alert.name.toLowerCase()} above my usual spending and what should I do next?`,
                screen: 'overspending-alerts',
                category: alert.key,
              },
            })
          }
          style={({ pressed }) => ({
            opacity: pressed ? 0.88 : 1,
          })}>
          <Ionicons color="#FFFFFF" name="chatbubble-ellipses-outline" size={18} />
          <Text className="text-[16px] font-medium text-white">Ask Assistant</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function OverspendingAlertsScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const [alertsData, setAlertsData] = useState<OverspendingAlertsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    const token = getOnboardingAuthToken();

    if (!token) {
      setAlertsData(null);
      setErrorMessage('Sign in again to load your overspending alerts.');
      setIsLoading(false);
      return;
    }

    const month = getCurrentMonthKey();
    const cacheKey = `overspending-alerts:${month}`;
    const cached = getCached<OverspendingAlertsResponse>(cacheKey);

    if (cached) {
      setAlertsData(cached);
      setIsLoading(false);
      return;
    }

    let active = true;

    const loadAlerts = async () => {
      try {
        setIsLoading(true);
        setErrorMessage('');

        const response = await getOverspendingAlerts(token, month);

        if (!active) {
          return;
        }

        setCached(cacheKey, response);
        setAlertsData(response);
      } catch (error) {
        if (!active) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : 'Unable to load your alerts right now.',
        );
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadAlerts();

    return () => {
      active = false;
    };
  }, [isFocused]);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <StatusBar style="dark" />
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (!alertsData) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <StatusBar style="dark" />
        <EmptyState
          buttonLabel="Go to Login"
          description={errorMessage || 'Your session is missing, so we cannot load alerts yet.'}
          onPress={() => router.replace('/onboarding/login' as Href)}
          title="Alerts unavailable"
        />
      </SafeAreaView>
    );
  }

  const { currency, locale } = getCachedUserPrefs();

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <StatusBar style="dark" />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 36 }}
        showsVerticalScrollIndicator={false}>
        <View className="border-b border-line px-6 pb-6 pt-5">
          <View className="flex-row items-center gap-4">
            <Pressable
              accessibilityLabel="Go back"
              className="h-10 w-10 items-center justify-center rounded-full"
              onPress={() => router.back()}
              style={({ pressed }) => ({
                opacity: pressed ? 0.75 : 1,
              })}>
              <Ionicons color="#111827" name="chevron-back" size={24} />
            </Pressable>

            <View>
              <Text className="text-[24px] font-semibold tracking-tight text-ink">
                Spending Alerts
              </Text>
              <Text className="mt-1 text-[14px] text-muted">
                Monitor unusual spending patterns
              </Text>
            </View>
          </View>
        </View>

        <View className="gap-6 px-6 pt-7">
          <View className="rounded-[30px] bg-[#FF9F0A] px-6 py-6">
            <View className="flex-row items-center gap-3">
              <Ionicons color="#FFFFFF" name="warning-outline" size={24} />
              <Text className="text-[20px] font-semibold text-white">
                {alertsData.activeAlerts} Active {alertsData.activeAlerts === 1 ? 'Alert' : 'Alerts'}
              </Text>
            </View>
            <Text className="mt-5 max-w-[260px] text-[16px] leading-8 text-white">
              {alertsData.activeAlerts
                ? 'We detected spending patterns that deserve a closer look this month.'
                : 'No unusual spending patterns detected right now. Keep tracking to stay ahead.'}
            </Text>
          </View>

          {alertsData.alerts.length ? (
            alertsData.alerts.map((alert) => (
              <AlertCard key={alert.key} alert={alert} currency={currency} locale={locale} />
            ))
          ) : (
            <View className="rounded-[28px] border border-line bg-[#F8FAFC] px-6 py-6">
              <Text className="text-[20px] font-semibold text-ink">You&apos;re on track</Text>
              <Text className="mt-3 text-[15px] leading-7 text-muted">
                FinAssist has not spotted any categories running above your normal pattern. Keep
                logging expenses so it can catch changes early.
              </Text>
            </View>
          )}

          <View className="rounded-[24px] bg-[#F4F7F8] px-6 py-6">
            <View className="flex-row items-center gap-3">
              <Text className="text-xl">Tips</Text>
              <Text className="text-[18px] font-semibold text-ink">Smart Tips</Text>
            </View>

            <View className="mt-5 gap-4">
              {alertsData.smartTips.map((tip) => (
                <View key={tip} className="flex-row gap-3">
                  <Text className="text-[18px] leading-7 text-slate-500">{'\u2022'}</Text>
                  <Text className="flex-1 text-[15px] leading-8 text-slate-600">{tip}</Text>
                </View>
              ))}
            </View>
          </View>

          {errorMessage ? (
            <View className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-4">
              <Text className="text-[13px] leading-5 text-rose-700">{errorMessage}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
