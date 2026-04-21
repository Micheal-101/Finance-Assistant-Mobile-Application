import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';

type OnboardingShellProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  backHref?: Href;
  footer?: ReactNode;
  bodyClassName?: string;
};

export function OnboardingShell({
  children,
  title,
  subtitle,
  showBack = false,
  backHref,
  footer,
  bodyClassName,
}: OnboardingShellProps) {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="flex-1 px-6 pb-8 pt-2">
            {showBack ? (
              <Pressable
                accessibilityLabel="Go back"
                className="h-11 w-11 items-center justify-center rounded-full border border-line"
                onPress={() => {
                  if (backHref) {
                    router.replace(backHref);
                    return;
                  }

                  router.back();
                }}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.75 : 1,
                })}>
                <Ionicons name="chevron-back" size={20} color="#101828" />
              </Pressable>
            ) : (
              <View className="h-11" />
            )}

            {title ? (
              <View className="mt-5 gap-2">
                <Text className="text-[30px] font-semibold tracking-tight text-ink">{title}</Text>
                {subtitle ? (
                  <Text className="text-[14px] leading-6 text-muted">{subtitle}</Text>
                ) : null}
              </View>
            ) : null}

            <View className={['flex-1 gap-6', title ? 'mt-8' : '', bodyClassName ?? ''].join(' ')}>
              {children}
            </View>

            {footer ? <View className="mt-6">{footer}</View> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
