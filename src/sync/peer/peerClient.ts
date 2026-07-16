import { getDatabase } from '@database/db';
import { getDeviceId } from '@utils/device';
import { PeerServer } from './peerServer';

const PEER_PORT = 8081;

async function getAllLocalData() {
  const db = await getDatabase();
  const patients = await db.getAllAsync<any>('SELECT * FROM patients;');
  const visits = await db.getAllAsync<any>('SELECT * FROM visits;');
  return { patients, visits };
}

export const PeerClient = {
  /**
   * Connects to a peer at the given IP, pulls their data, merges it locally,
   * then pushes our data to them — a full bidirectional exchange.
   */
  async syncWithPeer(peerIp: string): Promise<{ pulled: number; pushed: number }> {
    const baseUrl = `http://${peerIp}:${PEER_PORT}`;

    // 1. Pull peer's data
    const pullResponse = await fetch(`${baseUrl}/peer/data`);
    if (!pullResponse.ok) throw new Error(`Failed to reach peer: ${pullResponse.status}`);
    const peerData = await pullResponse.json();

    // 2. Merge peer's data into our local DB
    await PeerServer.mergeIncomingData(peerData.patients ?? [], peerData.visits ?? []);

    // 3. Push our data to the peer
    const ourData = await getAllLocalData();
    const ourDeviceId = await getDeviceId();
    const pushResponse = await fetch(`${baseUrl}/peer/data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: ourDeviceId, ...ourData }),
    });
    if (!pushResponse.ok) throw new Error(`Failed to push to peer: ${pushResponse.status}`);

    return {
      pulled: (peerData.patients?.length ?? 0) + (peerData.visits?.length ?? 0),
      pushed: ourData.patients.length + ourData.visits.length,
    };
  },
};