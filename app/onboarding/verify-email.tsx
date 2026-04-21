import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { OnboardingButton } from '@/components/onboarding/button';
import { OnboardingShell } from '@/components/onboarding/shell';
import { getVerificationStatus, resendVerificationEmail } from '@/lib/auth-api';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    email?: string;
    status?: 'success' | 'invalid';
    devVerificationUrl?: string;
  }>();
  const email = useMemo(
    () => (typeof params.email === 'string' ? params.email : ''),
    [params.email],
  );
  const initialDevUrl =
    typeof params.devVerificationUrl === 'string' ? params.devVerificationUrl : undefined;
  const [status, setStatus] = useState<'idle' | 'success' | 'invalid'>(
    params.status === 'success' ? 'success' : params.status === 'invalid' ? 'invalid' : 'idle',
  );
  const [devVerificationUrl, setDevVerificationUrl] = useState(initialDevUrl);
  const [message, setMessage] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (params.status === 'success') {
      setStatus('success');
      setMessage('Your email has been verified successfully.');
      return;
    }

    if (params.status === 'invalid') {
      setStatus('invalid');
      setMessage('That verification link is invalid or expired. Request a new one below.');
    }
  }, [params.status]);

  const handleCheckStatus = async () => {
    if (!email || isChecking) {
      return;
    }

    try {
      setIsChecking(true);
      setMessage('');

      const response = await getVerificationStatus(email);

      if (response.verified) {
        setStatus('success');
        setMessage('Your email has been verified successfully.');
        return;
      }

      setStatus('idle');
      setMessage('Your email is not verified yet. Click the link in your inbox and try again.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to check verification status.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleResend = async () => {
    if (!email || isResending) {
      return;
    }

    try {
      setIsResending(true);
      const response = await resendVerificationEmail(email);
      setDevVerificationUrl(response.devVerificationUrl);
      setStatus(response.verified ? 'success' : 'idle');
      setMessage(response.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to resend verification email.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <OnboardingShell
      showBack
      title="Verify Your Email"
      subtitle={
        email
          ? `We've sent a verification link to ${email}. Open the email and tap the link to continue.`
          : 'We sent a verification link to your email address. Open it and tap the link to continue.'
      }>
      <View className="items-center gap-5 rounded-[28px] bg-brand-50 px-6 py-8">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-white">
          <MaterialCommunityIcons
            color={status === 'success' ? '#0E9B10' : status === 'invalid' ? '#D92D20' : '#0E9B10'}
            name={status === 'success' ? 'email-check-outline' : 'email-outline'}
            size={38}
          />
        </View>

        <View className="items-center gap-2">
          <Text className="text-center text-[20px] font-semibold text-ink">
            {status === 'success' ? 'Email Verified' : 'Check Your Inbox'}
          </Text>
          <Text className="text-center text-[14px] leading-6 text-muted">
            {status === 'success'
              ? 'Everything looks good. You can continue with onboarding now.'
              : 'The verification email may take a minute. Make sure to check spam or promotions too.'}
          </Text>
        </View>
      </View>

      {message ? (
        <View
          className={[
            'rounded-2xl px-4 py-3',
            status === 'invalid' ? 'border border-rose-200 bg-rose-50' : 'bg-neutral-50 border border-line',
          ].join(' ')}>
          <Text
            className={[
              'text-[14px] leading-5',
              status === 'invalid' ? 'text-rose-700' : 'text-muted',
            ].join(' ')}>
            {message}
          </Text>
        </View>
      ) : null}

      <OnboardingButton
        className="mt-2"
        label={status === 'success' ? 'Continue' : isChecking ? 'Checking...' : "I've Verified My Email"}
        disabled={isChecking}
        onPress={() =>
          status === 'success' ? router.push('/onboarding/notifications') : void handleCheckStatus()
        }
      />

      <OnboardingButton
        label={isResending ? 'Sending...' : 'Resend Verification Email'}
        disabled={!email || isResending}
        onPress={() => {
          void handleResend();
        }}
        variant="outline"
      />

      <OnboardingButton
        label="Open Email App"
        onPress={() => {
          void Linking.openURL('mailto:');
        }}
        variant="ghost"
      />

      {devVerificationUrl ? (
        <Pressable
          className="items-center"
          onPress={() => {
            void Linking.openURL(devVerificationUrl);
          }}
          style={({ pressed }) => ({
            opacity: pressed ? 0.72 : 1,
          })}>
          <Text className="text-center text-[14px] text-brand-700">
            Open Development Verification Link
          </Text>
        </Pressable>
      ) : null}
    </OnboardingShell>
  );
}
