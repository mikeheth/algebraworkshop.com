const KEY = "algebraworkshop-plus-preview";

export function hasPlusPreview(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function unlockPlusPreview(): void {
  try {
    window.localStorage.setItem(KEY, "1");
  } catch {
    /* ignore */
  }
}