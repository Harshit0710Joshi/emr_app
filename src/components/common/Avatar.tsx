import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, radius } from '@theme/index';

interface AvatarProps {
  name: string;
  size?: number;
}

const getInitials = (name: string) => {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

// Deterministic color based on name, so the same patient always gets the same avatar color
const getColorForName = (name: string) => {
  const palette = [colors.primary, colors.success, colors.warning, colors.danger, colors.info];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
};

export const Avatar: React.FC<AvatarProps> = ({ name, size = 44 }) => {
  const bgColor = getColorForName(name);

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: radius.full,
          backgroundColor: bgColor,
        },
      ]}
    >
      <Text style={[styles.initials, { fontSize: size * 0.38 }]}>
        {getInitials(name)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: colors.textInverse,
    fontWeight: typography.weight.bold,
  },
});