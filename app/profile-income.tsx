import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { OnboardingButton } from '@/components/onboarding/button';
import { OnboardingTextField } from '@/components/onboarding/text-field';
import { DetailShell } from '@/components/profile/detail-shell';
import { getCurrentUser, updateCurrentUser } from '@/lib/auth-api';
import { getOnboardingAuthToken } from '@/lib/auth-session';

export default function ProfileIncomeScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const [income, setIncome] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    const token = getOnboardingAuthToken();

    if (!token) {
      setErrorMessage('Your session expired. Please sign in again.');
      setIsLoading(false);
      return;
    }

    let active = true;

    const loadIncome = async () => {
      try {
        setIsLoading(true);
        setErrorMessage('');

        const response = await getCurrentUser(token);

        if (!active) {
          return;
        }

        setIncome(
          response.user.monthlyIncome
            ? response.user.monthlyIncome.toLocaleString('en-NG', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            : '',
        );
      } catch (error) {
        if (!active) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : 'Unable to load your income.');
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadIncome();

    return () => {
      active = false;
    };
  }, [isFocused]);

  const handleSaveIncome = async () => {
    const token = getOnboardingAuthToken();
    const normalizedIncome = income.trim().replace(/,/g, '');
    const parsedIncome = Number(normalizedIncome);

    if (!token) {
      setErrorMessage('Your session expired. Please sign in again.');
      return;
    }

    if (!normalizedIncome || Number.isNaN(parsedIncome) || parsedIncome < 0) {
      setErrorMessage('Enter a valid monthly income.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage('');

      await updateCurrentUser(token, {
        monthlyIncome: parsedIncome,
      });

      router.back();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save your income.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DetailShell
      subtitle="This helps us provide personalized insights and budget recommendations."
      title="What's your monthly income?">
      {isLoading ? (
        <View className="items-center gap-4 py-16">
          <ActivityIndicator color="#0E9B10" size="large" />
          <Text className="text-[15px] text-muted">Loading your monthly income...</Text>
        </View>
      ) : (
        <OnboardingTextField
          keyboardType="numeric"
          label="Monthly Salary"
          onChangeText={setIncome}
          placeholder="0.00"
          prefix="NGN"
          value={income}
        />
      )}

      {errorMessage ? (
        <View className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
          <Text className="text-[14px] leading-5 text-rose-700">{errorMessage}</Text>
        </View>
      ) : null}

      <OnboardingButton
        className="mt-6"
        disabled={isLoading || isSaving}
        label={isSaving ? 'Saving...' : 'Save'}
        onPress={() => {
          void handleSaveIncome();
        }}
      />
    </DetailShell>
  );
}
