import { Ionicons } from '@expo/vector-icons';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { OnboardingButton } from '@/components/onboarding/button';
import { OnboardingShell } from '@/components/onboarding/shell';
import { OnboardingTextField } from '@/components/onboarding/text-field';
import { createExpense, type ExpenseCategory } from '@/lib/auth-api';
import { getOnboardingAuthToken } from '@/lib/auth-session';
import { invalidateCacheByPrefix } from '@/lib/cache';

const MAX_AMOUNT = 10_000_000;
const MAX_DESCRIPTION = 200;

const categories = [
  { id: 'groceries', label: 'Groceries', icon: 'basket-outline', color: '#F59E0B' },
  { id: 'transport', label: 'Transport', icon: 'bus-outline', color: '#EF4444' },
  { id: 'utilities', label: 'Utilities', icon: 'flash-outline', color: '#8B5CF6' },
  { id: 'dining', label: 'Dining', icon: 'restaurant-outline', color: '#3B82F6' },
  { id: 'entertainment', label: 'Fun', icon: 'game-controller-outline', color: '#EC4899' },
  { id: 'health', label: 'Health', icon: 'heart-outline', color: '#F43F5E' },
] as const satisfies readonly {
  id: ExpenseCategory;
  label: string;
  icon: string;
  color: string;
}[];

function validateAmount(raw: string): { value: number | null; error: string } {
  const normalized = raw.trim().replace(/,/g, '');

  if (!normalized) {
    return { value: null, error: '' }; // empty is allowed (skip)
  }

  const parsed = Number(normalized);

  if (Number.isNaN(parsed) || parsed <= 0) {
    return { value: null, error: 'Enter a valid amount greater than zero.' };
  }

  if (parsed > MAX_AMOUNT) {
    return { value: null, error: `Amount cannot exceed £${MAX_AMOUNT.toLocaleString('en-GB')}.` };
  }

  return { value: parsed, error: '' };
}

export default function FirstExpenseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    returnTo?: string;
    mode?: 'add';
  }>();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory>(categories[0].id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const returnTo =
    typeof params.returnTo === 'string' && params.returnTo.length > 0
      ? params.returnTo
      : '/(tabs)';
  const isAddMode = params.mode === 'add';

  const finishOnboarding = () => {
    router.replace(returnTo as Href);
  };

  const handlePrimaryAction = async () => {
    const { value: parsedAmount, error: amountError } = validateAmount(amount);

    if (amountError) {
      setErrorMessage(amountError);
      return;
    }

    // No amount entered — skip silently (only in onboarding flow)
    if (parsedAmount === null) {
      if (isAddMode) {
        setErrorMessage('Please enter an amount.');
        return;
      }
      finishOnboarding();
      return;
    }

    if (description.trim().length > MAX_DESCRIPTION) {
      setErrorMessage(`Note must be ${MAX_DESCRIPTION} characters or fewer.`);
      return;
    }

    const token = getOnboardingAuthToken();

    if (!token) {
      setErrorMessage('Your session expired. Please sign up again.');
      return;
    }

    const selectedCategoryData = categories.find((c) => c.id === selectedCategory);

    try {
      setIsSubmitting(true);
      setErrorMessage('');

      await createExpense(token, {
        category: selectedCategory,
        amount: parsedAmount,
        description: description.trim() || (selectedCategoryData ? `${selectedCategoryData.label} expense` : undefined),
      });

      // Invalidate all analytics caches so home/expenses/summary refresh on next visit
      invalidateCacheByPrefix('dashboard:');
      invalidateCacheByPrefix('expenses:');
      invalidateCacheByPrefix('monthly-summary:');
      invalidateCacheByPrefix('overspending-alerts:');
      invalidateCacheByPrefix('category-analysis:');

      finishOnboarding();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to save your expense right now.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <OnboardingShell
      showBack
      title={isAddMode ? 'Add Expense' : 'Log Your First Expense'}
      subtitle={
        isAddMode
          ? 'Capture a new expense and keep your monthly summary up to date.'
          : 'Optional, but it helps us understand your spending patterns right away.'
      }>
      <OnboardingTextField
        keyboardType="decimal-pad"
        label="Amount"
        maxLength={12}
        onChangeText={(text) => {
          setAmount(text);
          setErrorMessage('');
        }}
        placeholder="0.00"
        prefix="£"
        value={amount}
      />

      <OnboardingTextField
        label="Note (optional)"
        maxLength={MAX_DESCRIPTION}
        onChangeText={(text) => {
          setDescription(text);
          setErrorMessage('');
        }}
        placeholder="What was this for?"
        value={description}
      />

      <View className="gap-3">
        <Text className="text-[13px] font-medium text-slate-700">Category</Text>
        <View className="flex-row flex-wrap justify-between gap-y-3">
          {categories.map((category) => {
            const active = selectedCategory === category.id;

            return (
              <Pressable
                key={category.id}
                className={[
                  'w-[31%] rounded-2xl border px-3 py-4',
                  active ? 'border-brand-600 bg-brand-50' : 'border-line bg-slate-50',
                ].join(' ')}
                disabled={isSubmitting}
                onPress={() => setSelectedCategory(category.id)}
                style={({ pressed }) => ({
                  opacity: isSubmitting ? 0.6 : pressed ? 0.88 : 1,
                })}>
                <View className="items-center gap-3">
                  <View
                    className="h-10 w-10 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${category.color}18` }}>
                    <Ionicons color={category.color} name={category.icon as never} size={20} />
                  </View>
                  <Text className="text-center text-[12px] font-medium text-ink">
                    {category.label}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {errorMessage ? (
        <View className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
          <Text className="text-[14px] leading-5 text-rose-700">{errorMessage}</Text>
        </View>
      ) : null}

      <View className="gap-3">
        <OnboardingButton
          disabled={isSubmitting}
          label={isSubmitting ? 'Saving...' : amount.trim() ? 'Save Expense' : 'Continue'}
          onPress={() => {
            void handlePrimaryAction();
          }}
        />
        <Pressable
          className="items-center py-2"
          disabled={isSubmitting}
          onPress={finishOnboarding}
          style={({ pressed }) => ({
            opacity: isSubmitting ? 0.5 : pressed ? 0.75 : 1,
          })}>
          <Text className="text-[14px] text-muted">{isAddMode ? 'Cancel' : 'Skip for now'}</Text>
        </Pressable>
      </View>
    </OnboardingShell>
  );
}
