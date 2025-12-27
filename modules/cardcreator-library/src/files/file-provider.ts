export interface FileProvider {
  load(path: string): Promise<Uint8Array>;

  save(path: string, data: Uint8Array): Promise<void>;
}
