/**
 * Browser File Provider - implements FileProvider for browser.
 */
import type { FileProvider } from 'cardcreator-library/files/file-provider';

export class BrowserFileProvider implements FileProvider {
  private files = new Map<string, ArrayBuffer>();

  register(path: string, content: ArrayBuffer): void {
    this.files.set(path.replace(/\\/g, '/'), content);
  }

  async load(path: string): Promise<Uint8Array> {
    const normalized = path.replace(/\\/g, '/');
    const cached = this.files.get(normalized);
    if (cached) return new Uint8Array(cached);

    if (path.startsWith('http')) {
      const res = await fetch(path);
      if (!res.ok)
        throw new Error(`Failed to fetch: ${path}`);
      return new Uint8Array(await res.arrayBuffer());
    }
    throw new Error(`File not found: ${path}`);
  }

  async save(
    path: string,
    data: Uint8Array,
  ): Promise<void> {
    this.files.set(path.replace(/\\/g, '/'), data.buffer);
    // Trigger download
    const blob = new Blob([data]);
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: path.split('/').pop(),
    });
    a.click();
    URL.revokeObjectURL(url);
  }
}
