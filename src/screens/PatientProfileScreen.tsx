import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@navigation/types';
import { Avatar } from '@components/common/Avatar';
import { Card } from '@components/common/Card';
import { Button } from '@components/common/Button';
import { colors, typography, spacing } from '@theme/index';
import { PatientRepository } from '@database/repositories/patientRepository';
import type { Patient } from '@models/patient';

type Props = NativeStackScreenProps<RootStackParamList, 'PatientProfile'>;

function calculateAge(dob: string): number {
  const birth = new Date(dob);
  const diff = Date.now() - birth.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

export const PatientProfileScreen: React.FC<Props> = ({ navigation, route }) => {
  const { patientId } = route.params;
  const [patient, setPatient] = useState<Patient | null>(null);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const data = await PatientRepository.getById(patientId);
        setPatient(data);
      })();
    }, [patientId])
  );

  const handleDelete = () => {
    Alert.alert(
      'Delete Patient',
      'Are you sure you want to delete this patient? This can be undone by support if needed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await PatientRepository.softDelete(patientId);
            navigation.navigate('PatientList');
          },
        },
      ]
    );
  };

  if (!patient) {
    return (
      <View style={styles.container}>
        <Text style={styles.placeholder}>Loading patient...</Text>
      </View>
    );
  }

  const fullName = `${patient.firstName} ${patient.lastName}`;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      <Card style={{ alignItems: 'center', marginBottom: spacing.lg }}>
        <Avatar name={fullName} size={72} />
        <Text style={styles.name}>{fullName}</Text>
        <Text style={styles.meta}>
          {calculateAge(patient.dateOfBirth)} yrs · {patient.gender}
        </Text>
      </Card>

      <Card style={{ marginBottom: spacing.lg }}>
        <InfoRow label="Phone" value={patient.phone} />
        <InfoRow label="Date of Birth" value={patient.dateOfBirth} />
        <InfoRow label="Address" value={patient.address || '—'} />
        <InfoRow label="Blood Group" value={patient.bloodGroup || '—'} />
        <InfoRow label="Emergency Contact" value={patient.emergencyContactName || '—'} />
        <InfoRow label="Emergency Phone" value={patient.emergencyContactPhone || '—'} last />
      </Card>

      <Button
        label="View Visit History"
        onPress={() => navigation.navigate('VisitHistory', { patientId })}
      />
      <Button
  label="View Revision History"
  variant="outline"
  onPress={() => navigation.navigate('RevisionHistory', { entityType: 'patient', entityId: patientId })}
  style={{ marginTop: spacing.md }}
/>
      <Button
        label="+ Add Visit"
        variant="secondary"
        style={{ marginTop: spacing.md }}
        onPress={() => navigation.navigate('AddEditVisit', { patientId })}
      />
      <Button
        label="Edit Patient"
        variant="outline"
        style={{ marginTop: spacing.md }}
        onPress={() => navigation.navigate('PatientRegistration', { patientId })}
      />
      <Button
        label="Delete Patient"
        variant="danger"
        style={{ marginTop: spacing.md }}
        onPress={handleDelete}
      />
    </ScrollView>
  );
};

const InfoRow: React.FC<{ label: string; value: string; last?: boolean }> = ({
  label,
  value,
  last,
}) => (
  <View style={[rowStyles.row, !last && rowStyles.borderBottom]}>
    <Text style={rowStyles.label}>{label}</Text>
    <Text style={rowStyles.value}>{value}</Text>
  </View>
);

const rowStyles = StyleSheet.create({
  row: { paddingVertical: spacing.sm },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  label: { fontSize: typography.size.xs, color: colors.textTertiary, marginBottom: 2 },
  value: { fontSize: typography.size.base, color: colors.textPrimary },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  name: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  meta: {
    fontSize: typography.size.sm,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  placeholder: {
    textAlign: 'center',
    color: colors.textTertiary,
    marginTop: spacing.xxl,
  },
});