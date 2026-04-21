import { Feather } from '@expo/vector-icons';
import { type Href, Redirect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Image, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OnboardingButton } from '@/components/onboarding/button';
import { hasPersistentAuthSession } from '@/lib/auth-session';

function HeroCard() {
  return (
    <View className="min-h-[520px] overflow-hidden rounded-[34px] bg-brand-600 px-7 pt-10">
      <View
        className="absolute rounded-full -left-16 top-2 h-44 w-44"
        style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
      />
      <View
        className="absolute rounded-full -right-10 top-12 h-36 w-36"
        style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
      />
      <View
        className="absolute w-40 h-40 rounded-full -left-8 bottom-16"
        style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
      />
      <View
        className="absolute rounded-full right-6 bottom-28 h-28 w-28"
        style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
      />

      <Text className="max-w-[245px] text-[44px] font-semibold leading-[52px] tracking-tight text-white">
        Take{'\n'}Control of{'\n'}Your <Text className="text-[#FFE100]">Money.</Text>
      </Text>

      <View className="items-center mt-auto">
        <Image
          resizeMode="contain"
          source={require('../../assets/images/money.png')}
          style={{ width: 290, height: 255 }}
        />
      </View>
    </View>
  );
}

export default function OnboardingStartScreen() {
  const router = useRouter();

  if (hasPersistentAuthSession()) {
    return <Redirect href={'/(tabs)' as Href} />;
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="dark" />

      <View className="flex-1 px-6 pt-4 pb-8">
        <View className="justify-center flex-1">
          <HeroCard />
        </View>

        <View className="gap-3">
        
       
          <OnboardingButton
            icon={<Feather color="#101828" name="mail" size={18} />}
            label="Sign up with Email"
            onPress={() => router.push('/onboarding/signup')}
            variant="outline"
          />
        </View>

        <Pressable
          className="items-center mt-6"
          onPress={() => router.push('/onboarding/login' as Href)}
          style={({ pressed }) => ({
            opacity: pressed ? 0.7 : 1,
          })}>
          <Text className="text-[14px] text-muted">
            Already have an account? <Text className="font-semibold text-brand-700">Log in</Text>
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
