import React, { useCallback, useState } from 'react';
import { View, FlatList, Text, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@navigation/types';
import { Button } from '@components/common/Button';
import { VisitListItem } from '@components/patient/VisitListItem';
import { colors, typography, spacing } from '@theme/index';
import { VisitRepository } from '@database/repositories/visitRepository';
import type { Visit } from '@models/visit';

type Props = NativeStackScreenProps<RootStackParamList, 'VisitHistory'>;

export const VisitHistoryScreen: React.FC<Props> = ({ navigation, route }) => {
  const { patientId } = route.params;
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setLoading(true);
        const data = await VisitRepository.getByPatientId(patientId);
        setVisits(data);
        setLoading(false);
      })();
    }, [patientId])
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={visits}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <VisitListItem
            visit={item}
            onPress={() => navigation.navigate('AddEditVisit', { patientId, visitId: item.id })}
          />
        )}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.emptyText}>No visits recorded yet.</Text>
          ) : null
        }
      />
      <View style={styles.footer}>
        <Button
          label="+ Add New Visit"
          onPress={() => navigation.navigate('AddEditVisit', { patientId })}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textTertiary,
    fontSize: typography.size.base,
    marginTop: spacing.xxl,
  },
});