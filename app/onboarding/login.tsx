import { Pressable, Text, View } from 'react-native';
import { type Href, Redirect, useRouter } from 'expo-router';
import { useState } from 'react';

import { OnboardingButton } from '@/components/onboarding/button';
import { OnboardingShell } from '@/components/onboarding/shell';
import { OnboardingTextField } from '@/components/onboarding/text-field';
import { loginUser } from '@/lib/auth-api';
import { hasPersistentAuthSession, setPersistentAuthToken } from '@/lib/auth-session';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const canContinue = email.trim().length > 0 && password.trim().length > 0;

  if (hasPersistentAuthSession()) {
    return <Redirect href={'/(tabs)' as Href} />;
  }

  const handleLogin = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!normalizedEmail || !trimmedPassword) {
      setErrorMessage('Enter your email and password to continue.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');

      const response = await loginUser({
        email: normalizedEmail,
        password: trimmedPassword,
      });

      await setPersistentAuthToken(response.token);
      router.replace('/(tabs)' as Href);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to sign in right now. Please try again.';

      if (message.toLowerCase().includes('verify your email')) {
        router.push({
          pathname: '/onboarding/verify-email',
          params: { email: normalizedEmail },
        });
        return;
      }

      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <OnboardingShell
      footer={
        <Pressable
          className="items-center"
          onPress={() => router.push('/onboarding/signup' as Href)}
          style={({ pressed }) => ({
            opacity: pressed ? 0.72 : 1,
          })}>
          <Text className="text-center text-[14px] text-muted">
            Don&apos;t have an account? <Text className="font-semibold text-brand-700">Sign Up</Text>
          </Text>
        </Pressable>
      }
      title="Welcome !"
      subtitle="Sign in to get started">
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
        placeholder="Enter here"
        secureTextEntry
        value={password}
      />

      <Pressable
        className="self-end"
        onPress={() => router.push('/onboarding/forgot-password' as Href)}
        style={({ pressed }) => ({
          opacity: pressed ? 0.72 : 1,
        })}>
        <Text className="text-[15px] font-medium text-brand-700">Forgot Password?</Text>
      </Pressable>

      {errorMessage ? (
        <View className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
          <Text className="text-[14px] leading-5 text-rose-700">{errorMessage}</Text>
        </View>
      ) : null}

      <OnboardingButton
        className="mt-10"
        disabled={!canContinue || isSubmitting}
        label={isSubmitting ? 'Signing In...' : 'Continue'}
        onPress={() => {
          void handleLogin();
        }}
      />
    </OnboardingShell>
  );
}
