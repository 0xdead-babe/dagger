export function isSafeBookmarkUrl(value: string): boolean {
  try {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

export function bookmarkUrlKey(value: string): string {
  try {
    return new URL(value).href;
  } catch {
    return value;
  }
}
