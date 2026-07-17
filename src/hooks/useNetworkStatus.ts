import { useEffect, useState, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const wasOffline = useRef(false);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = !!state.isConnected && state.isInternetReachable !== false;

      if (wasOffline.current && online) {
        setJustReconnected(true);
        setTimeout(() => setJustReconnected(false), 500);
      }

      wasOffline.current = !online;
      setIsConnected(online);
    });

    return () => unsubscribe();
  }, []);

  return { isConnected, justReconnected };
}