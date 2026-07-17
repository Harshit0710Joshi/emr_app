import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@navigation/types';
import { Card } from '@components/common/Card';
import { colors, typography, spacing } from '@theme/index';
import { RevisionHistoryRepository } from '@database/repositories/revisionHistoryRepository';

type Props = NativeStackScreenProps<RootStackParamList, 'RevisionHistory'>;

export const RevisionHistoryScreen: React.FC<Props> = ({ route }) => {
  const { entityType, entityId } = route.params;
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const data = await RevisionHistoryRepository.getHistoryFor(entityType, entityId);
      setHistory(data);
    })();
  }, [entityType, entityId]);

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
      {history.map((h) => (
        <Card key={h.id} style={{ marginBottom: spacing.md }}>
          <Text style={styles.rev}>Revision {h.revision} · {h.source}</Text>
          <Text style={styles.date}>{new Date(h.recorded_at).toLocaleString()}</Text>
          <Text style={styles.fields}>
            Changed: {h.changedFields.length ? h.changedFields.join(', ') : 'none'}
          </Text>
        </Card>
      ))}
      {history.length === 0 && <Text style={styles.empty}>No history yet.</Text>}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  rev: { fontSize: typography.size.base, fontWeight: typography.weight.semibold, color: colors.textPrimary },
  date: { fontSize: typography.size.xs, color: colors.textTertiary, marginTop: 2 },
  fields: { fontSize: typography.size.sm, color: colors.textSecondary, marginTop: spacing.sm },
  empty: { textAlign: 'center', color: colors.textTertiary, marginTop: spacing.xxl },
});