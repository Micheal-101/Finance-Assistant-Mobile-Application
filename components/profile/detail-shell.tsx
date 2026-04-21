import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';

type DetailShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actionLabel?: string;
  onActionPress?: () => void;
  backHref?: Href;
};

export function DetailShell({
  title,
  subtitle,
  children,
  actionLabel,
  onActionPress,
  backHref,
}: DetailShellProps) {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View className="border-b border-line px-6 pb-6 pt-5">
            <View className="flex-row items-center justify-between">
              <Pressable
                accessibilityLabel="Go back"
                className="h-10 w-10 items-center justify-center rounded-full"
                onPress={() => {
                  if (backHref) {
                    router.replace(backHref);
                    return;
                  }

                  router.back();
                }}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.72 : 1,
                })}>
                <Ionicons color="#111827" name="chevron-back" size={24} />
              </Pressable>

              {actionLabel ? (
                <Pressable
                  className="px-1 py-1"
                  onPress={onActionPress}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.72 : 1,
                  })}>
                  <Text className="text-[16px] font-semibold text-brand-700">{actionLabel}</Text>
                </Pressable>
              ) : (
                <View className="w-10" />
              )}
            </View>

            <View className="mt-4">
              <Text className="text-[24px] font-semibold tracking-tight text-ink">{title}</Text>
              {subtitle ? (
                <Text className="mt-2 text-[15px] leading-6 text-muted">{subtitle}</Text>
              ) : null}
            </View>
          </View>

          <View className="px-6 pt-7">{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
