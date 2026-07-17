import TcpSocket from 'react-native-tcp-socket';
import { PEER_PORT } from './constants';
import { buildOutgoingPacket, applyIncomingPacket } from './replicationProtocol';
import type { PeerPacket } from './types';

let server: any = null;
let connectedSocket: any = null;

async function handleIncomingData(socket: any, packet: PeerPacket) {
  const result = await applyIncomingPacket(packet);
  console.log(`[PassivePeer] Applied ${result.applied}, skipped ${result.skipped}`);

  // Reply with our own pending operations — this is the "bidirectional
  // over one connection" part. No new outbound connection needed.
  const ourPacket = await buildOutgoingPacket();
  socket.write(JSON.stringify(ourPacket) + '\n');
}

export const PassivePeer = {
  start() {
    if (server) return;

    server = TcpSocket.createServer((socket: any) => {
      console.log('[PassivePeer] Active peer connected');
      connectedSocket = socket;
      let buffer = '';

      socket.on('data', (chunk: any) => {
        buffer += chunk.toString();
        let boundary = buffer.indexOf('\n');
        while (boundary !== -1) {
          const message = buffer.substring(0, boundary).trim();
          buffer = buffer.substring(boundary + 1);
          if (message) {
            try {
              const packet: PeerPacket = JSON.parse(message);
              handleIncomingData(socket, packet);
            } catch (err) {
              console.error('[PassivePeer] Failed to parse packet:', err);
            }
          }
          boundary = buffer.indexOf('\n');
        }
      });

      socket.on('error', (err: any) => console.error('[PassivePeer] Socket error:', err));
      socket.on('close', () => {
        console.log('[PassivePeer] Active peer disconnected');
        connectedSocket = null;
      });
    });

    server.listen({ port: PEER_PORT, host: '0.0.0.0' }, () => {
      console.log(`[PassivePeer] Listening on port ${PEER_PORT}`);
    });

    server.on('error', (err: any) => console.error('[PassivePeer] Server error:', err));
  },

  stop() {
    connectedSocket?.destroy();
    connectedSocket = null;
    server?.close();
    server = null;
  },

  isRunning() {
    return server !== null;
  },
};