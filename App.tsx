import 'react-native-get-random-values'; // MUST be first import
import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { AppNavigator } from '@navigation/AppNavigator';
import { OfflineBanner } from '@components/common/OfflineBanner';
import { useNetworkStatus } from './src/hooks/useNetworkStatus';
import { SyncEngine } from '@sync/syncEngine';

export default function App() {
  const { isConnected, justReconnected } = useNetworkStatus();
  const syncInProgress = useRef(false);

  useEffect(() => {
    if (justReconnected && !syncInProgress.current) {
      syncInProgress.current = true;
      console.log('Network reconnected — triggering auto-sync');
      SyncEngine.runFullSync()
        .then((result) => console.log('Auto-sync complete:', result))
        .catch((err) => console.error('Auto-sync failed:', err))
        .finally(() => {
          syncInProgress.current = false;
        });
    }
  }, [justReconnected]);
  useEffect(() => {
  const interval = setInterval(() => {
    if (isConnected && !syncInProgress.current) {
      syncInProgress.current = true;
      SyncEngine.runFullSync()
        .catch((err) => console.error('Periodic sync failed:', err))
        .finally(() => {
          syncInProgress.current = false;
        });
    }
  }, 5 * 60 * 1000); // every 5 minutes

  return () => clearInterval(interval);
}, [isConnected]);

  return (
    <View style={{ flex: 1 }}>
      {isConnected === false && <OfflineBanner />}
      <AppNavigator />
    </View>
  );
}