import type { ComponentProps } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useIsFocused } from '@react-navigation/native';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';

import { OnboardingButton } from '@/components/onboarding/button';
import {
  getExpenseCategoryAnalysis,
  type ExpenseCategory,
  type ExpenseCategoryAnalysisResponse,
} from '@/lib/auth-api';
import { getOnboardingAuthToken } from '@/lib/auth-session';
import { getCached, getCachedUserPrefs, setCached } from '@/lib/cache';
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
  groceries: { icon: 'cart-outline', tint: '#A16207', bg: '#FEF3C7' },
  utilities: { icon: 'flash-outline', tint: '#F59E0B', bg: '#FFF5D6' },
  entertainment: { icon: 'ticket-outline', tint: '#9333EA', bg: '#F3E8FF' },
  dining: { icon: 'restaurant-outline', tint: '#0B4EA2', bg: '#DBEAFE' },
  transport: { icon: 'car-outline', tint: '#B42318', bg: '#FEE4E2' },
  other: { icon: 'ellipsis-horizontal-circle-outline', tint: '#64748B', bg: '#E2E8F0' },
};

function formatDelta(percentageDelta: number, hasHistoricalAverage: boolean) {
  if (!hasHistoricalAverage) {
    return 'No 6-month average yet';
  }

  const prefix = percentageDelta > 0 ? '+' : '';
  return `${prefix}${percentageDelta.toFixed(1)}% vs 6-month average`;
}

function LoadingState() {
  return (
    <View className="flex-1 items-center justify-center gap-4 px-8">
      <ActivityIndicator color="#0E9B10" size="large" />
      <Text className="text-center text-[15px] text-muted">Loading your spending analysis...</Text>
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

export default function ExpenseCategoryScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const params = useLocalSearchParams<{ category?: string | string[] }>();
  const categoryParam = Array.isArray(params.category) ? params.category[0] : params.category;
  const category = categoryParam as ExpenseCategory | undefined;
  const [analysis, setAnalysis] = useState<ExpenseCategoryAnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const visual = category ? categoryVisuals[category] : null;

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    const token = getOnboardingAuthToken();

    if (!token) {
      setAnalysis(null);
      setErrorMessage('Sign in again to load this expense analysis.');
      setIsLoading(false);
      return;
    }

    if (!category || !(category in categoryVisuals)) {
      setAnalysis(null);
      setErrorMessage('That expense category could not be found.');
      setIsLoading(false);
      return;
    }

    const month = getCurrentMonthKey();
    const cacheKey = `category-analysis:${category}:${month}`;
    const cached = getCached<ExpenseCategoryAnalysisResponse>(cacheKey);

    if (cached) {
      setAnalysis(cached);
      setIsLoading(false);
      return;
    }

    let active = true;

    const loadAnalysis = async () => {
      try {
        setIsLoading(true);
        setErrorMessage('');

        const response = await getExpenseCategoryAnalysis(token, category);

        if (!active) {
          return;
        }

        setCached(cacheKey, response);
        setAnalysis(response);
      } catch (error) {
        if (!active) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : 'Unable to load this category right now.',
        );
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadAnalysis();

    return () => {
      active = false;
    };
  }, [category, isFocused]);

  const maxTrendAmount = useMemo(() => {
    if (!analysis?.trend.length) {
      return 1;
    }

    return Math.max(...analysis.trend.map((entry) => entry.amount), 1);
  }, [analysis]);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <StatusBar style="dark" />
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (!analysis || !visual) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <StatusBar style="dark" />
        <EmptyState
          buttonLabel="Back to Expenses"
          description={errorMessage || 'This category is unavailable right now.'}
          onPress={() => router.replace('/(tabs)/expenses' as Href)}
          title="Analysis unavailable"
        />
      </SafeAreaView>
    );
  }

  const { currency, locale } = getCachedUserPrefs();
  const fmt = (amount: number) => formatCurrency(amount, currency, locale);

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

            <View className="flex-row items-center gap-3">
              <Ionicons color={visual.tint} name={visual.icon} size={24} />
              <View>
                <Text className="text-[22px] font-semibold tracking-tight text-ink">
                  {analysis.category.name}
                </Text>
                <Text className="mt-1 text-[14px] text-muted">Spending Analysis</Text>
              </View>
            </View>
          </View>
        </View>

        <View className="gap-5 px-6 pt-6">
          <View className="rounded-[30px] bg-brand-600 px-6 py-6">
            <View className="flex-row items-start justify-between gap-4">
              <View className="flex-1">
                <Text className="text-[16px] font-medium text-white">
                  {formatMonth(analysis.month)} Total
                </Text>
                <Text className="mt-5 text-[34px] font-semibold tracking-tight text-white">
                  {fmt(analysis.currentMonthTotal)}
                </Text>
                <View className="mt-4 flex-row items-center gap-2">
                  <Ionicons color="#FFFFFF" name="trending-up-outline" size={18} />
                  <Text className="text-[15px] text-white">
                    {formatDelta(analysis.percentageDelta, analysis.hasHistoricalAverage)}
                  </Text>
                </View>
              </View>

              <View className="h-14 w-14 items-center justify-center rounded-full bg-white">
                <Ionicons color="#0E9B10" name="stats-chart-outline" size={24} />
              </View>
            </View>
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1 rounded-[20px] bg-[#F4F7F8] px-5 py-5">
              <Text className="text-[14px] text-slate-500">6-Month Average</Text>
              <Text className="mt-4 text-[22px] font-semibold tracking-tight text-ink">
                {fmt(analysis.sixMonthAverage)}
              </Text>
            </View>

            <View className="flex-1 rounded-[20px] bg-[#F4F7F8] px-5 py-5">
              <Text className="text-[14px] text-slate-500">Transactions</Text>
              <Text className="mt-4 text-[22px] font-semibold tracking-tight text-ink">
                {analysis.transactionsCount}
              </Text>
            </View>
          </View>

          <View className="rounded-[26px] border border-line bg-white px-5 py-5">
            <Text className="text-[18px] font-semibold text-ink">6-Month Trend</Text>

            <View className="mt-6 rounded-[24px] border border-line px-4 pb-4 pt-5">
              <View className="h-56 flex-row items-end justify-between gap-3">
                {analysis.trend.map((entry, index) => {
                  const isCurrentMonth = index === analysis.trend.length - 1;
                  const barHeight = 24 + (entry.amount / maxTrendAmount) * 136;

                  return (
                    <View key={entry.month} className="flex-1 items-center justify-end gap-3">
                      <View className="h-44 w-full justify-end rounded-full bg-transparent px-1">
                        <View
                          className={`w-full rounded-[10px] ${isCurrentMonth ? 'bg-brand-700' : 'bg-[#D9F8D4]'}`}
                          style={{ height: barHeight }}
                        />
                      </View>
                      <Text className="text-[13px] text-slate-500">{entry.label}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>

          <View className="rounded-[26px] border border-line bg-white px-5 py-5">
            <Text className="text-[18px] font-semibold text-ink">Recent Transactions</Text>

            {analysis.recentTransactions.length ? (
              <View className="mt-5 gap-3">
                {analysis.recentTransactions.map((expense) => (
                  <Pressable
                    key={expense.id}
                    className="flex-row items-center rounded-[20px] bg-[#F4F7F8] px-4 py-4"
                    onPress={() =>
                      router.push({
                        pathname: '/expense-details/[expenseId]',
                        params: { expenseId: expense.id },
                      })
                    }
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.86 : 1,
                    })}>
                    <View className="mr-4 h-12 w-12 items-center justify-center rounded-full bg-brand-50">
                      <Ionicons color="#16A34A" name="calendar-clear-outline" size={22} />
                    </View>

                    <View className="flex-1">
                      <Text className="text-[18px] font-semibold text-ink">
                        {expense.description?.trim() || analysis.category.name}
                      </Text>
                      <Text className="mt-1 text-[14px] text-muted">{expense.spentAt.slice(0, 10)}</Text>
                    </View>

                    <Text className="ml-4 text-[16px] font-medium text-ink">
                      {fmt(expense.amount)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <View className="mt-5 rounded-[20px] bg-[#F8FAFC] px-4 py-5">
                <Text className="text-[15px] font-medium text-ink">No transactions logged yet</Text>
                <Text className="mt-2 text-[14px] leading-6 text-muted">
                  Add expenses in this category and they will show up here for quick review.
                </Text>
              </View>
            )}
          </View>

          <View className="rounded-[28px] border border-[#86EFAC] bg-[#F1FFF2] px-5 py-5">
            <View className="flex-row items-center gap-4">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-brand-700">
                <Ionicons color="#FFFFFF" name="chatbubble-ellipses-outline" size={22} />
              </View>
              <Text className="text-[18px] font-semibold text-ink">AI Insight</Text>
            </View>

            <Text className="mt-5 text-[16px] leading-8 text-slate-700">{analysis.aiInsight}</Text>

            <Pressable
              className="mt-6 items-center rounded-[16px] bg-brand-600 px-5 py-4"
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/assistant',
                  params: {
                    prompt: `Help me understand my ${analysis.category.name.toLowerCase()} spending this month.`,
                    screen: 'expense-category',
                    category: analysis.category.key,
                  },
                })
              }
              style={({ pressed }) => ({
                opacity: pressed ? 0.9 : 1,
              })}>
              <Text className="text-[17px] font-medium text-white">Ask Assistant About This</Text>
            </Pressable>
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
