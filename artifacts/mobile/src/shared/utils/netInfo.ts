import { NetInfoState } from "@react-native-community/netinfo";

/**
 * Shared utility to determine if the device is online based on NetInfo state.
 * Treats `null` values as online to prevent false negatives during initialization.
 */
export function isDeviceOnline(state: NetInfoState | null): boolean {
  if (!state) return false;
  return state.isConnected !== false && state.isInternetReachable !== false;
}
