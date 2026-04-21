import { useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { OnboardingButton } from '@/components/onboarding/button';
import { OnboardingTextField } from '@/components/onboarding/text-field';
import { DetailShell } from '@/components/profile/detail-shell';
import { changePassword } from '@/lib/auth-api';
import { getOnboardingAuthToken } from '@/lib/auth-session';

export default function ProfileChangePasswordScreen() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleChangePassword = async () => {
    const token = getOnboardingAuthToken();
    const trimmedCurrentPassword = currentPassword.trim();
    const trimmedNewPassword = newPassword.trim();
    const trimmedConfirmPassword = confirmPassword.trim();

    if (!token) {
      setErrorMessage('Your session expired. Please sign in again.');
      return;
    }

    if (!trimmedCurrentPassword || !trimmedNewPassword || !trimmedConfirmPassword) {
      setErrorMessage('Fill in all password fields to continue.');
      return;
    }

    if (trimmedNewPassword.length < 6) {
      setErrorMessage('Your new password must be at least 6 characters long.');
      return;
    }

    if (trimmedNewPassword !== trimmedConfirmPassword) {
      setErrorMessage('New password and confirm password do not match.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');

      await changePassword(token, {
        currentPassword: trimmedCurrentPassword,
        newPassword: trimmedNewPassword,
      });

      router.back();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to change your password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DetailShell title="Change Password">
      <View className="gap-5">
        <OnboardingTextField
          label="Current Password"
          onChangeText={setCurrentPassword}
          placeholder="Enter here"
          secureTextEntry
          value={currentPassword}
        />

        <OnboardingTextField
          label="New Password"
          onChangeText={setNewPassword}
          placeholder="Enter here"
          secureTextEntry
          value={newPassword}
        />

        <OnboardingTextField
          label="Confirm Password"
          onChangeText={setConfirmPassword}
          placeholder="Enter here"
          secureTextEntry
          value={confirmPassword}
        />
      </View>

      {errorMessage ? (
        <View className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
          <Text className="text-[14px] leading-5 text-rose-700">{errorMessage}</Text>
        </View>
      ) : null}

      <OnboardingButton
        className="mt-8"
        disabled={isSubmitting}
        label={isSubmitting ? 'Changing...' : 'Change'}
        onPress={() => {
          void handleChangePassword();
        }}
      />
    </DetailShell>
  );
}
