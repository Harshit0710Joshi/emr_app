import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing, radius } from '@theme/index';
import type { Visit } from '@models/visit';

interface Props {
  visit: Visit;
  onPress: () => void;
}

const typeLabels: Record<Visit['visitType'], string> = {
  consultation: 'Consultation',
  'follow-up': 'Follow-up',
  emergency: 'Emergency',
  'routine-checkup': 'Routine Checkup',
};

const typeColors: Record<Visit['visitType'], string> = {
  consultation: colors.info,
  'follow-up': colors.success,
  emergency: colors.danger,
  'routine-checkup': colors.warning,
};

export const VisitListItem: React.FC<Props> = ({ visit, onPress }) => {
  const date = new Date(visit.visitDate).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: typeColors[visit.visitType] + '20' }]}>
          <Text style={[styles.badgeText, { color: typeColors[visit.visitType] }]}>
            {typeLabels[visit.visitType]}
          </Text>
        </View>
        <Text style={styles.date}>{date}</Text>
      </View>
      {visit.diagnosis && <Text style={styles.diagnosis}>{visit.diagnosis}</Text>}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  badgeText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },
  date: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  diagnosis: {
    fontSize: typography.size.sm,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
});