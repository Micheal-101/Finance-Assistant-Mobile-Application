import { useState } from 'react';
import {
  Pressable,
  Text,
  TextInput,
  type KeyboardTypeOptions,
  type TextInputProps,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type OnboardingTextFieldProps = {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  prefix?: string;
  maxLength?: number;
};

export function OnboardingTextField({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  prefix,
  maxLength,
}: OnboardingTextFieldProps) {
  const [hidden, setHidden] = useState(secureTextEntry);

  return (
    <View className="gap-2">
      <Text className="text-[13px] font-medium text-slate-700">{label}</Text>

      <View className="flex-row items-center rounded-2xl border border-line bg-white px-4">
        {prefix ? <Text className="mr-3 text-base text-slate-400">{prefix}</Text> : null}

        <TextInput
          autoCapitalize={autoCapitalize}
          className="h-14 flex-1 text-base text-ink"
          keyboardType={keyboardType}
          maxLength={maxLength}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#98A2B3"
          secureTextEntry={hidden}
          value={value}
        />

        {secureTextEntry ? (
          <Pressable
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            className="h-10 w-10 items-center justify-center"
            onPress={() => setHidden((current) => !current)}
            style={({ pressed }) => ({
              opacity: pressed ? 0.7 : 1,
            })}>
            <Ionicons
              color="#667085"
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={18}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
