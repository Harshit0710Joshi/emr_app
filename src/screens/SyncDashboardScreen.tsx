import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Card } from '@components/common/Card';
import { Button } from '@components/common/Button';
import { colors, typography, spacing, radius } from '@theme/index';
import { SyncStatsRepository, DetailedSyncStats, FailedOperation, MetricsSummary } from '@database/repositories/syncStatsRepository';
import { SyncEngine } from '@sync/syncEngine';

export const SyncDashboardScreen: React.FC = () => {
  const [stats, setStats] = useState<DetailedSyncStats | null>(null);
  const [failedOps, setFailedOps] = useState<FailedOperation[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);

  const loadData = useCallback(async () => {
    const [statsData, failedData, metricsData] = await Promise.all([
      SyncStatsRepository.getDetailedStats(),
      SyncStatsRepository.getFailedOperations(),
      SyncStatsRepository.getMetricsSummary(),
    ]);
    setStats(statsData);
    setFailedOps(failedData);
    setMetrics(metricsData);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const result = await SyncEngine.runFullSync();
      await loadData();
      Alert.alert('Sync complete', JSON.stringify(result, null, 2));
    } catch (err: any) {
      Alert.alert('Sync failed', err.message ?? String(err));
    } finally {
      setSyncing(false);
    }
  };

  const handleRetryAll = async () => {
    await SyncStatsRepository.retryAllFailed();
    await loadData();
    Alert.alert('Retry queued', 'Failed operations will be retried on next sync.');
  };

  const handleRetryOne = async (operationId: string) => {
    await SyncStatsRepository.retryOperation(operationId);
    await loadData();
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return 'Never';
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  if (!stats) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading sync status...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: spacing.lg }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <Card style={{ marginBottom: spacing.lg }}>
        <Text style={styles.sectionTitle}>Last Synced</Text>
        <Text style={styles.lastSyncText}>{formatDate(stats.lastSyncedAt)}</Text>
        <Button
          label="Sync Now"
          onPress={handleSyncNow}
          loading={syncing}
          style={{ marginTop: spacing.md }}
        />
      </Card>

      {metrics && (
        <Card style={{ marginBottom: spacing.lg }}>
          <Text style={styles.sectionTitle}>Replication Metrics</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm }}>
            <View>
              <Text style={styles.lastSyncText}>{metrics.avgDurationMs}ms</Text>
              <Text style={{ fontSize: typography.size.xs, color: colors.textTertiary }}>Avg sync time</Text>
            </View>
            <View>
              <Text style={styles.lastSyncText}>{formatBytes(metrics.totalBytesSynced)}</Text>
              <Text style={{ fontSize: typography.size.xs, color: colors.textTertiary }}>Total data synced</Text>
            </View>
            <View>
              <Text style={styles.lastSyncText}>{metrics.totalOperationsLogged}</Text>
              <Text style={{ fontSize: typography.size.xs, color: colors.textTertiary }}>Operations logged</Text>
            </View>
          </View>
        </Card>
      )}

      <View style={styles.statsGrid}>
        <StatBox label="Pending" value={stats.pending} color={colors.statusPending} />
        <StatBox label="Synced" value={stats.synced} color={colors.statusSynced} />
        <StatBox label="Failed" value={stats.failed} color={colors.statusConflict} />
        <StatBox label="Conflicts" value={stats.conflicts} color={colors.warning} />
      </View>

      {failedOps.length > 0 && (
        <Card style={{ marginTop: spacing.lg }}>
          <View style={styles.failedHeader}>
            <Text style={styles.sectionTitle}>Failed Operations ({failedOps.length})</Text>
            <Button label="Retry All" size="sm" variant="outline" onPress={handleRetryAll} />
          </View>
          {failedOps.map((op) => (
            <View key={op.operationId} style={styles.failedItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.failedItemTitle}>
                  {op.entityType} · {op.operationType}
                </Text>
                <Text style={styles.failedItemError} numberOfLines={2}>
                  {op.lastError ?? 'Unknown error'}
                </Text>
                <Text style={styles.failedItemMeta}>
                  Retries: {op.retryCount} · Last attempt: {formatDate(op.lastAttemptAt)}
                </Text>
              </View>
              <Button
                label="Retry"
                size="sm"
                variant="secondary"
                onPress={() => handleRetryOne(op.operationId)}
              />
            </View>
          ))}
        </Card>
      )}

      {failedOps.length === 0 && stats.failed === 0 && (
        <Card style={{ marginTop: spacing.lg, alignItems: 'center' }}>
          <Text style={styles.allGoodText}>✓ All operations synced successfully</Text>
        </Card>
      )}
    </ScrollView>
  );
};

const StatBox: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <View style={statBoxStyles.box}>
    <View style={[statBoxStyles.dot, { backgroundColor: color }]} />
    <Text style={statBoxStyles.value}>{value}</Text>
    <Text style={statBoxStyles.label}>{label}</Text>
  </View>
);

const statBoxStyles = StyleSheet.create({
  box: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginBottom: spacing.sm },
  value: { fontSize: typography.size.xxl, fontWeight: typography.weight.bold, color: colors.textPrimary },
  label: { fontSize: typography.size.sm, color: colors.textSecondary, marginTop: 2 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingText: { textAlign: 'center', marginTop: spacing.xxl, color: colors.textTertiary },
  sectionTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  lastSyncText: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  failedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  failedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  failedItemTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
    textTransform: 'capitalize',
  },
  failedItemError: {
    fontSize: typography.size.xs,
    color: colors.danger,
    marginTop: 2,
  },
  failedItemMeta: {
    fontSize: typography.size.xs,
    color: colors.textTertiary,
    marginTop: 2,
  },
  allGoodText: {
    fontSize: typography.size.base,
    color: colors.success,
    fontWeight: typography.weight.semibold,
    paddingVertical: spacing.md,
  },
});