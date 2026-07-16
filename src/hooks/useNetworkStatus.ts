import { useEffect, useState, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const wasOffline = useRef(false);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = !!state.isConnected && !!state.isInternetReachable;

      if (wasOffline.current && online) {
        setJustReconnected(true);
        // Reset the flag shortly after, so it only fires once per reconnect event
        setTimeout(() => setJustReconnected(false), 100);
      }

      wasOffline.current = !online;
      setIsConnected(online);
    });

    return () => unsubscribe();
  }, []);

  return { isConnected, justReconnected };
}