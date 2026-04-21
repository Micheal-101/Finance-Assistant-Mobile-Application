import { useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { OnboardingButton } from '@/components/onboarding/button';
import { OnboardingShell } from '@/components/onboarding/shell';
import { OnboardingTextField } from '@/components/onboarding/text-field';
import { updateCurrentUser } from '@/lib/auth-api';
import { getOnboardingAuthToken } from '@/lib/auth-session';

export default function IncomeScreen() {
  const router = useRouter();
  const [income, setIncome] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleContinue = async () => {
    const normalizedIncome = income.trim().replace(/,/g, '');
    const parsedIncome = Number(normalizedIncome);

    if (!normalizedIncome || Number.isNaN(parsedIncome) || parsedIncome < 0) {
      setErrorMessage('Enter a valid monthly income.');
      return;
    }

    const token = getOnboardingAuthToken();

    if (!token) {
      setErrorMessage('Your onboarding session expired. Please sign up again.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');

      await updateCurrentUser(token, {
        monthlyIncome: parsedIncome,
      });

      router.push('/onboarding/goals');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save income right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <OnboardingShell
      showBack
      title="What's your monthly income?"
      subtitle="This helps us provide personalized insights and budget recommendations.">
      <OnboardingTextField
        keyboardType="numeric"
        label="Monthly Salary"
        onChangeText={setIncome}
        placeholder="0.00"
        prefix="NGN"
        value={income}
      />

      {errorMessage ? (
        <View className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
          <Text className="text-[14px] leading-5 text-rose-700">{errorMessage}</Text>
        </View>
      ) : null}

      <OnboardingButton
        className="mt-2"
        disabled={!income.trim() || isSubmitting}
        label={isSubmitting ? 'Saving...' : 'Continue'}
        onPress={() => {
          void handleContinue();
        }}
      />
    </OnboardingShell>
  );
}
