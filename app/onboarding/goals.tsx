import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useState } from 'react';

import { OnboardingButton } from '@/components/onboarding/button';
import { OnboardingShell } from '@/components/onboarding/shell';
import { type PrimaryGoal, updateCurrentUser } from '@/lib/auth-api';
import { getOnboardingAuthToken } from '@/lib/auth-session';

const goalOptions = [
  {
    id: 'control',
    title: 'Control Spending',
    description: "Get alerts when you're spending too much and stay ahead of your habits.",
  },
  {
    id: 'save',
    title: 'Save More Money',
    description: 'Identify opportunities to save and invest based on your lifestyle.',
  },
  {
    id: 'budget',
    title: 'Budget Planning',
    description: 'Create and stick to a realistic budget that fits your monthly cash flow.',
  },
] as const satisfies readonly {
  id: PrimaryGoal;
  title: string;
  description: string;
}[];

export default function GoalsScreen() {
  const router = useRouter();
  const [selectedGoal, setSelectedGoal] = useState<PrimaryGoal>(goalOptions[0].id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleContinue = async () => {
    const token = getOnboardingAuthToken();

    if (!token) {
      setErrorMessage('Your onboarding session expired. Please sign up again.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');

      await updateCurrentUser(token, {
        primaryGoal: selectedGoal,
      });

      router.push('/onboarding/expense');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save your goal right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <OnboardingShell
      showBack
      title="What do you want FinAssist to help you with?"
      subtitle="Select the option that fits your focus right now. We'll personalize the experience around it.">
      <View className="gap-3">
        {goalOptions.map((goal) => {
          const active = selectedGoal === goal.id;

          return (
            <Pressable
              key={goal.id}
              className={[
                'flex-row gap-4 rounded-2xl border px-4 py-4',
                active ? 'border-brand-600 bg-brand-50' : 'border-line bg-white',
              ].join(' ')}
              onPress={() => setSelectedGoal(goal.id)}
              style={({ pressed }) => ({
                opacity: pressed ? 0.9 : 1,
              })}>
              <View
                className={[
                  'mt-1 h-5 w-5 items-center justify-center rounded-full border',
                  active ? 'border-brand-600 bg-brand-600' : 'border-slate-300 bg-white',
                ].join(' ')}>
                {active ? <Ionicons color="#FFFFFF" name="checkmark" size={12} /> : null}
              </View>

              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-ink">{goal.title}</Text>
                <Text className="mt-1 text-[13px] leading-5 text-muted">{goal.description}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {errorMessage ? (
        <View className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
          <Text className="text-[14px] leading-5 text-rose-700">{errorMessage}</Text>
        </View>
      ) : null}

      <OnboardingButton
        className="mt-2"
        disabled={isSubmitting}
        label={isSubmitting ? 'Saving...' : 'Continue'}
        onPress={() => {
          void handleContinue();
        }}
      />
    </OnboardingShell>
  );
}
