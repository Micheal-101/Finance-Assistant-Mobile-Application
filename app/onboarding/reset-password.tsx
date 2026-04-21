import { useState } from 'react';
import { type Href, useRouter } from 'expo-router';

import { OnboardingButton } from '@/components/onboarding/button';
import { OnboardingShell } from '@/components/onboarding/shell';
import { OnboardingTextField } from '@/components/onboarding/text-field';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const canContinue = password.trim().length > 0 && confirmPassword.trim().length > 0;

  return (
    <OnboardingShell title="Create New Password">
      <OnboardingTextField
        label="Password"
        onChangeText={setPassword}
        placeholder="Enter here"
        secureTextEntry
        value={password}
      />

      <OnboardingTextField
        label="Confirm Password"
        onChangeText={setConfirmPassword}
        placeholder="Enter here"
        secureTextEntry
        value={confirmPassword}
      />

      <OnboardingButton
        className="mt-12"
        disabled={!canContinue}
        label="Continue"
        onPress={() => router.replace('/onboarding/login' as Href)}
      />
    </OnboardingShell>
  );
}
