/**
 * @file supabase.ts
 * @description Configures and exports the Supabase client instance.
 * Provides a custom chunking storage adapter for Expo SecureStore to bypass the iOS 2KB limit.
 */
import * as SecureStore from "expo-secure-store";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import "react-native-url-polyfill/auto";

const CHUNK_SIZE = 1800; // safely under the 2 048-byte iOS SecureStore limit

/**
 * Generates a storage key for a specific chunk index.
 * 
 * @param key - The original root key for the data
 * @param index - The zero-based chunk index
 * @returns The suffixed key used for storing the chunk
 */
function chunkKey(key: string, index: number) {
  return `${key}.__chunk_${index}`;
}

/**
 * A custom storage adapter for Supabase Authentication that securely persists session tokens.
 * 
 * Supabase session tokens (which include large JWTs and refresh tokens) can easily exceed 
 * the ~2 KB per-entry limit on iOS Keychain. This adapter transparently chunks large string 
 * payloads across multiple SecureStore entries.
 * 
 * On web builds (used for development), it seamlessly falls back to `localStorage`.
 */
const SecureStoreAdapter = {
  /**
   * Retrieves and reconstructs a potentially chunked string from SecureStore.
   * 
   * @param key - The root key to retrieve
   * @returns A Promise resolving to the full reconstructed string, or null if not found
   */
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === "web") return localStorage.getItem(key);

    // Check for chunked value
    const countRaw = await SecureStore.getItemAsync(`${key}.__count`);
    if (countRaw !== null) {
      const count = parseInt(countRaw, 10);
      const parts: string[] = [];
      for (let i = 0; i < count; i++) {
        const part = await SecureStore.getItemAsync(chunkKey(key, i));
        if (part === null) return null;
        parts.push(part);
      }
      return parts.join("");
    }

    return SecureStore.getItemAsync(key);
  },

  /**
   * Securely saves a string to SecureStore, chunking it if it exceeds `CHUNK_SIZE`.
   * 
   * @param key - The root key to save under
   * @param value - The full string payload to persist
   */
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      localStorage.setItem(key, value);
      return;
    }

    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      // Remove any stale chunked data and individual chunk keys from a previous larger value
      const prevCountRaw = await SecureStore.getItemAsync(`${key}.__count`).catch(() => null);
      if (prevCountRaw !== null) {
        const prevCount = parseInt(prevCountRaw, 10);
        for (let i = 0; i < prevCount; i++) {
          await SecureStore.deleteItemAsync(chunkKey(key, i)).catch(() => {});
        }
        await SecureStore.deleteItemAsync(`${key}.__count`).catch(() => {});
      }
    } else {
      const prevCountRaw = await SecureStore.getItemAsync(`${key}.__count`).catch(() => null);
      const prevCount = prevCountRaw !== null ? parseInt(prevCountRaw, 10) : 0;

      const chunks: string[] = [];
      for (let i = 0; i < value.length; i += CHUNK_SIZE) {
        chunks.push(value.slice(i, i + CHUNK_SIZE));
      }
      for (let i = 0; i < chunks.length; i++) {
        await SecureStore.setItemAsync(chunkKey(key, i), chunks[i]!);
      }
      // Clean up any excess trailing chunk keys from previous writes
      for (let i = chunks.length; i < prevCount; i++) {
        await SecureStore.deleteItemAsync(chunkKey(key, i)).catch(() => {});
      }
      await SecureStore.setItemAsync(`${key}.__count`, String(chunks.length));
      // Remove the old single-entry key if it existed
      await SecureStore.deleteItemAsync(key).catch(() => {});
    }
  },

  /**
   * Removes a key (and all its associated chunks, if any) from SecureStore.
   * 
   * @param key - The root key to remove
   */
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === "web") {
      localStorage.removeItem(key);
      return;
    }

    const countRaw = await SecureStore.getItemAsync(`${key}.__count`);
    if (countRaw !== null) {
      const count = parseInt(countRaw, 10);
      for (let i = 0; i < count; i++) {
        await SecureStore.deleteItemAsync(chunkKey(key, i)).catch(() => {});
      }
      await SecureStore.deleteItemAsync(`${key}.__count`).catch(() => {});
    } else {
      await SecureStore.deleteItemAsync(key).catch(() => {});
    }
  },
};

const supabaseUrl = process.env["EXPO_PUBLIC_SUPABASE_URL"]!;
const supabaseAnonKey = process.env["EXPO_PUBLIC_SUPABASE_ANON_KEY"]!;

/**
 * The initialized Supabase client singleton used throughout the application.
 * Configured with auto-refreshing tokens and the chunking SecureStore adapter.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
