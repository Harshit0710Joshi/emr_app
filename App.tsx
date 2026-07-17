import 'react-native-get-random-values'; // MUST be first import
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { AppNavigator } from '@navigation/AppNavigator';
import { OfflineBanner } from '@components/common/OfflineBanner';
import { useNetworkStatus } from './src/hooks/useNetworkStatus';
import { AutoSyncTrigger } from '@sync/autoSyncTrigger';

export default function App() {
  const { isConnected, justReconnected } = useNetworkStatus();

  // Keep the trigger's online-status in sync at all times
  useEffect(() => {
    AutoSyncTrigger.setOnlineStatus(!!isConnected);
  }, [isConnected]);

  // Immediate sync the moment we reconnect
  useEffect(() => {
    if (justReconnected) {
      console.log('[App] Network reconnected — running immediate sync');
      AutoSyncTrigger.runNow();
    }
  }, [justReconnected]);

  // Periodic background sync as a safety net (catches anything missed)
  useEffect(() => {
    const interval = setInterval(() => {
      if (isConnected) {
        AutoSyncTrigger.runNow();
      }
    }, 2 * 60 * 1000); // every 2 minutes now, since we also have instant + reconnect triggers

    return () => clearInterval(interval);
  }, [isConnected]);

  return (
    <View style={{ flex: 1 }}>
      {isConnected === false && <OfflineBanner />}
      <AppNavigator />
    </View>
  );
}