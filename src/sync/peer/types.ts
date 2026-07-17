export interface PeerOperation {
  operationId: string;
  entityType: 'patient' | 'visit';
  entityId: string;
  operationType: 'create' | 'update' | 'delete';
  payload: any;
  originDeviceId: string;
}

export interface PeerPacket {
  senderDeviceId: string;
  timestamp: string;
  operations: PeerOperation[];
}

export interface PeerAck {
  type: 'ACK';
  receivedCount: number;
}