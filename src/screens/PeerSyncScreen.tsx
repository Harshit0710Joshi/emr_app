import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native';
import { Card } from '@components/common/Card';
import { Input } from '@components/common/Input';
import { Button } from '@components/common/Button';
import { colors, typography, spacing } from '@theme/index';
import { PeerSyncEngine } from '@sync/peer/peerSyncEngine';

export const PeerSyncScreen: React.FC = () => {
  const [myIp, setMyIp] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [peerIp, setPeerIp] = useState('');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    (async () => {
      const ip = await PeerSyncEngine.getMyIpAddress();
      setMyIp(ip);
    })();
  }, []);

  const toggleListening = () => {
    if (listening) {
      PeerSyncEngine.stopListening();
      setListening(false);
    } else {
      PeerSyncEngine.startListening();
      setListening(true);
    }
  };

  const handleSync = async () => {
    if (!peerIp.trim()) {
      Alert.alert('Enter an IP address', 'Ask the other device for its IP shown on this same screen.');
      return;
    }
    setSyncing(true);
    try {
      const result = await PeerSyncEngine.syncWithPeer(peerIp.trim());
      Alert.alert('Peer sync complete', `Pulled: ${result.pulled} records\nPushed: ${result.pushed} records`);
    } catch (err: any) {
      Alert.alert('Peer sync failed', err.message ?? String(err));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card style={{ marginBottom: spacing.lg }}>
        <Text style={styles.sectionTitle}>This Device</Text>
        <Text style={styles.ipText}>{myIp ?? 'Detecting IP...'}</Text>
        <Text style={styles.helper}>
          Share this IP with the other device so they can sync with you.
        </Text>
        <Button
          label={listening ? 'Stop Listening' : 'Start Listening for Peers'}
          variant={listening ? 'danger' : 'primary'}
          onPress={toggleListening}
          style={{ marginTop: spacing.md }}
        />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Sync With Another Device</Text>
        <Input
          label="Peer IP Address"
          placeholder="e.g. 192.168.1.42"
          value={peerIp}
          onChangeText={setPeerIp}
          keyboardType="numeric"
        />
        <Text style={styles.helper}>
          Both devices must be on the same WiFi network, and the other device must have "Start Listening" active.
        </Text>
        <Button
          label="Sync With Peer"
          onPress={handleSync}
          loading={syncing}
          style={{ marginTop: spacing.md }}
        />
      </Card>
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
  ipText: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  helper: {
    fontSize: typography.size.xs,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
});