/**
 * @file netInfo.ts
 * @description Utility functions for inspecting and evaluating device network connectivity state.
 */
import { NetInfoState } from "@react-native-community/netinfo";

/**
 * Determines whether the device currently has active network and internet reachability.
 * 
 * Safely handles null or initializing states by evaluating both `isConnected` and `isInternetReachable` flags.
 * 
 * @param state - The current NetInfoState returned by `@react-native-community/netinfo`
 * @returns `true` if connected and internet is reachable, `false` otherwise
 * 
 * @example
 * ```ts
 * const state = await NetInfo.fetch();
 * if (isDeviceOnline(state)) {
 *   // Safe to make network requests
 * }
 * ```
 */
export function isDeviceOnline(state: NetInfoState | null): boolean {
  if (!state) return false;
  return state.isConnected !== false && state.isInternetReachable !== false;
}
