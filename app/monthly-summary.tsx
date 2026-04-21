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
  getCurrentUser,
  getMonthlySummary,
  type ExpenseCategory,
  type MonthlySummaryResponse,
  type UserPayload,
} from '@/lib/auth-api';
import { getOnboardingAuthToken } from '@/lib/auth-session';
import { getCached, getCachedUserPrefs, setCached, setCachedUserPrefs } from '@/lib/cache';
import { formatCurrency, formatMonth, getCurrentMonthKey } from '@/lib/format';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const categoryVisuals: Record<
  ExpenseCategory,
  {
    icon: IoniconName;
    tint: string;
    bg: string;
  }
> = {
  health: { icon: 'medkit-outline', tint: '#F59E0B', bg: '#FFF5D6' },
  groceries: { icon: 'cart-outline', tint: '#6B7280', bg: '#F3F4F6' },
  utilities: { icon: 'flash-outline', tint: '#EF4444', bg: '#FEE2E2' },
  entertainment: { icon: 'ticket-outline', tint: '#9333EA', bg: '#F3E8FF' },
  dining: { icon: 'restaurant-outline', tint: '#0891B2', bg: '#DBEAFE' },
  transport: { icon: 'car-outline', tint: '#DC2626', bg: '#FEE2E2' },
  other: { icon: 'ellipsis-horizontal-circle-outline', tint: '#64748B', bg: '#E2E8F0' },
};

const goalLabels: Record<string, { label: string; color: string; bg: string }> = {
  control: { label: 'Control Spending', color: '#B45309', bg: '#FEF3C7' },
  save: { label: 'Save More', color: '#0369A1', bg: '#E0F2FE' },
  budget: { label: 'Budget Planning', color: '#7C3AED', bg: '#EDE9FE' },
};

type SummaryCache = {
  user: UserPayload;
  summary: MonthlySummaryResponse;
};

function getScoreLabel(score: number) {
  if (score >= 80) return 'Excellent financial health!';
  if (score >= 65) return 'You are doing well.';
  if (score >= 50) return 'There is room to improve.';
  return "Let's tighten things up.";
}

function LoadingState() {
  return (
    <View className="flex-1 items-center justify-center gap-4 px-8">
      <ActivityIndicator color="#0E9B10" size="large" />
      <Text className="text-center text-[15px] text-muted">Loading your monthly summary...</Text>
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

function StatCard({
  title,
  value,
  footnote,
  icon,
  tint,
}: {
  title: string;
  value: string;
  footnote: string;
  icon: IoniconName;
  tint: string;
}) {
  return (
    <View className="flex-1 rounded-[20px] bg-[#F4F7F8] px-5 py-5">
      <View className="flex-row items-center gap-2">
        <Ionicons color={tint} name={icon} size={18} />
        <Text className="text-[14px] text-slate-600">{title}</Text>
      </View>
      <Text className="mt-4 text-[22px] font-semibold tracking-tight text-ink">{value}</Text>
      <Text className="mt-3 text-[12px] font-medium" style={{ color: tint }}>
        {footnote}
      </Text>
    </View>
  );
}

function CategoryBar({
  category,
  title,
  amount,
  share,
  currency,
  locale,
}: {
  category: ExpenseCategory;
  title: string;
  amount: number;
  share: number;
  currency: string;
  locale: string;
}) {
  const visual = categoryVisuals[category];

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between gap-4">
        <View className="flex-row items-center gap-3">
          <Ionicons color={visual.tint} name={visual.icon} size={22} />
          <Text className="text-[15px] text-slate-700">{title}</Text>
        </View>
        <Text className="text-[15px] font-semibold text-ink">
          {formatCurrency(amount, currency, locale)}
        </Text>
      </View>

      <View className="h-1.5 rounded-full bg-[#BEE1C1]">
        <View
          className="h-1.5 rounded-full bg-brand-700"
          style={{ width: `${Math.max(8, Math.min(share * 100, 100))}%` }}
        />
      </View>
    </View>
  );
}

export default function MonthlySummaryScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const [user, setUser] = useState<UserPayload | null>(null);
  const [summary, setSummary] = useState<MonthlySummaryResponse | null>(null);
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
      setErrorMessage('Sign in again to load your monthly summary.');
      setIsLoading(false);
      return;
    }

    const month = getCurrentMonthKey();
    const cacheKey = `monthly-summary:${month}`;
    const cached = getCached<SummaryCache>(cacheKey);

    if (cached) {
      setUser(cached.user);
      setSummary(cached.summary);
      setIsLoading(false);
      return;
    }

    let active = true;

    const loadSummary = async () => {
      try {
        setIsLoading(true);
        setErrorMessage('');

        const [userResponse, summaryResponse] = await Promise.all([
          getCurrentUser(token),
          getMonthlySummary(token, month),
        ]);

        if (!active) {
          return;
        }

        setCached(cacheKey, { user: userResponse.user, summary: summaryResponse });
        setCachedUserPrefs({ currency: 'GBP', locale: 'en-GB' });
        setUser(userResponse.user);
        setSummary(summaryResponse);
      } catch (error) {
        if (!active) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : 'Unable to load your monthly summary right now.',
        );
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadSummary();

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

  if (!user || !summary) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <StatusBar style="dark" />
        <EmptyState
          buttonLabel="Go to Login"
          description={errorMessage || 'Your session is missing, so we cannot load the summary yet.'}
          onPress={() => router.replace('/onboarding/login' as Href)}
          title="Summary unavailable"
        />
      </SafeAreaView>
    );
  }

  const { currency, locale } = getCachedUserPrefs();
  const fmt = (amount: number) => formatCurrency(amount, currency, locale);

  const spendingDelta = summary.totalSpending - summary.previousMonthSpending;
  const spendingDeltaText =
    summary.previousMonthSpending === 0
      ? 'No previous month data yet'
      : spendingDelta <= 0
        ? `Down ${fmt(Math.abs(spendingDelta))} vs last month`
        : `Up ${fmt(spendingDelta)} vs last month`;
  const spendingDeltaTint =
    summary.previousMonthSpending === 0 ? '#1570EF' : spendingDelta <= 0 ? '#16A34A' : '#D92D20';
  const incomeRatio =
    user.monthlyIncome > 0 ? Math.round((summary.savings / user.monthlyIncome) * 100) : 0;
  const topCategory = summary.topCategory;
  const topCategoryVisual = topCategory ? categoryVisuals[topCategory.key] : null;
  const goal = user.primaryGoal ? goalLabels[user.primaryGoal] : null;

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

            <View className="flex-1">
              <Text className="text-[24px] font-semibold tracking-tight text-ink">
                Monthly Summary
              </Text>
              <Text className="mt-1 text-[14px] text-muted">{formatMonth(summary.month)}</Text>
            </View>

            {goal ? (
              <View
                className="rounded-full px-3 py-1.5"
                style={{ backgroundColor: goal.bg }}>
                <Text className="text-[12px] font-medium" style={{ color: goal.color }}>
                  {goal.label}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View className="gap-5 px-6 pt-6">
          <View className="rounded-[26px] border border-line bg-white px-5 py-5">
            <View className="flex-row items-center gap-4">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-brand-50">
                <Ionicons color="#16A34A" name="ribbon-outline" size={22} />
              </View>
              <Text className="text-[18px] font-medium text-ink">Financial Health Score</Text>
            </View>
            <Text className="mt-5 text-[44px] font-semibold tracking-tight text-ink">
              {summary.financialHealthScore}
            </Text>
            <Text className="mt-2 text-[16px] text-ink">{getScoreLabel(summary.financialHealthScore)}</Text>
          </View>

          <View className="rounded-[26px] border border-[#86EFAC] bg-[#F1FFF2] px-5 py-5">
            <View className="flex-row items-center gap-4">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-brand-700">
                <Ionicons color="#FFFFFF" name="chatbubble-ellipses-outline" size={22} />
              </View>
              <Text className="text-[18px] font-semibold text-ink">AI Summary</Text>
            </View>

            <Text className="mt-5 text-[16px] leading-8 text-slate-700">{summary.aiSummary}</Text>
          </View>

          <View className="flex-row gap-3">
            <StatCard
              footnote={spendingDeltaText}
              icon="trending-up-outline"
              tint={spendingDeltaTint}
              title="Total Spending"
              value={fmt(summary.totalSpending)}
            />
            <StatCard
              footnote={`${incomeRatio}% of income`}
              icon="wallet-outline"
              tint="#A020F0"
              title="Savings"
              value={fmt(summary.savings)}
            />
          </View>

          <View className="rounded-[26px] border border-line bg-white px-5 py-5">
            <View className="flex-row items-center gap-3">
              <Ionicons color="#111827" name="radio-button-on-outline" size={22} />
              <Text className="text-[18px] font-semibold text-ink">Top Spending Category</Text>
            </View>

            {topCategory && topCategoryVisual ? (
              <>
                <View className="mt-6 flex-row items-center gap-4">
                  <View
                    className="h-14 w-14 items-center justify-center rounded-[16px]"
                    style={{ backgroundColor: topCategoryVisual.bg }}>
                    <Ionicons color={topCategoryVisual.tint} name={topCategoryVisual.icon} size={24} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[16px] text-slate-500">{topCategory.name}</Text>
                    <Text className="mt-1 text-[20px] font-semibold tracking-tight text-ink">
                      {fmt(topCategory.amount)}
                    </Text>
                  </View>
                </View>

                <Pressable
                  className="mt-6 items-center rounded-[16px] bg-[#F7EEFF] px-4 py-4"
                  onPress={() =>
                    router.push({
                      pathname: '/expense-category/[category]',
                      params: { category: topCategory.key },
                    })
                  }
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.86 : 1,
                  })}>
                  <Text className="text-[16px] font-medium text-[#A020F0]">View Category</Text>
                </Pressable>
              </>
            ) : (
              <View className="mt-6 rounded-[20px] bg-[#F8FAFC] px-4 py-5">
                <Text className="text-[15px] font-medium text-ink">No category data yet</Text>
                <Text className="mt-2 text-[14px] leading-6 text-muted">
                  Add a few expenses and FinAssist will highlight the category taking the most of
                  your budget.
                </Text>
              </View>
            )}
          </View>

          <View className="rounded-[26px] border border-line bg-white px-5 py-5">
            <Text className="text-[18px] font-semibold text-ink">Spending by Category</Text>

            {summary.categoryBreakdown.length ? (
              <View className="mt-7 gap-6">
                {summary.categoryBreakdown.map((item) => (
                  <CategoryBar
                    key={item.key}
                    amount={item.amount}
                    category={item.key}
                    currency={currency}
                    locale={locale}
                    share={item.share}
                    title={item.name}
                  />
                ))}
              </View>
            ) : (
              <View className="mt-7 rounded-[20px] bg-[#F8FAFC] px-4 py-5">
                <Text className="text-[15px] font-medium text-ink">Nothing to break down yet</Text>
                <Text className="mt-2 text-[14px] leading-6 text-muted">
                  Your monthly categories will appear here once expenses have been logged.
                </Text>
              </View>
            )}
          </View>

          {errorMessage ? (
            <View className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-4">
              <Text className="text-[13px] leading-5 text-rose-700">{errorMessage}</Text>
            </View>
          ) : null}

          <Pressable
            className="items-center rounded-[16px] bg-brand-600 px-5 py-5"
            onPress={() =>
              router.push({
                pathname: '/(tabs)/assistant',
                params: {
                  prompt: 'Help me understand my monthly summary and whether I am still on track with my budget.',
                  screen: 'monthly-summary',
                },
              })
            }
            style={({ pressed }) => ({
              opacity: pressed ? 0.9 : 1,
            })}>
            <Text className="text-[17px] font-medium text-white">Ask Assistant</Text>
          </Pressable>

          <Pressable
            className="items-center py-3"
            onPress={() => router.replace('/(tabs)' as Href)}
            style={({ pressed }) => ({
              opacity: pressed ? 0.72 : 1,
            })}>
            <Text className="text-[16px] font-medium text-ink">Back to Home</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
