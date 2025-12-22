export interface FileProvider {
  load(path: string): Promise<Uint8Array>;
}
