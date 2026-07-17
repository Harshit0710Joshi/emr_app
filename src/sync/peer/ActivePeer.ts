import TcpSocket from 'react-native-tcp-socket';
import { PEER_PORT, CONNECTION_TIMEOUT_MS } from './constants';
import { buildOutgoingPacket, applyIncomingPacket } from './replicationProtocol';
import type { PeerPacket } from './types';

export const ActivePeer = {
  connectAndSync(peerIp: string): Promise<{ pushed: number; pulled: number; conflictsSkipped: number }> {
    return new Promise(async (resolve, reject) => {
      let settled = false;
      let buffer = '';

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        socket.destroy();
        reject(new Error(`Connection to ${peerIp} timed out`));
      }, CONNECTION_TIMEOUT_MS);

      const socket = TcpSocket.createConnection(
        { host: peerIp, port: PEER_PORT },
        async () => {
          console.log('[ActivePeer] Connected to passive peer');
          // Send our pending operations immediately upon connecting
          const outgoing = await buildOutgoingPacket();
          const pushedCount = outgoing.operations.length;
          socket.write(JSON.stringify(outgoing) + '\n');

          // Store pushedCount on the socket object's closure via variable below
          (socket as any)._pushedCount = pushedCount;
        }
      );

      socket.on('data', async (chunk: any) => {
        buffer += chunk.toString();
        let boundary = buffer.indexOf('\n');
        while (boundary !== -1) {
          const message = buffer.substring(0, boundary).trim();
          buffer = buffer.substring(boundary + 1);
          if (message) {
            try {
              const packet: PeerPacket = JSON.parse(message);
              const result = await applyIncomingPacket(packet);

              if (!settled) {
                settled = true;
                clearTimeout(timer);
                resolve({
                  pushed: (socket as any)._pushedCount ?? 0,
                  pulled: result.applied,
                  conflictsSkipped: result.skipped,
                });
                socket.destroy();
              }
            } catch (err) {
              console.error('[ActivePeer] Failed to parse packet:', err);
            }
          }
          boundary = buffer.indexOf('\n');
        }
      });

      socket.on('error', (err: any) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(err);
        }
      });

      socket.on('close', () => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(new Error('Connection closed before sync completed'));
        }
      });
    });
  },
};