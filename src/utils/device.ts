import * as SecureStore from 'expo-secure-store';
import { generateId } from './id';

const DEVICE_ID_KEY = 'emr_device_id';

let cachedDeviceId: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;

  let deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);

  if (!deviceId) {
    deviceId = generateId();
    await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
  }

  cachedDeviceId = deviceId;
  return deviceId;
}