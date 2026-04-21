import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { type Href, Redirect, useRouter } from 'expo-router';

import { OnboardingButton } from '@/components/onboarding/button';
import { OnboardingShell } from '@/components/onboarding/shell';
import { OnboardingTextField } from '@/components/onboarding/text-field';
import { registerUser } from '@/lib/auth-api';
import { hasPersistentAuthSession, setOnboardingAuthToken } from '@/lib/auth-session';

export default function SignUpScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canContinue =
    fullName.trim().length > 0 &&
    email.trim().length > 0 &&
    password.trim().length > 0 &&
    confirmPassword.trim().length > 0;

  if (hasPersistentAuthSession()) {
    return <Redirect href={'/(tabs)' as Href} />;
  }

  const handleSignUp = async () => {
    if (!canContinue || isSubmitting) {
      return;
    }

    if (fullName.trim().length < 2) {
      setErrorMessage('Full name must be at least 2 characters.');
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email.trim())) {
      setErrorMessage('Enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');

      const response = await registerUser({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      setOnboardingAuthToken(response.token);

      router.push({
        pathname: '/onboarding/verify-email',
        params: {
          email: response.user.email,
          devVerificationUrl: response.devVerificationUrl,
        },
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create account.');
      console.error('Registration error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <OnboardingShell
      footer={
        <Pressable
          className="items-center"
          onPress={() => router.push('/onboarding/login' as Href)}
          style={({ pressed }) => ({
            opacity: pressed ? 0.72 : 1,
          })}>
          <Text className="text-center text-[14px] text-muted">
            Already have an account? <Text className="font-semibold text-brand-700">Sign in</Text>
          </Text>
        </Pressable>
      }
      showBack
      title="Welcome!"
      subtitle="Sign up to get started.">
      <OnboardingTextField
        autoCapitalize="words"
        label="Full Name"
        onChangeText={setFullName}
        placeholder="Enter here"
        value={fullName}
      />
      <OnboardingTextField
        keyboardType="email-address"
        label="Email Address"
        onChangeText={setEmail}
        placeholder="Enter here"
        value={email}
      />
      <OnboardingTextField
        label="Password"
        onChangeText={setPassword}
        placeholder="Create password"
        secureTextEntry
        value={password}
      />
      <OnboardingTextField
        label="Confirm Password"
        onChangeText={setConfirmPassword}
        placeholder="Re-enter password"
        secureTextEntry
        value={confirmPassword}
      />

      {errorMessage ? (
        <View className="px-4 py-3 border rounded-2xl border-rose-200 bg-rose-50">
          <Text className="text-[14px] leading-5 text-rose-700">{errorMessage}</Text>
        </View>
      ) : null}

      <OnboardingButton
        className="mt-2"
        disabled={!canContinue || isSubmitting}
        label={isSubmitting ? 'Creating Account...' : 'Continue'}
        onPress={handleSignUp}
      />
    </OnboardingShell>
  );
}
