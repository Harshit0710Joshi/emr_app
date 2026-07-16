import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors, typography, spacing, radius } from '@theme/index';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
}) => {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
      style={[
        styles.base,
        sizeStyles[size],
        variantStyles[variant],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' ? colors.primary : colors.textInverse}
          size="small"
        />
      ) : (
        <Text style={[styles.label, textVariantStyles[variant], textSizeStyles[size]]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontWeight: typography.weight.semibold,
  },
});

const sizeStyles: Record<ButtonSize, ViewStyle> = {
  sm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  md: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  lg: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xl },
};

const textSizeStyles: Record<ButtonSize, TextStyle> = {
  sm: { fontSize: typography.size.sm },
  md: { fontSize: typography.size.base },
  lg: { fontSize: typography.size.lg },
};

const variantStyles: Record<ButtonVariant, ViewStyle> = {
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.primaryLight },
  danger: { backgroundColor: colors.danger },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
};

const textVariantStyles: Record<ButtonVariant, TextStyle> = {
  primary: { color: colors.textInverse },
  secondary: { color: colors.primaryDark },
  danger: { color: colors.textInverse },
  outline: { color: colors.primary },
};