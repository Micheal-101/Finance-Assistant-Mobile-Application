import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, TextInput, View } from 'react-native';

import { DetailShell } from '@/components/profile/detail-shell';
import { getCurrentUser, updateCurrentUser } from '@/lib/auth-api';
import { getOnboardingAuthToken } from '@/lib/auth-session';

export default function MyAccountScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const [name, setName] = useState('');
  const [countryCode, setCountryCode] = useState('+234');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
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

    const loadUser = async () => {
      try {
        setIsLoading(true);
        setErrorMessage('');

        const response = await getCurrentUser(token);

        if (!active) {
          return;
        }

        setName(response.user.fullName ?? '');
        setCountryCode(response.user.phoneCountryCode ?? '+234');
        setPhone(response.user.phoneNumber ?? '');
        setEmail(response.user.email ?? '');
      } catch (error) {
        if (!active) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : 'Unable to load your account details.',
        );
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadUser();

    return () => {
      active = false;
    };
  }, [isFocused]);

  const handleSave = async () => {
    const token = getOnboardingAuthToken();
    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCountryCode = countryCode.trim();
    const normalizedPhone = phone.trim();

    if (!token) {
      setErrorMessage('Your session expired. Please sign in again.');
      return;
    }

    if (!normalizedName || !normalizedEmail) {
      setErrorMessage('Full name and email are required.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage('');

      await updateCurrentUser(token, {
        fullName: normalizedName,
        email: normalizedEmail,
        phoneCountryCode: normalizedCountryCode || undefined,
        phoneNumber: normalizedPhone || undefined,
      });

      router.back();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to save your account details.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DetailShell
      actionLabel={isSaving ? 'Saving...' : 'Save'}
      onActionPress={() => {
        void handleSave();
      }}
      title="My Account">
      <View className="items-center">
        <View className="relative">
          <Image
            resizeMode="cover"
            source={require('../assets/images/icon.png')}
            className="h-28 w-28 rounded-full"
          />
          <Pressable
            className="absolute bottom-1 right-0 h-8 w-8 items-center justify-center rounded-full bg-[#F59E0B]"
            disabled={isLoading || isSaving}
            style={({ pressed }) => ({
              opacity: isLoading || isSaving ? 0.5 : pressed ? 0.85 : 1,
            })}>
            <Ionicons color="#FFFFFF" name="pencil" size={16} />
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <View className="items-center gap-4 py-16">
          <ActivityIndicator color="#0E9B10" size="large" />
          <Text className="text-[15px] text-muted">Loading your account details...</Text>
        </View>
      ) : (
        <View className="mt-8 gap-3">
          <TextInput
            className="h-14 rounded-2xl border border-line bg-white px-4 text-[15px] text-ink"
            editable={!isSaving}
            onChangeText={setName}
            placeholder="Full Name"
            placeholderTextColor="#98A2B3"
            value={name}
          />

          <View className="flex-row gap-2">
            <TextInput
              className="h-14 w-[22%] rounded-2xl border border-line bg-white px-4 text-[15px] text-ink"
              editable={!isSaving}
              onChangeText={setCountryCode}
              placeholder="+234"
              placeholderTextColor="#98A2B3"
              value={countryCode}
            />
            <TextInput
              className="h-14 flex-1 rounded-2xl border border-line bg-white px-4 text-[15px] text-ink"
              editable={!isSaving}
              keyboardType="phone-pad"
              onChangeText={setPhone}
              placeholder="Phone Number"
              placeholderTextColor="#98A2B3"
              value={phone}
            />
          </View>

          <TextInput
            autoCapitalize="none"
            className="h-14 rounded-2xl border border-line bg-white px-4 text-[15px] text-ink"
            editable={!isSaving}
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="Email Address"
            placeholderTextColor="#98A2B3"
            value={email}
          />
        </View>
      )}

      {errorMessage ? (
        <View className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
          <Text className="text-[14px] leading-5 text-rose-700">{errorMessage}</Text>
        </View>
      ) : null}
    </DetailShell>
  );
}
