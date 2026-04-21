import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type PlaceholderScreenProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PlaceholderScreen({
  eyebrow,
  title,
  description,
}: PlaceholderScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6 pb-8 pt-4">
        <Text className="text-sm font-medium uppercase tracking-[2px] text-brand-700">
          {eyebrow}
        </Text>
        <Text className="mt-2 text-[30px] font-semibold tracking-tight text-ink">{title}</Text>
        <Text className="mt-3 text-[15px] leading-7 text-muted">{description}</Text>

        <View className="mt-8 rounded-[28px] bg-mist px-5 py-6">
          <Text className="text-[14px] font-medium text-ink">Placeholder</Text>
          <Text className="mt-2 text-[14px] leading-6 text-muted">
            This tab is ready for the next screen once you want to continue beyond the home page.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
