import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, radius } from '@theme/index';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padded?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, style, padded = true }) => {
  return (
    <View style={[styles.card, padded && styles.padded, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  padded: {
    padding: spacing.lg,
  },
});