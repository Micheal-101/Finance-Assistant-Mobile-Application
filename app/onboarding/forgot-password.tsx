import { useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { type Href, useRouter } from 'expo-router';

import { OnboardingButton } from '@/components/onboarding/button';
import { OnboardingShell } from '@/components/onboarding/shell';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [digits, setDigits] = useState(['0', '3', '', '', '', '']);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const handleDigitChange = (index: number, input: string) => {
    const value = input.replace(/\D/g, '').slice(-1);

    setDigits((current) => {
      const updated = [...current];
      updated[index] = value;
      return updated;
    });

    if (value && index < inputRefs.current.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleBackspace = (index: number, key: string) => {
    if (key !== 'Backspace') {
      return;
    }

    if (digits[index]) {
      return;
    }

    if (index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const canContinue = digits.every((digit) => digit.length === 1);

  return (
    <OnboardingShell
      title="Verify Your Email"
      subtitle="We&apos;ve sent a code to (example@gmail.com)">
      <View className="flex-row justify-between gap-2">
        {digits.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => {
              inputRefs.current[index] = ref;
            }}
            className={[
              'h-14 w-12 rounded-2xl border text-center text-xl font-semibold text-ink',
              index === 1 ? 'border-brand-600 bg-brand-50' : 'border-line bg-white',
            ].join(' ')}
            keyboardType="number-pad"
            maxLength={1}
            onChangeText={(value) => handleDigitChange(index, value)}
            onKeyPress={({ nativeEvent }) => handleBackspace(index, nativeEvent.key)}
            placeholder="0"
            placeholderTextColor="#D0D5DD"
            value={digit}
          />
        ))}
      </View>

      <Text className="text-[14px] text-muted">
        Didn&apos;t get a code? <Text className="font-semibold text-brand-700">Resend</Text>
      </Text>

      <OnboardingButton
        className="mt-8"
        disabled={!canContinue}
        label="Continue"
        onPress={() => router.push('/onboarding/reset-password' as Href)}
      />
    </OnboardingShell>
  );
}
