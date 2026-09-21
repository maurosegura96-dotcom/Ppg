import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "aeroparamotor:api_base_url";

// Baked in at build time as a fallback only -- the value the app actually
// uses day to day lives in AsyncStorage (editable from Perfil, no rebuild
// needed) so a server move never requires shipping a new APK.
const BUILD_TIME_DEFAULT = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

let cachedUrl: string | null = null;

export async function getApiBaseUrl(): Promise<string> {
  if (cachedUrl) return cachedUrl;
  let resolved: string = BUILD_TIME_DEFAULT;
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored && stored.trim().length > 0) resolved = stored.trim();
  } catch {
    // fall through to BUILD_TIME_DEFAULT
  }
  cachedUrl = resolved;
  return resolved;
}

export async function setApiBaseUrl(url: string): Promise<void> {
  const trimmed = url.trim().replace(/\/$/, "");
  const resolved = trimmed.length > 0 ? trimmed : BUILD_TIME_DEFAULT;
  cachedUrl = resolved;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, resolved);
  } catch {
    // best-effort persistence; in-memory cache still updates this session
  }
}

export function getBuildTimeDefault(): string {
  return BUILD_TIME_DEFAULT;
}
