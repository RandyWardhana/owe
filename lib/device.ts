const KEY = "owe.device";
const NAME_KEY = "owe.name";
export const NAME_MAX = 40;

export function deviceId(): string {
  if (typeof localStorage === "undefined") return "";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(KEY, id);
  }
  return id;
}

export function setDeviceId(id: string): void {
  if (typeof localStorage === "undefined") return;
  const trimmed = id.trim();
  if (trimmed) localStorage.setItem(KEY, trimmed);
}

export async function syncKey(id: string = deviceId()): Promise<string> {
  if (!id || typeof crypto === "undefined" || !crypto.subtle) return "";
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(id));
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function syncName(): string {
  if (typeof localStorage === "undefined") return "";
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setSyncName(name: string): void {
  if (typeof localStorage === "undefined") return;
  const trimmed = name.trim().slice(0, NAME_MAX);
  try {
    if (trimmed) localStorage.setItem(NAME_KEY, trimmed);
    else localStorage.removeItem(NAME_KEY);
  } catch {
    // storage blocked
  }
}
