export interface DiscoveredPeer {
  name: string;
  host: string;
  port: number;
  deviceId: string;
}

export interface PeerSyncPayload {
  deviceId: string;
  patients: any[];
  visits: any[];
  timestamp: string;
}