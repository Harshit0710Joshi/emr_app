import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@navigation/types';
import { Input } from '@components/common/Input';
import { Button } from '@components/common/Button';
import { colors, typography, spacing } from '@theme/index';
import { PatientRepository } from '@database/repositories/patientRepository';
import type { PatientInput } from '@models/patient';

type Props = NativeStackScreenProps<RootStackParamList, 'PatientRegistration'>;

const emptyForm: PatientInput = {
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  gender: 'male',
  phone: '',
  address: null,
  bloodGroup: null,
  emergencyContactName: null,
  emergencyContactPhone: null,
};

export const PatientRegistrationScreen: React.FC<Props> = ({ navigation, route }) => {
  const patientId = route.params?.patientId;
  const isEditMode = !!patientId;

  const [form, setForm] = useState<PatientInput>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEditMode && patientId) {
      (async () => {
        const existing = await PatientRepository.getById(patientId);
        if (existing) {
          setForm({
            firstName: existing.firstName,
            lastName: existing.lastName,
            dateOfBirth: existing.dateOfBirth,
            gender: existing.gender,
            phone: existing.phone,
            address: existing.address,
            bloodGroup: existing.bloodGroup,
            emergencyContactName: existing.emergencyContactName,
            emergencyContactPhone: existing.emergencyContactPhone,
          });
        }
      })();
    }
  }, [isEditMode, patientId]);

  const updateField = <K extends keyof PatientInput>(key: K, value: PatientInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!form.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!form.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!form.dateOfBirth.trim()) newErrors.dateOfBirth = 'Date of birth is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (isEditMode && patientId) {
        await PatientRepository.update(patientId, form);
      } else {
        await PatientRepository.create(form);
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', 'Failed to save patient. Please try again.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>Basic Information</Text>
      <Input
        label="First Name *"
        placeholder="Enter first name"
        value={form.firstName}
        onChangeText={(v) => updateField('firstName', v)}
        error={errors.firstName}
      />
      <Input
        label="Last Name *"
        placeholder="Enter last name"
        value={form.lastName}
        onChangeText={(v) => updateField('lastName', v)}
        error={errors.lastName}
      />
      <Input
        label="Date of Birth *"
        placeholder="YYYY-MM-DD"
        value={form.dateOfBirth}
        onChangeText={(v) => updateField('dateOfBirth', v)}
        error={errors.dateOfBirth}
        helperText="Format: YYYY-MM-DD, e.g. 1990-05-20"
      />
      <Input
        label="Phone Number *"
        placeholder="Enter phone number"
        keyboardType="phone-pad"
        value={form.phone}
        onChangeText={(v) => updateField('phone', v)}
        error={errors.phone}
      />

      <Text style={styles.sectionTitle}>Additional Details</Text>
      <Input
        label="Address"
        placeholder="Enter address"
        value={form.address ?? ''}
        onChangeText={(v) => updateField('address', v || null)}
        multiline
      />
      <Input
        label="Blood Group"
        placeholder="e.g. O+"
        value={form.bloodGroup ?? ''}
        onChangeText={(v) => updateField('bloodGroup', v || null)}
      />
      <Input
        label="Emergency Contact Name"
        placeholder="Enter contact name"
        value={form.emergencyContactName ?? ''}
        onChangeText={(v) => updateField('emergencyContactName', v || null)}
      />
      <Input
        label="Emergency Contact Phone"
        placeholder="Enter contact phone"
        keyboardType="phone-pad"
        value={form.emergencyContactPhone ?? ''}
        onChangeText={(v) => updateField('emergencyContactPhone', v || null)}
      />

      <Button
        label={isEditMode ? 'Update Patient' : 'Save Patient'}
        onPress={handleSave}
        loading={saving}
        style={{ marginTop: spacing.md }}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: spacing.lg },
  sectionTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
});