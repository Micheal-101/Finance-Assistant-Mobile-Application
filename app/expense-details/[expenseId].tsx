import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import { Alert, ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useIsFocused } from '@react-navigation/native';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';

import { OnboardingButton } from '@/components/onboarding/button';
import {
  deleteExpense,
  getExpenseDetail,
  updateExpense,
  type ExpenseCategory,
  type ExpenseDetailResponse,
} from '@/lib/auth-api';
import { getOnboardingAuthToken } from '@/lib/auth-session';
import { getCachedUserPrefs, invalidateCacheByPrefix, invalidateCache } from '@/lib/cache';
import { formatCurrency, formatDate } from '@/lib/format';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const expenseCategories: readonly ExpenseCategory[] = [
  'health', 'groceries', 'utilities', 'entertainment', 'dining', 'transport', 'other',
];

const categoryVisuals: Record<
  ExpenseCategory,
  { icon: IoniconName; tint: string; bg: string; label: string }
> = {
  health:        { icon: 'medkit-outline',                    tint: '#F59E0B', bg: '#FFF5D6', label: 'Health' },
  groceries:     { icon: 'cart-outline',                      tint: '#A16207', bg: '#FEF3C7', label: 'Groceries' },
  utilities:     { icon: 'flash-outline',                     tint: '#F59E0B', bg: '#FFF5D6', label: 'Utilities' },
  entertainment: { icon: 'ticket-outline',                    tint: '#9333EA', bg: '#F3E8FF', label: 'Entertainment' },
  dining:        { icon: 'restaurant-outline',                tint: '#0B4EA2', bg: '#DBEAFE', label: 'Dining' },
  transport:     { icon: 'car-outline',                       tint: '#B42318', bg: '#FEE4E2', label: 'Transport' },
  other:         { icon: 'ellipsis-horizontal-circle-outline',tint: '#64748B', bg: '#E2E8F0', label: 'Other' },
};

function LoadingState() {
  return (
    <View className="flex-1 items-center justify-center gap-4 px-8">
      <ActivityIndicator color="#0E9B10" size="large" />
      <Text className="text-center text-[15px] text-muted">Loading expense details...</Text>
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

function DetailCard({
  icon,
  iconTint,
  iconBg,
  title,
  value,
}: {
  icon: IoniconName;
  iconTint: string;
  iconBg: string;
  title: string;
  value: string;
}) {
  return (
    <View className="flex-row items-center rounded-[22px] bg-[#F4F7F8] px-4 py-5">
      <View
        className="mr-4 h-12 w-12 items-center justify-center rounded-[14px]"
        style={{ backgroundColor: iconBg }}>
        <Ionicons color={iconTint} name={icon} size={22} />
      </View>

      <View className="flex-1">
        <Text className="text-[15px] text-slate-500">{title}</Text>
        <Text className="mt-1 text-[18px] font-semibold text-ink">{value}</Text>
      </View>
    </View>
  );
}

export default function ExpenseDetailScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const params = useLocalSearchParams<{ expenseId?: string | string[] }>();
  const expenseId = Array.isArray(params.expenseId) ? params.expenseId[0] : params.expenseId;
  const [detail, setDetail] = useState<ExpenseDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState<ExpenseCategory>('other');
  const [editDescription, setEditDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    const token = getOnboardingAuthToken();

    if (!token) {
      setDetail(null);
      setErrorMessage('Sign in again to load this expense.');
      setIsLoading(false);
      return;
    }

    if (!expenseId) {
      setDetail(null);
      setErrorMessage('That expense could not be found.');
      setIsLoading(false);
      return;
    }

    let active = true;

    const loadExpense = async () => {
      try {
        setIsLoading(true);
        setErrorMessage('');

        const response = await getExpenseDetail(token, expenseId);

        if (!active) {
          return;
        }

        setDetail(response);
        // Pre-populate edit fields with current values
        setEditAmount(String(response.expense.amount));
        setEditCategory(response.expense.category);
        setEditDescription(response.expense.description ?? '');
      } catch (error) {
        if (!active) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : 'Unable to load this expense right now.',
        );
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadExpense();

    return () => {
      active = false;
    };
  }, [expenseId, isFocused]);

  const handleSaveEdit = async () => {
    if (!detail || isSaving) return;

    const normalizedAmount = editAmount.trim().replace(/,/g, '');
    const parsedAmount = Number(normalizedAmount);

    if (!normalizedAmount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setEditError('Enter a valid amount greater than zero.');
      return;
    }
    if (parsedAmount > 10_000_000) {
      setEditError('Amount seems too large. Please check and try again.');
      return;
    }
    if (editDescription.length > 200) {
      setEditError('Note must be 200 characters or fewer.');
      return;
    }

    const token = getOnboardingAuthToken();
    if (!token) {
      setEditError('Sign in again to save changes.');
      return;
    }

    try {
      setIsSaving(true);
      setEditError('');

      const updated = await updateExpense(token, detail.expense.id, {
        category: editCategory,
        amount: parsedAmount,
        description: editDescription.trim(),
      });

      // Invalidate analytics caches so the updated data is fetched fresh
      invalidateCacheByPrefix('dashboard:');
      invalidateCacheByPrefix('expenses:');
      invalidateCacheByPrefix('monthly-summary:');
      invalidateCacheByPrefix('overspending-alerts:');
      invalidateCacheByPrefix('category-analysis:');
      invalidateCache(`expense-detail:${detail.expense.id}`);

      setDetail({ ...detail, expense: updated.expense });
      setIsEditing(false);
    } catch (error) {
      setEditError(
        error instanceof Error ? error.message : 'Unable to save changes right now.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!detail || isDeleting) return;

    Alert.alert(
      'Delete expense?',
      'This transaction will be removed from your monthly totals and category analysis.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const token = getOnboardingAuthToken();
            if (!token) {
              setErrorMessage('Sign in again to delete this expense.');
              return;
            }

            void (async () => {
              try {
                setIsDeleting(true);
                setErrorMessage('');
                await deleteExpense(token, detail.expense.id);

                invalidateCacheByPrefix('dashboard:');
                invalidateCacheByPrefix('expenses:');
                invalidateCacheByPrefix('monthly-summary:');
                invalidateCacheByPrefix('overspending-alerts:');
                invalidateCacheByPrefix('category-analysis:');

                router.replace('/(tabs)/expenses' as Href);
              } catch (error) {
                setErrorMessage(
                  error instanceof Error ? error.message : 'Unable to delete this expense right now.',
                );
              } finally {
                setIsDeleting(false);
              }
            })();
          },
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <StatusBar style="dark" />
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (!detail) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <StatusBar style="dark" />
        <EmptyState
          buttonLabel="Back to Expenses"
          description={errorMessage || 'This expense is unavailable right now.'}
          onPress={() => router.replace('/(tabs)/expenses' as Href)}
          title="Expense unavailable"
        />
      </SafeAreaView>
    );
  }

  const { currency, locale } = getCachedUserPrefs();
  const fmt = (amount: number) => formatCurrency(amount, currency, locale);
  const visual = categoryVisuals[detail.expense.category];
  const note = detail.expense.description?.trim() || 'No note added';

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <StatusBar style="dark" />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 36 }}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="border-b border-line px-6 pb-6 pt-5">
          <View className="flex-row items-center justify-between gap-4">
            <View className="flex-row items-center gap-4">
              <Pressable
                accessibilityLabel="Go back"
                className="h-10 w-10 items-center justify-center rounded-full"
                onPress={() => router.back()}
                style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}>
                <Ionicons color="#111827" name="chevron-back" size={24} />
              </Pressable>
              <Text className="text-[24px] font-semibold tracking-tight text-ink">
                {isEditing ? 'Edit Expense' : 'Expense Details'}
              </Text>
            </View>

            {!isEditing ? (
              <Pressable
                className="flex-row items-center gap-1.5 rounded-full bg-[#F4F7F8] px-3 py-2"
                onPress={() => setIsEditing(true)}
                style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
                <Ionicons color="#374151" name="pencil-outline" size={16} />
                <Text className="text-[13px] font-medium text-ink">Edit</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View className="gap-5 px-6 pt-6">
          {/* ------------------------------------------------------------------ */}
          {/* VIEW MODE                                                            */}
          {/* ------------------------------------------------------------------ */}
          {!isEditing ? (
            <>
              <View className="rounded-[30px] bg-brand-600 px-6 py-6">
                <View className="flex-row items-start justify-between gap-4">
                  <View className="flex-1">
                    <Text className="text-[16px] font-medium text-white">Amount Spent</Text>
                    <Text className="mt-5 text-[34px] font-semibold tracking-tight text-white">
                      {fmt(detail.expense.amount)}
                    </Text>
                  </View>

                  <View className="h-14 w-14 items-center justify-center rounded-full bg-white">
                    <Ionicons color="#0E9B10" name="stats-chart-outline" size={24} />
                  </View>
                </View>
              </View>

              <View className="gap-3">
                <Text className="text-[18px] font-semibold text-ink">Recent Transaction</Text>

                <DetailCard
                  icon={visual.icon}
                  iconBg={visual.bg}
                  iconTint={visual.tint}
                  title="Category"
                  value={detail.categorySummary.name}
                />
                <DetailCard
                  icon="calendar-outline"
                  iconBg="#DBEAFE"
                  iconTint="#2563EB"
                  title="Date"
                  value={formatDate(detail.expense.spentAt)}
                />
                <DetailCard
                  icon="reader-outline"
                  iconBg="#F3E8FF"
                  iconTint="#9333EA"
                  title="Note"
                  value={note}
                />
              </View>

              <View className="flex-row gap-3">
                <View className="flex-1 rounded-[20px] bg-[#F4F7F8] px-5 py-5">
                  <Text className="text-[14px] text-slate-500">6-Month Average</Text>
                  <Text className="mt-4 text-[22px] font-semibold tracking-tight text-ink">
                    {fmt(detail.categorySummary.sixMonthAverage)}
                  </Text>
                </View>

                <View className="flex-1 rounded-[20px] bg-[#F4F7F8] px-5 py-5">
                  <Text className="text-[14px] text-slate-500">Transactions</Text>
                  <Text className="mt-4 text-[22px] font-semibold tracking-tight text-ink">
                    {detail.categorySummary.transactionsCount}
                  </Text>
                </View>
              </View>

              <Pressable
                className="flex-row items-center justify-center gap-2 rounded-[18px] bg-[#FFF1F1] px-5 py-5"
                onPress={handleDelete}
                style={({ pressed }) => ({
                  opacity: pressed || isDeleting ? 0.8 : 1,
                })}>
                {isDeleting ? (
                  <ActivityIndicator color="#E11D48" />
                ) : (
                  <>
                    <Ionicons color="#E11D48" name="trash-outline" size={20} />
                    <Text className="text-[17px] font-medium text-[#E11D48]">Delete Expense</Text>
                  </>
                )}
              </Pressable>
            </>
          ) : (
            /* ---------------------------------------------------------------- */
            /* EDIT MODE                                                         */
            /* ---------------------------------------------------------------- */
            <>
              {/* Amount */}
              <View className="gap-2">
                <Text className="text-[13px] font-medium text-slate-700">Amount</Text>
                <View className="flex-row items-center rounded-[16px] border border-line bg-[#F8FAFC] px-4 py-4">
                  <Text className="mr-2 text-[16px] font-medium text-slate-500">£</Text>
                  <TextInput
                    className="flex-1 text-[16px] text-ink"
                    keyboardType="decimal-pad"
                    maxLength={12}
                    onChangeText={setEditAmount}
                    placeholder="0.00"
                    placeholderTextColor="#9CA3AF"
                    value={editAmount}
                  />
                </View>
              </View>

              {/* Category picker */}
              <View className="gap-2">
                <Text className="text-[13px] font-medium text-slate-700">Category</Text>
                <View className="flex-row flex-wrap justify-between gap-y-3">
                  {expenseCategories.map((cat) => {
                    const v = categoryVisuals[cat];
                    const active = editCategory === cat;
                    return (
                      <Pressable
                        key={cat}
                        className={[
                          'w-[31%] rounded-2xl border px-3 py-4',
                          active ? 'border-brand-600 bg-brand-50' : 'border-line bg-slate-50',
                        ].join(' ')}
                        onPress={() => setEditCategory(cat)}
                        style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}>
                        <View className="items-center gap-2">
                          <View
                            className="h-9 w-9 items-center justify-center rounded-full"
                            style={{ backgroundColor: `${v.tint}18` }}>
                            <Ionicons color={v.tint} name={v.icon} size={18} />
                          </View>
                          <Text className="text-center text-[11px] font-medium text-ink">
                            {v.label}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Description */}
              <View className="gap-2">
                <Text className="text-[13px] font-medium text-slate-700">
                  Note{' '}
                  <Text className="text-slate-400">(optional, max 200 chars)</Text>
                </Text>
                <TextInput
                  className="rounded-[16px] border border-line bg-[#F8FAFC] px-4 py-4 text-[16px] text-ink"
                  maxLength={200}
                  multiline
                  numberOfLines={3}
                  onChangeText={setEditDescription}
                  placeholder="Add a note…"
                  placeholderTextColor="#9CA3AF"
                  style={{ textAlignVertical: 'top' }}
                  value={editDescription}
                />
                <Text className="text-right text-[12px] text-slate-400">
                  {editDescription.length}/200
                </Text>
              </View>

              {editError ? (
                <View className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                  <Text className="text-[14px] leading-5 text-rose-700">{editError}</Text>
                </View>
              ) : null}

              <OnboardingButton
                disabled={isSaving}
                label={isSaving ? 'Saving…' : 'Save Changes'}
                onPress={() => { void handleSaveEdit(); }}
              />

              <Pressable
                className="items-center py-2"
                disabled={isSaving}
                onPress={() => {
                  // Reset fields to current saved values on cancel
                  setEditAmount(String(detail.expense.amount));
                  setEditCategory(detail.expense.category);
                  setEditDescription(detail.expense.description ?? '');
                  setEditError('');
                  setIsEditing(false);
                }}
                style={({ pressed }) => ({ opacity: isSaving ? 0.5 : pressed ? 0.75 : 1 })}>
                <Text className="text-[14px] text-muted">Cancel</Text>
              </Pressable>
            </>
          )}

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
