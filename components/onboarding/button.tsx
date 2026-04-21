import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

type OnboardingButtonProps = {
  label: string;
  onPress: () => void;
  icon?: ReactNode;
  variant?: 'primary' | 'outline' | 'ghost';
  disabled?: boolean;
  className?: string;
};

const containerStyles = {
  primary: 'bg-brand-600',
  outline: 'border border-line bg-white',
  ghost: 'bg-transparent',
} as const;

const textStyles = {
  primary: 'text-white',
  outline: 'text-ink',
  ghost: 'text-ink',
} as const;

export function OnboardingButton({
  label,
  onPress,
  icon,
  variant = 'primary',
  disabled = false,
  className,
}: OnboardingButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      className={[
        'h-14 flex-row items-center justify-center gap-3 rounded-2xl px-5',
        containerStyles[variant],
        disabled ? 'opacity-50' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={({ pressed }) => ({
        opacity: disabled ? 0.5 : pressed ? 0.9 : 1,
      })}>
      {icon ? <View>{icon}</View> : null}
      <Text className={['text-[15px] font-semibold', textStyles[variant]].join(' ')}>{label}</Text>
    </Pressable>
  );
}
