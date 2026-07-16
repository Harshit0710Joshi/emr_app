import React, { useEffect, useState } from 'react';
import { ScrollView, Text, StyleSheet, Alert, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@navigation/types';
import { Input } from '@components/common/Input';
import { Button } from '@components/common/Button';
import { colors, typography, spacing } from '@theme/index';
import { VisitRepository } from '@database/repositories/visitRepository';
import type { VisitInput, Visit } from '@models/visit';

type Props = NativeStackScreenProps<RootStackParamList, 'AddEditVisit'>;

const visitTypes: Visit['visitType'][] = ['consultation', 'follow-up', 'emergency', 'routine-checkup'];

const emptyForm = (patientId: string): VisitInput => ({
  patientId,
  visitDate: new Date().toISOString().split('T')[0],
  visitType: 'consultation',
  diagnosis: null,
  symptoms: null,
  notes: null,
  prescribedMedication: null,
  vitals: null,
});

export const AddEditVisitScreen: React.FC<Props> = ({ navigation, route }) => {
  const { patientId, visitId } = route.params;
  const isEditMode = !!visitId;

  const [form, setForm] = useState<VisitInput>(emptyForm(patientId));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEditMode && visitId) {
      (async () => {
        const existing = await VisitRepository.getById(visitId);
        if (existing) {
          setForm({
            patientId: existing.patientId,
            visitDate: existing.visitDate,
            visitType: existing.visitType,
            diagnosis: existing.diagnosis,
            symptoms: existing.symptoms,
            notes: existing.notes,
            prescribedMedication: existing.prescribedMedication,
            vitals: existing.vitals,
          });
        }
      })();
    }
  }, [isEditMode, visitId]);

  const updateField = <K extends keyof VisitInput>(key: K, value: VisitInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isEditMode && visitId) {
        await VisitRepository.update(visitId, form);
      } else {
        await VisitRepository.create(form);
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', 'Failed to save visit. Please try again.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!visitId) return;
    Alert.alert('Delete Visit', 'Are you sure you want to delete this visit?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await VisitRepository.softDelete(visitId);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>Visit Type</Text>
      <View style={styles.typeRow}>
        {visitTypes.map((type) => (
          <Button
            key={type}
            label={type}
            size="sm"
            variant={form.visitType === type ? 'primary' : 'outline'}
            onPress={() => updateField('visitType', type)}
            style={styles.typeButton}
          />
        ))}
      </View>

      <Input
        label="Visit Date *"
        placeholder="YYYY-MM-DD"
        value={form.visitDate}
        onChangeText={(v) => updateField('visitDate', v)}
      />
      <Input
        label="Diagnosis"
        placeholder="Enter diagnosis"
        value={form.diagnosis ?? ''}
        onChangeText={(v) => updateField('diagnosis', v || null)}
        multiline
        numberOfLines={2}
      />
      <Input
        label="Symptoms"
        placeholder="Enter symptoms"
        value={form.symptoms ?? ''}
        onChangeText={(v) => updateField('symptoms', v || null)}
        multiline
        numberOfLines={2}
      />
      <Input
        label="Prescribed Medication"
        placeholder="Enter medication"
        value={form.prescribedMedication ?? ''}
        onChangeText={(v) => updateField('prescribedMedication', v || null)}
        multiline
      />
      <Input
        label="Notes"
        placeholder="Additional notes"
        value={form.notes ?? ''}
        onChangeText={(v) => updateField('notes', v || null)}
        multiline
        numberOfLines={3}
      />

      <Button
        label={isEditMode ? 'Update Visit' : 'Save Visit'}
        onPress={handleSave}
        loading={saving}
        style={{ marginTop: spacing.md }}
      />

      {isEditMode && (
        <Button
          label="Delete Visit"
          variant="danger"
          onPress={handleDelete}
          style={{ marginTop: spacing.md }}
        />
      )}
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
    marginBottom: spacing.sm,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  typeButton: {
    marginBottom: 0,
  },
});