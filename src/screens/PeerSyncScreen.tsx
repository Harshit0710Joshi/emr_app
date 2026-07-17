import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native';
import { Card } from '@components/common/Card';
import { Input } from '@components/common/Input';
import { Button } from '@components/common/Button';
import { colors, typography, spacing } from '@theme/index';
import { PassivePeer } from '@sync/peer/PassivePeer';
import { ActivePeer } from '@sync/peer/ActivePeer';
import * as Network from 'expo-network';

export const PeerSyncScreen: React.FC = () => {
  const [myIp, setMyIp] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [peerIp, setPeerIp] = useState('');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    (async () => {
      const ip = await Network.getIpAddressAsync();
      setMyIp(ip);
    })();
  }, []);

  const isHotspotHost = myIp === '0.0.0.0' || !myIp;

  const toggleListening = () => {
    if (listening) {
      PassivePeer.stop();
      setListening(false);
    } else {
      PassivePeer.start();
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
      const result = await ActivePeer.connectAndSync(peerIp.trim());
      Alert.alert(
        'Peer sync complete',
        `Pushed: ${result.pushed} operations\nPulled: ${result.pulled} operations\nSkipped (duplicates/own): ${result.conflictsSkipped}`
      );
    } catch (err: any) {
      Alert.alert('Peer sync failed', err.message ?? String(err));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card style={{ marginBottom: spacing.lg }}>
        <Text style={styles.sectionTitle}>This Device (Passive Peer)</Text>
        <Text style={styles.ipText}>
          {myIp === null ? 'Detecting IP...' : isHotspotHost ? '192.168.43.1 (hotspot default)' : myIp}
        </Text>
        {isHotspotHost && myIp !== null && (
          <Text style={styles.warningText}>
            You appear to be hosting the hotspot — your IP can't be auto-detected in
            this mode. The other device should almost always be able to reach you at
            192.168.43.1. If that doesn't work, check the connected device's WiFi
            settings → your hotspot network → "Gateway" address.
          </Text>
        )}
        <Text style={styles.helper}>
          Share this IP with the other device. Keep "Start Listening" on — once a
          peer connects, sync happens automatically in both directions.
        </Text>
        <Button
          label={listening ? 'Stop Listening' : 'Start Listening for Peers'}
          variant={listening ? 'danger' : 'primary'}
          onPress={toggleListening}
          style={{ marginTop: spacing.md }}
        />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Connect to a Peer (Active Peer)</Text>
        <Input
          label="Peer IP Address"
          placeholder="e.g. 192.168.43.1"
          value={peerIp}
          onChangeText={setPeerIp}
          keyboardType="numeric"
        />
        <Text style={styles.helper}>
          Both devices must be on the same WiFi/hotspot network, and the other
          device must have "Start Listening" active. This works fully offline.
        </Text>
        <Button
          label="Connect & Sync"
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
  warningText: {
    fontSize: typography.size.xs,
    color: colors.warning,
    marginTop: spacing.sm,
    lineHeight: 16,
  },
  helper: {
    fontSize: typography.size.xs,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
});