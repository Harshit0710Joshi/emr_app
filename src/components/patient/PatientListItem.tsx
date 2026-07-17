import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Avatar } from '@components/common/Avatar';
import { colors, typography, spacing } from '@theme/index';
import type { Patient } from '@models/patient';

interface Props {
  patient: Patient;
  onPress: () => void;
}

function calculateAge(dob: string): number {
  const birth = new Date(dob);
  const diff = Date.now() - birth.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

function getStatusColor(syncStatus: Patient['syncStatus']): string {
  switch (syncStatus) {
    case 'synced':
      return colors.statusSynced;
    case 'pending':
      return colors.statusPending;
    case 'conflict':
      return colors.statusConflict;
    default:
      return colors.statusOffline;
  }
}

export const PatientListItem: React.FC<Props> = ({ patient, onPress }) => {
  const fullName = `${patient.firstName} ${patient.lastName}`;
  const age = calculateAge(patient.dateOfBirth);

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <Avatar name={fullName} size={48} />
      <View style={styles.info}>
        <Text style={styles.name}>{fullName}</Text>
        <Text style={styles.meta}>
          {age} yrs · {patient.gender} · {patient.phone}
        </Text>
      </View>
      <View style={[styles.statusDot, { backgroundColor: getStatusColor(patient.syncStatus) }]} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  info: {
    flex: 1,
    marginLeft: spacing.md,
  },
  name: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
  },
  meta: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});