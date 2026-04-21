import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { type Href, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OnboardingButton } from '@/components/onboarding/button';
import {
  getCurrentUser,
  getMonthlySummary,
  getOverspendingAlerts,
  type ExpenseCategory,
  type MonthlySummaryResponse,
  type OverspendingAlertsResponse,
  type UserPayload,
} from '@/lib/auth-api';
import { getOnboardingAuthToken } from '@/lib/auth-session';
import { getCached, getCachedUserPrefs, setCached, setCachedUserPrefs } from '@/lib/cache';
import { formatCurrency, getCurrentMonthKey } from '@/lib/format';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const categoryVisuals: Record<
  ExpenseCategory,
  {
    icon: IoniconName;
    color: string;
  }
> = {
  health: { icon: 'medkit-outline', color: '#F7B500' },
  groceries: { icon: 'cart-outline', color: '#3BA2FF' },
  utilities: { icon: 'flash-outline', color: '#FF8A1F' },
  entertainment: { icon: 'ticket-outline', color: '#8B5CF6' },
  dining: { icon: 'restaurant-outline', color: '#0891B2' },
  transport: { icon: 'car-outline', color: '#EF4444' },
  other: { icon: 'ellipsis-horizontal-circle-outline', color: '#667085' },
};

const quickActions: {
  title: string;
  action: string;
  icon: IoniconName;
  tint: string;
  bg: string;
  href: Href;
}[] = [
  {
    title: 'View Overspending Alerts',
    action: 'View',
    icon: 'alert-circle-outline',
    tint: '#FF4D4F',
    bg: '#FFF1F1',
    href: '/overspending-alerts' as Href,
  },
  {
    title: 'View Monthly Summary',
    action: 'View',
    icon: 'calendar-clear-outline',
    tint: '#A855F7',
    bg: '#F7EEFF',
    href: '/monthly-summary' as Href,
  },
];

function getScoreLabel(score: number) {
  if (score >= 80) return 'Excellent';
  if (score >= 65) return 'Good progress';
  if (score >= 50) return 'Fair';
  return 'Needs attention';
}

type DashboardCache = {
  user: UserPayload;
  summary: MonthlySummaryResponse;
  alerts: OverspendingAlertsResponse;
};

function QuickActionCard({
  title,
  action,
  icon,
  tint,
  bg,
  onPress,
}: {
  title: string;
  action: string;
  icon: IoniconName;
  tint: string;
  bg: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      className="min-h-[112px] flex-1 rounded-[18px] border border-[#F0E5E5] px-4 py-4"
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: bg,
        opacity: pressed ? 0.88 : 1,
      })}>
      <View className="h-7 w-7 items-center justify-center rounded-full bg-white/90">
        <Ionicons color={tint} name={icon} size={15} />
      </View>
      <Text className="mt-5 text-[14px] font-medium leading-5 text-ink">{title}</Text>
      <View className="mt-auto flex-row items-center justify-end gap-1">
        <Text className="text-[12px] text-slate-700">{action}</Text>
        <Ionicons color="#101828" name="chevron-forward" size={12} />
      </View>
    </Pressable>
  );
}

function TopSpendingRow({
  title,
  amount,
  category,
  currency,
  locale,
  onPress,
}: {
  title: string;
  amount: number;
  category: ExpenseCategory;
  currency: string;
  locale: string;
  onPress: () => void;
}) {
  const visual = categoryVisuals[category];

  return (
    <Pressable
      className="flex-row items-center rounded-[18px] bg-[#F3F4F6] px-4 py-4"
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.86 : 1,
      })}>
      <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-white">
        <Ionicons color={visual.color} name={visual.icon} size={17} />
      </View>

      <View className="flex-1">
        <Text className="text-[14px] font-semibold text-ink">{title}</Text>
        <Text className="mt-1 text-[11px] text-muted">This month</Text>
      </View>

      <View className="flex-row items-center gap-2">
        <Text className="text-[13px] font-medium text-slate-700">
          {formatCurrency(amount, currency, locale)}
        </Text>
        <Ionicons color="#667085" name="chevron-forward" size={14} />
      </View>
    </Pressable>
  );
}

function DashboardLoading() {
  return (
    <View className="flex-1 items-center justify-center gap-4 px-8">
      <ActivityIndicator color="#0E9B10" size="large" />
      <Text className="text-center text-[15px] text-muted">Loading your financial dashboard...</Text>
    </View>
  );
}

function DashboardEmpty({
  title,
  description,
  actionLabel,
  onPress,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onPress: () => void;
}) {
  return (
    <View className="flex-1 items-center justify-center px-6">
      <View className="w-full max-w-[340px] rounded-[28px] border border-line bg-white px-6 py-8">
        <Text className="text-center text-[22px] font-semibold text-ink">{title}</Text>
        <Text className="mt-3 text-center text-[15px] leading-6 text-muted">{description}</Text>
        <OnboardingButton className="mt-7" label={actionLabel} onPress={onPress} />
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const [user, setUser] = useState<UserPayload | null>(null);
  const [summary, setSummary] = useState<MonthlySummaryResponse | null>(null);
  const [alerts, setAlerts] = useState<OverspendingAlertsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    const token = getOnboardingAuthToken();

    if (!token) {
      setUser(null);
      setSummary(null);
      setAlerts(null);
      setErrorMessage('Sign in again to load your dashboard data.');
      setIsLoading(false);
      return;
    }

    // Always use the device's local month so the server receives the correct
    // month for the user's timezone — fixes the UTC-assumption issue.
    const month = getCurrentMonthKey();
    const cacheKey = `dashboard:${month}`;
    const cached = getCached<DashboardCache>(cacheKey);

    if (cached) {
      setUser(cached.user);
      setSummary(cached.summary);
      setAlerts(cached.alerts);
      setIsLoading(false);
      return;
    }

    let active = true;

    const loadDashboard = async () => {
      try {
        setIsLoading(true);
        setErrorMessage('');

        const [userResponse, summaryResponse, alertsResponse] = await Promise.all([
          getCurrentUser(token),
          getMonthlySummary(token, month),
          getOverspendingAlerts(token, month),
        ]);

        if (!active) {
          return;
        }

        setCached(cacheKey, {
          user: userResponse.user,
          summary: summaryResponse,
          alerts: alertsResponse,
        });
        // Share user prefs so screens that don't load the user can still format currency correctly.
        setCachedUserPrefs({ currency: 'GBP', locale: 'en-GB' });

        setUser(userResponse.user);
        setSummary(summaryResponse);
        setAlerts(alertsResponse);
      } catch (error) {
        if (!active) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : 'Unable to load your dashboard right now.',
        );
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadDashboard();

    return () => {
      active = false;
    };
  }, [isFocused]);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <StatusBar style="light" />
        <DashboardLoading />
      </SafeAreaView>
    );
  }

  if (!user || !summary) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <StatusBar style="dark" />
        <DashboardEmpty
          actionLabel="Go to Login"
          description={errorMessage || 'Your session is missing, so we cannot load your dashboard yet.'}
          onPress={() => router.replace('/onboarding/login' as Href)}
          title="Dashboard unavailable"
        />
      </SafeAreaView>
    );
  }

  const { currency, locale } = getCachedUserPrefs();
  const fmt = (amount: number) => formatCurrency(amount, currency, locale);

  const displayName = user.fullName.trim() || 'FinAssist User';
  const firstName = displayName.split(' ')[0] || displayName;
  const budgetRemaining = Math.max(user.monthlyIncome - summary.totalSpending, 0);
  const scoreLabel = getScoreLabel(summary.financialHealthScore);
  const topSpendingItems = summary.categoryBreakdown.slice(0, 4);
  const leadAlert = alerts?.alerts[0] ?? null;
  const budgetAlertTitle = leadAlert
    ? `${leadAlert.name} Alert`
    : alerts?.activeAlerts
      ? 'Spending Alert'
      : 'Spending Check-In';
  const budgetAlertBody = leadAlert
    ? `Your ${leadAlert.name.toLowerCase()} spending is ${leadAlert.percentageAboveAverage}% above your usual average this month.`
    : 'No unusual spending patterns detected right now. Keep tracking expenses to stay ahead.';

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <StatusBar style="light" />

      <ScrollView
        className="flex-1 bg-white"
        contentContainerStyle={{ paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}>
        <View className="rounded-b-[34px] bg-black px-5 pb-24 pt-3">
          <View className="flex-row items-center gap-3">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-[#DDF5E1]">
              <Text className="text-[18px] font-semibold text-brand-700">
                {firstName.charAt(0).toUpperCase()}
              </Text>
            </View>

            <View>
              <Text className="text-[14px] text-white/80">Welcome back,</Text>
              <Text className="mt-1 text-[19px] font-semibold text-brand-400">{displayName}</Text>
            </View>
          </View>
        </View>

        <View className="-mt-16 px-5">
          <View className="overflow-hidden rounded-[24px] shadow-sm shadow-black/10">
            <View className="bg-brand-700 px-5 pb-4 pt-4">
              <View className="flex-row items-start justify-between">
                <View>
                  <Text className="text-[11px] text-white/90">Financial Health Score</Text>
                  <Text className="mt-2 text-[36px] font-semibold tracking-tight text-white">
                    {summary.financialHealthScore}%
                  </Text>
                </View>

                <View className="h-10 w-10 items-center justify-center rounded-full bg-white/90">
                  <Ionicons color="#0B7B0E" name="person-outline" size={16} />
                </View>
              </View>

              <View className="mt-3 h-1.5 rounded-full bg-white/25">
                <View
                  className="h-1.5 rounded-full bg-white"
                  style={{ width: `${Math.max(10, Math.min(summary.financialHealthScore, 100))}%` }}
                />
              </View>
              <Text className="mt-2 text-[11px] text-white/90">{scoreLabel}</Text>
            </View>

            <View className="bg-[#32E000] px-5 py-4">
              <View className="flex-row items-end justify-between">
                <View>
                  <Text className="text-[11px] text-black/70">Budget Remaining</Text>
                  <Text className="mt-1 text-[30px] font-semibold tracking-tight text-black">
                    {fmt(budgetRemaining)}
                  </Text>
                  <Text className="mt-1 text-[11px] text-black/70">
                    of {fmt(user.monthlyIncome)}
                  </Text>
                </View>

                <Ionicons color="#111111" name="stats-chart-outline" size={18} />
              </View>
            </View>
          </View>

          <View className="mt-4 rounded-[20px] border border-[#F4D58D] bg-[#FFF5DB] px-4 py-4">
            <View className="flex-row gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-[#FF9F0A]">
                <Ionicons color="#FFFFFF" name="alert-circle-outline" size={18} />
              </View>

              <View className="flex-1">
                <Text className="text-[14px] font-semibold text-[#7A4A00]">{budgetAlertTitle}</Text>
                <Text className="mt-1 text-[12px] leading-5 text-[#946200]">{budgetAlertBody}</Text>
              </View>
            </View>

            <View className="mt-4 flex-row gap-3">
              <Pressable
                className="flex-1 items-center rounded-[12px] bg-white px-4 py-3"
                onPress={() => router.push('/overspending-alerts' as Href)}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.86 : 1,
                })}>
                <Text className="text-[12px] font-medium text-[#B45309]">View Details</Text>
              </Pressable>
              <Pressable
                className="flex-1 items-center rounded-[12px] bg-[#FF9F0A] px-4 py-3"
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/assistant',
                    params: {
                      prompt: leadAlert
                        ? `Why did I get this ${leadAlert.name.toLowerCase()} spending alert, and what should I do next?`
                        : 'What should I focus on in my finances this month?',
                      screen: 'home',
                      category: leadAlert?.key,
                    },
                  })
                }
                style={({ pressed }) => ({
                  opacity: pressed ? 0.86 : 1,
                })}>
                <Text className="text-[12px] font-medium text-white">Ask Assistant</Text>
              </Pressable>
            </View>
          </View>

          <View className="mb-3 mt-6 flex-row items-center justify-between">
            <Text className="text-[15px] font-semibold text-ink">Top Spending</Text>
            <Ionicons color="#101828" name="trending-up-outline" size={15} />
          </View>

          {topSpendingItems.length ? (
            <View className="gap-3">
              {topSpendingItems.map((item) => (
                <TopSpendingRow
                  key={item.key}
                  amount={item.amount}
                  category={item.key}
                  currency={currency}
                  locale={locale}
                  onPress={() =>
                    router.push({
                      pathname: '/expense-category/[category]',
                      params: { category: item.key },
                    })
                  }
                  title={item.name}
                />
              ))}
            </View>
          ) : (
            <View className="rounded-[18px] bg-[#F3F4F6] px-4 py-5">
              <Text className="text-[14px] font-medium text-ink">No expenses yet</Text>
              <Text className="mt-1 text-[12px] leading-5 text-muted">
                Add your first expense to see real category insights here.
              </Text>
            </View>
          )}

          <View className="mb-2 mt-6">
            <Text className="text-[15px] font-semibold text-ink">Quick Actions</Text>
          </View>

          <View className="flex-row gap-3">
            {quickActions.map((item) => (
              <QuickActionCard
                key={item.title}
                {...item}
                onPress={() => router.push(item.href)}
              />
            ))}
          </View>

          {errorMessage ? (
            <View className="mt-4 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-4">
              <Text className="text-[13px] leading-5 text-rose-700">{errorMessage}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
