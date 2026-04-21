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
  type PrimaryGoal,
  type UserPayload,
} from '@/lib/auth-api';
import { getOnboardingAuthToken } from '@/lib/auth-session';

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
  groceries: { icon: 'cart-outline', tint: '#0EA5E9', bg: '#E0F2FE' },
  utilities: { icon: 'flash-outline', tint: '#F97316', bg: '#FFEDD5' },
  entertainment: { icon: 'ticket-outline', tint: '#8B5CF6', bg: '#F3E8FF' },
  dining: { icon: 'restaurant-outline', tint: '#0891B2', bg: '#CFFAFE' },
  transport: { icon: 'car-outline', tint: '#EF4444', bg: '#FEE2E2' },
  other: { icon: 'ellipsis-horizontal-circle-outline', tint: '#64748B', bg: '#E2E8F0' },
};

function formatCurrency(amount: number) {
  return `NGN ${amount.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatMonth(month: string) {
  const date = new Date(`${month}-01T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return month;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function getGoalCopy(goal?: PrimaryGoal) {
  if (goal === 'control') {
    return {
      title: 'Spending Control Focus',
      description:
        'Keep a close eye on your watchlist categories and check in weekly to avoid late-month surprises.',
      icon: 'shield-checkmark-outline' as IoniconName,
    };
  }

  if (goal === 'save') {
    return {
      title: 'Savings Focus',
      description:
        'Your strongest next move is protecting the gap between your income and top spending categories each month.',
      icon: 'wallet-outline' as IoniconName,
    };
  }

  return {
    title: 'Budget Planning Focus',
    description:
      'Use your monthly breakdown to set category limits that match how you actually spend, not guesswork.',
    icon: 'stats-chart-outline' as IoniconName,
  };
}

function LoadingState() {
  return (
    <View className="flex-1 items-center justify-center gap-4 px-8">
      <ActivityIndicator color="#0E9B10" size="large" />
      <Text className="text-center text-[15px] text-muted">Loading your insights...</Text>
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

function InsightStat({
  label,
  value,
  footnote,
  icon,
  tint,
  bg,
}: {
  label: string;
  value: string;
  footnote: string;
  icon: IoniconName;
  tint: string;
  bg: string;
}) {
  return (
    <View className="flex-1 rounded-[24px] px-5 py-5" style={{ backgroundColor: bg }}>
      <View className="flex-row items-center gap-2">
        <Ionicons color={tint} name={icon} size={18} />
        <Text className="text-[13px] font-medium text-slate-600">{label}</Text>
      </View>
      <Text className="mt-4 text-[22px] font-semibold tracking-tight text-ink">{value}</Text>
      <Text className="mt-3 text-[12px] leading-5" style={{ color: tint }}>
        {footnote}
      </Text>
    </View>
  );
}

function CategoryInsightRow({
  category,
  amount,
  share,
}: {
  category: ExpenseCategory;
  amount: number;
  share: number;
}) {
  const visual = categoryVisuals[category];

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between gap-4">
        <View className="flex-row items-center gap-3">
          <View
            className="h-11 w-11 items-center justify-center rounded-[14px]"
            style={{ backgroundColor: visual.bg }}>
            <Ionicons color={visual.tint} name={visual.icon} size={20} />
          </View>
          <View>
            <Text className="text-[15px] font-medium text-ink">
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </Text>
            <Text className="mt-1 text-[12px] text-muted">
              {(share * 100).toFixed(0)}% of this month&apos;s spending
            </Text>
          </View>
        </View>

        <Text className="text-[14px] font-semibold text-ink">{formatCurrency(amount)}</Text>
      </View>

      <View className="h-2 rounded-full bg-[#D9F2DC]">
        <View
          className="h-2 rounded-full bg-brand-700"
          style={{ width: `${Math.max(8, Math.min(share * 100, 100))}%` }}
        />
      </View>
    </View>
  );
}

export default function InsightsScreen() {
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
      setErrorMessage('Sign in again to unlock your insights.');
      setIsLoading(false);
      return;
    }

    let active = true;

    const loadInsights = async () => {
      try {
        setIsLoading(true);
        setErrorMessage('');

        const [userResponse, summaryResponse, alertsResponse] = await Promise.all([
          getCurrentUser(token),
          getMonthlySummary(token),
          getOverspendingAlerts(token),
        ]);

        if (!active) {
          return;
        }

        setUser(userResponse.user);
        setSummary(summaryResponse);
        setAlerts(alertsResponse);
      } catch (error) {
        if (!active) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : 'Unable to load your insights right now.',
        );
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadInsights();

    return () => {
      active = false;
    };
  }, [isFocused]);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-[#F6FAF7]" edges={['top']}>
        <StatusBar style="dark" />
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (!user || !summary) {
    return (
      <SafeAreaView className="flex-1 bg-[#F6FAF7]" edges={['top']}>
        <StatusBar style="dark" />
        <EmptyState
          buttonLabel="Go to Login"
          description={errorMessage || 'We could not find a valid session for your insights view.'}
          onPress={() => router.replace('/onboarding/login' as Href)}
          title="Insights unavailable"
        />
      </SafeAreaView>
    );
  }

  const goalCopy = getGoalCopy(user.primaryGoal);
  const spendingChange = summary.previousMonthSpending
    ? summary.totalSpending - summary.previousMonthSpending
    : 0;
  const topCategory = summary.topCategory;

  return (
    <SafeAreaView className="flex-1 bg-[#F6FAF7]" edges={['top']}>
      <StatusBar style="dark" />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 36 }}
        showsVerticalScrollIndicator={false}>
        <View className="px-6 pb-5 pt-4">
          <Text className="text-sm font-medium uppercase tracking-[2px] text-brand-700">
            Insights
          </Text>
          <Text className="mt-2 text-[32px] font-semibold tracking-tight text-ink">
            Your money snapshot
          </Text>
          <Text className="mt-2 text-[15px] leading-6 text-muted">
            {formatMonth(summary.month)} performance, category mix, and the signals worth paying
            attention to next.
          </Text>
        </View>

        <View className="px-6">
          <View className="rounded-[30px] bg-[#0A8F1F] px-6 pb-6 pt-6">
            <View className="flex-row items-start justify-between gap-4">
              <View className="flex-1">
                <Text className="text-[14px] text-white/85">AI Summary</Text>
                <Text className="mt-4 text-[24px] font-semibold tracking-tight text-white">
                  {summary.financialHealthScore}% health score
                </Text>
                <Text className="mt-3 text-[14px] leading-6 text-white/90">{summary.aiSummary}</Text>
              </View>

              <View className="h-14 w-14 items-center justify-center rounded-full bg-white/90">
                <Ionicons color="#0A8F1F" name="sparkles-outline" size={24} />
              </View>
            </View>
          </View>

          <View className="mt-4 flex-row gap-3">
            <InsightStat
              bg="#EEF4FF"
              footnote={
                spendingChange === 0
                  ? 'No previous month trend yet'
                  : spendingChange > 0
                    ? `Up ${formatCurrency(spendingChange)} vs last month`
                    : `Down ${formatCurrency(Math.abs(spendingChange))} vs last month`
              }
              icon="cash-outline"
              label="Spent"
              tint={spendingChange > 0 ? '#D92D20' : '#1570EF'}
              value={formatCurrency(summary.totalSpending)}
            />
            <InsightStat
              bg="#F3FFF3"
              footnote={`${user.monthlyIncome > 0 ? Math.round((summary.savings / user.monthlyIncome) * 100) : 0}% of income`}
              icon="wallet-outline"
              label="Saved"
              tint="#0E9B10"
              value={formatCurrency(summary.savings)}
            />
          </View>

          <View className="mt-4 rounded-[28px] bg-white px-5 py-5">
            <View className="flex-row items-center gap-3">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-[#EBFFF0]">
                <Ionicons color="#0E9B10" name={goalCopy.icon} size={22} />
              </View>
              <View className="flex-1">
                <Text className="text-[18px] font-semibold text-ink">{goalCopy.title}</Text>
                <Text className="mt-1 text-[14px] leading-6 text-muted">{goalCopy.description}</Text>
              </View>
            </View>
          </View>

          <View className="mt-4 rounded-[28px] bg-white px-5 py-5">
            <View className="flex-row items-center justify-between gap-4">
              <Text className="text-[19px] font-semibold text-ink">Category Breakdown</Text>
              <Pressable
                onPress={() => router.push('/monthly-summary' as Href)}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.75 : 1,
                })}>
                <Text className="text-[13px] font-medium text-brand-700">See full summary</Text>
              </Pressable>
            </View>

            <View className="mt-6 gap-6">
              {summary.categoryBreakdown.length ? (
                summary.categoryBreakdown.map((item) => (
                  <CategoryInsightRow
                    key={item.key}
                    amount={item.amount}
                    category={item.key}
                    share={item.share}
                  />
                ))
              ) : (
                <View className="rounded-[20px] bg-[#F6FAF7] px-4 py-5">
                  <Text className="text-[15px] font-medium text-ink">No spending data yet</Text>
                  <Text className="mt-2 text-[14px] leading-6 text-muted">
                    Once expenses start coming in, this view will show where your money is going.
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View className="mt-4 rounded-[28px] bg-white px-5 py-5">
            <Text className="text-[19px] font-semibold text-ink">Watchlist</Text>

            {topCategory ? (
              <View className="mt-5 rounded-[22px] bg-[#FFF7E8] px-4 py-4">
                <Text className="text-[13px] font-medium uppercase tracking-[1px] text-[#B45309]">
                  Highest category
                </Text>
                <Text className="mt-2 text-[22px] font-semibold tracking-tight text-ink">
                  {topCategory.name}
                </Text>
                <Text className="mt-2 text-[14px] leading-6 text-slate-700">
                  {formatCurrency(topCategory.amount)} is currently your largest spending bucket this
                  month.
                </Text>
              </View>
            ) : null}

            <View className="mt-4 gap-3">
              {alerts?.alerts.length ? (
                alerts.alerts.map((alert) => {
                  const visual = categoryVisuals[alert.key];

                  return (
                    <View
                      key={alert.key}
                      className="rounded-[20px] border border-[#FDE68A] bg-[#FFFBEB] px-4 py-4">
                      <View className="flex-row items-start gap-3">
                        <View
                          className="h-11 w-11 items-center justify-center rounded-full"
                          style={{ backgroundColor: visual.bg }}>
                          <Ionicons color={visual.tint} name={visual.icon} size={20} />
                        </View>

                        <View className="flex-1">
                          <View className="flex-row items-center gap-2">
                            <Text className="text-[16px] font-semibold text-ink">{alert.name}</Text>
                            <View className="rounded-full bg-[#FF9F0A] px-2.5 py-1">
                              <Text className="text-[11px] font-medium text-white">
                                {alert.risk === 'medium' ? 'Medium Risk' : 'Low Risk'}
                              </Text>
                            </View>
                          </View>
                          <Text className="mt-2 text-[14px] leading-6 text-slate-700">
                            Spending is {alert.percentageAboveAverage}% above your recent average in
                            this category.
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              ) : (
                <View className="rounded-[20px] bg-[#F0FDF4] px-4 py-5">
                  <Text className="text-[15px] font-semibold text-ink">No active alerts</Text>
                  <Text className="mt-2 text-[14px] leading-6 text-muted">
                    Your recent patterns look stable. Keep logging expenses so FinAssist can catch
                    changes early.
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View className="mt-4 rounded-[28px] bg-white px-5 py-5">
            <Text className="text-[19px] font-semibold text-ink">Smart Tips</Text>
            <View className="mt-5 gap-3">
              {(alerts?.smartTips.length ? alerts.smartTips : ['Keep tracking expenses every week to unlock smarter recommendations.']).map((tip) => (
                <View key={tip} className="flex-row items-start gap-3 rounded-[18px] bg-[#F6FAF7] px-4 py-4">
                  <View className="mt-0.5 h-8 w-8 items-center justify-center rounded-full bg-[#EBFFF0]">
                    <Ionicons color="#0E9B10" name="bulb-outline" size={17} />
                  </View>
                  <Text className="flex-1 text-[14px] leading-6 text-slate-700">{tip}</Text>
                </View>
              ))}
            </View>
          </View>

          {errorMessage ? (
            <View className="mt-4 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-4">
              <Text className="text-[13px] leading-5 text-rose-700">{errorMessage}</Text>
            </View>
          ) : null}

          <View className="mt-5 flex-row gap-3">
            <OnboardingButton
              className="flex-1"
              label="Ask Assistant"
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/assistant',
                  params: {
                    prompt: 'What stands out from my recent financial insights, and what should I focus on next?',
                    screen: 'explore',
                  },
                })
              }
            />
            <OnboardingButton
              className="flex-1"
              label="Alerts"
              onPress={() => router.push('/overspending-alerts' as Href)}
              variant="outline"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
