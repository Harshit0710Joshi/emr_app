import { PeerServer } from './peerServer';
import { PeerClient } from './peerClient';
import { getDeviceId } from '@utils/device';
import * as Network from 'expo-network';

export const PeerSyncEngine = {
  startListening() {
    PeerServer.start();
  },

  stopListening() {
    PeerServer.stop();
  },

  isListening() {
    return PeerServer.isRunning();
  },

  async getMyIpAddress(): Promise<string | null> {
    const ip = await Network.getIpAddressAsync();
    return ip;
  },

  async syncWithPeer(peerIp: string) {
    return PeerClient.syncWithPeer(peerIp);
  },
};