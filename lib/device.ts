const KEY = "owe.device";

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
