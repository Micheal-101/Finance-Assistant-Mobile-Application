import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { useState } from 'react';

import { OnboardingButton } from '@/components/onboarding/button';
import { OnboardingShell } from '@/components/onboarding/shell';
import { requestNotificationPermission, scheduleOnboardingNotification } from '@/lib/notifications';

const features = [
  {
    title: 'Overspending Warnings',
    description: "Get notified when you're about to exceed your budget.",
  },
  {
    title: 'Smart Insights',
    description: 'Receive personalized tips to improve your finances.',
  },
];

export default function NotificationsScreen() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const moveToIncome = () => {
    router.push('/onboarding/income');
  };

  const handleAllowNotifications = async () => {
    if (isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      setMessage('');

      const permission = await requestNotificationPermission();

      if (!permission.granted) {
        setMessage('Notifications are off for now. You can enable them later in your phone settings.');
        moveToIncome();
        return;
      }

      await scheduleOnboardingNotification();
      moveToIncome();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'We could not enable notifications right now, but you can continue onboarding.',
      );
      moveToIncome();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <OnboardingShell bodyClassName="justify-between" showBack>
      <View className="items-center gap-6 pt-8">
        <View className="h-28 w-28 items-center justify-center rounded-full bg-brand-50">
          <MaterialCommunityIcons color="#0E9B10" name="bell-ring-outline" size={42} />
        </View>

        <View className="items-center gap-3">
          <Text className="text-center text-[28px] font-semibold leading-9 tracking-tight text-ink">
            Stay On Track With{'\n'}FinAssist
          </Text>
          <Text className="max-w-[290px] text-center text-[14px] leading-6 text-muted">
            Allow notifications so FinAssist can warn you before overspending and send
            helpful financial reminders.
          </Text>
        </View>
      </View>

      <View className="gap-5">
        {features.map((feature) => (
          <View key={feature.title} className="flex-row gap-3">
            <View className="mt-1 h-6 w-6 items-center justify-center rounded-full bg-brand-50">
              <Ionicons color="#0E9B10" name="checkmark" size={14} />
            </View>

            <View className="flex-1">
              <Text className="text-[15px] font-semibold text-ink">{feature.title}</Text>
              <Text className="mt-1 text-[13px] leading-5 text-muted">{feature.description}</Text>
            </View>
          </View>
        ))}
      </View>

      {message ? (
        <View className="rounded-2xl border border-line bg-neutral-50 px-4 py-3">
          <Text className="text-[14px] leading-5 text-muted">{message}</Text>
        </View>
      ) : null}

      <View className="gap-3">
        <OnboardingButton
          label={isSubmitting ? 'Setting Up...' : 'Allow Notifications'}
          onPress={() => {
            void handleAllowNotifications();
          }}
        />
        <OnboardingButton
          label="Not Now"
          onPress={moveToIncome}
          variant="ghost"
        />
      </View>
    </OnboardingShell>
  );
}
