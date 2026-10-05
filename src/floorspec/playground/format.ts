/** "26 KB", "1.2 MB", "312 bytes": a file's size as the drop zone shows it. */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} ${bytes === 1 ? 'byte' : 'bytes'}`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** `3c9e…a71f`: a hash short enough to read, long enough to tell two apart. */
export const shortHash = (hex: string) => `${hex.slice(0, 4)}…${hex.slice(-4)}`;
