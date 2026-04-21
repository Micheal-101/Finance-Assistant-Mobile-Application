import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { type Href, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OnboardingButton } from '@/components/onboarding/button';
import {
  getExpenses,
  getMonthlySummary,
  type ExpenseCategory,
  type ExpensePayload,
  type MonthlySummaryResponse,
} from '@/lib/auth-api';
import { getOnboardingAuthToken } from '@/lib/auth-session';
import { getCached, getCachedUserPrefs, setCached } from '@/lib/cache';
import { formatCurrency, formatMonth, formatExpenseHeading, getCurrentMonthKey } from '@/lib/format';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

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
  utilities: { icon: 'bulb-outline', tint: '#7C3AED', bg: '#E9D5FF' },
  entertainment: { icon: 'ticket-outline', tint: '#9333EA', bg: '#F3E8FF' },
  dining: { icon: 'restaurant-outline', tint: '#0B4EA2', bg: '#DBEAFE' },
  transport: { icon: 'car-outline', tint: '#B42318', bg: '#FEE4E2' },
  other: { icon: 'ellipsis-horizontal-circle-outline', tint: '#64748B', bg: '#E2E8F0' },
};

type ExpensesCache = {
  summary: MonthlySummaryResponse;
  expenses: ExpensePayload[];
};

function buildExpenseGroups(expenses: ExpensePayload[]) {
  const groups = new Map<string, ExpensePayload[]>();

  for (const expense of expenses) {
    const key = expense.spentAt.slice(0, 10);
    const existing = groups.get(key) ?? [];
    existing.push(expense);
    groups.set(key, existing);
  }

  return Array.from(groups.entries()).map(([dateKey, entries]) => ({
    dateKey,
    heading: formatExpenseHeading(entries[0]?.spentAt ?? dateKey),
    entries,
  }));
}

function LoadingState() {
  return (
    <View className="flex-1 items-center justify-center gap-4 px-8">
      <ActivityIndicator color="#0E9B10" size="large" />
      <Text className="text-center text-[15px] text-muted">Loading your expenses...</Text>
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

function SummaryCard({ totalSpent, currency, locale }: { totalSpent: number; currency: string; locale: string }) {
  return (
    <View className="rounded-[30px] bg-brand-600 px-6 py-6">
      <View className="flex-row items-start justify-between">
        <View>
          <Text className="text-[16px] font-medium text-white">Total Spent This Month</Text>
          <Text className="mt-5 text-[34px] font-semibold tracking-tight text-white">
            {formatCurrency(totalSpent, currency, locale)}
          </Text>
        </View>

        <View className="h-16 w-16 items-center justify-center rounded-full bg-white">
          <Ionicons color="#0E9B10" name="stats-chart-outline" size={28} />
        </View>
      </View>
    </View>
  );
}

function ExpenseCard({
  expense,
  currency,
  locale,
  onPress,
}: {
  expense: ExpensePayload;
  currency: string;
  locale: string;
  onPress: () => void;
}) {
  const visual = categoryVisuals[expense.category];
  const note = expense.description?.trim();
  const title = expense.category.charAt(0).toUpperCase() + expense.category.slice(1);

  return (
    <Pressable
      className="flex-row items-center rounded-[22px] border border-line bg-white px-4 py-5"
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.86 : 1,
      })}>
      <View
        className="mr-4 h-14 w-14 items-center justify-center rounded-[16px]"
        style={{ backgroundColor: visual.bg }}>
        <Ionicons color={visual.tint} name={visual.icon} size={26} />
      </View>

      <View className="flex-1">
        <Text className="text-[18px] font-semibold text-ink">{title}</Text>
        {note ? <Text className="mt-2 text-[14px] text-muted">{note}</Text> : null}
      </View>

      <Text className="ml-4 text-[16px] font-medium text-ink">
        -{formatCurrency(expense.amount, currency, locale)}
      </Text>
    </Pressable>
  );
}

export default function ExpensesScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const [summary, setSummary] = useState<MonthlySummaryResponse | null>(null);
  const [expenses, setExpenses] = useState<ExpensePayload[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    const token = getOnboardingAuthToken();

    if (!token) {
      setSummary(null);
      setExpenses([]);
      setErrorMessage('Sign in again to load your expenses.');
      setIsLoading(false);
      return;
    }

    // Pass the local month so the server uses the device's timezone-aware month.
    const month = getCurrentMonthKey();
    const cacheKey = `expenses:${month}`;
    const cached = getCached<ExpensesCache>(cacheKey);

    if (cached) {
      setSummary(cached.summary);
      setExpenses(cached.expenses);
      setIsLoading(false);
      return;
    }

    let active = true;

    const loadExpenses = async () => {
      try {
        setIsLoading(true);
        setErrorMessage('');

        const [summaryResponse, expensesResponse] = await Promise.all([
          getMonthlySummary(token, month),
          getExpenses(token, month),
        ]);

        if (!active) {
          return;
        }

        setCached(cacheKey, { summary: summaryResponse, expenses: expensesResponse.expenses });
        setSummary(summaryResponse);
        setExpenses(expensesResponse.expenses);
      } catch (error) {
        if (!active) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : 'Unable to load your expenses right now.',
        );
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadExpenses();

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

  if (!summary) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <StatusBar style="dark" />
        <EmptyState
          buttonLabel="Go to Login"
          description={errorMessage || 'Your session is missing, so we cannot load your expenses yet.'}
          onPress={() => router.replace('/onboarding/login' as Href)}
          title="Expenses unavailable"
        />
      </SafeAreaView>
    );
  }

  const { currency, locale } = getCachedUserPrefs();
  const groupedExpenses = buildExpenseGroups(expenses);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <StatusBar style="dark" />

      <View className="flex-1 bg-white">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 150 }}
          showsVerticalScrollIndicator={false}>
          <View className="border-b border-line px-6 pb-7 pt-5">
            <View className="flex-row items-end justify-between gap-4">
              <View className="flex-1">
                <Text className="text-[24px] font-semibold tracking-tight text-ink">
                  Monthly Summary
                </Text>
                <Text className="mt-2 text-[15px] text-muted">Track all your spending</Text>
              </View>

              <Pressable
                className="rounded-full px-3 py-2"
                style={({ pressed }) => ({
                  opacity: pressed ? 0.8 : 1,
                })}>
                <View className="flex-row items-center gap-2">
                  <Ionicons color="#101828" name="calendar-outline" size={20} />
                  <Text className="text-[14px] font-medium text-ink">
                    {formatMonth(summary.month)}
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>

          <View className="px-6 pt-7">
            <SummaryCard currency={currency} locale={locale} totalSpent={summary.totalSpending} />

            <Text className="mt-8 text-[18px] font-semibold text-ink">Previous Expenses</Text>

            {groupedExpenses.length ? (
              <View className="mt-5 gap-5">
                {groupedExpenses.map((group) => (
                  <View key={group.dateKey} className="gap-3">
                    <Text className="text-[15px] font-medium text-muted">{group.heading}</Text>
                    {group.entries.map((expense) => (
                      <ExpenseCard
                        key={expense.id}
                        currency={currency}
                        expense={expense}
                        locale={locale}
                        onPress={() =>
                          router.push({
                            pathname: '/expense-details/[expenseId]',
                            params: { expenseId: expense.id },
                          })
                        }
                      />
                    ))}
                  </View>
                ))}
              </View>
            ) : (
              <View className="mt-5 rounded-[24px] border border-line bg-[#F8FAFC] px-5 py-6">
                <Text className="text-[18px] font-semibold text-ink">No expenses yet this month</Text>
                <Text className="mt-2 text-[14px] leading-6 text-muted">
                  Add your first expense to start tracking categories, summaries, and alerts.
                </Text>
              </View>
            )}

            {errorMessage ? (
              <View className="mt-5 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-4">
                <Text className="text-[13px] leading-5 text-rose-700">{errorMessage}</Text>
              </View>
            ) : null}
          </View>
        </ScrollView>

        <Pressable
          accessibilityLabel="Add expense"
          className="absolute bottom-28 right-6 h-20 w-20 items-center justify-center rounded-full bg-brand-600 shadow-lg shadow-black/15"
          onPress={() =>
            router.push({
              pathname: '/onboarding/expense',
              params: {
                mode: 'add',
                returnTo: '/(tabs)/expenses',
              },
            })
          }
          style={({ pressed }) => ({
            opacity: pressed ? 0.88 : 1,
          })}>
          <Ionicons color="#FFFFFF" name="add" size={40} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
