import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '@theme/index';

export const OfflineBanner: React.FC = () => {
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>You're offline — changes are saved locally and will sync when reconnected</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.warning,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  text: {
    color: '#5C4A00',
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    textAlign: 'center',
  },
});