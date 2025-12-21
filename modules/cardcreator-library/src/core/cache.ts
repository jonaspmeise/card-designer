/**
 * Cache implementations for asset management.
 *
 * @module Cache
 */

import type { Asset, IAssetCache } from '../types/domain';

/**
 * In-memory asset cache implementation.
 *
 * Features:
 * - Fast O(1) lookup
 * - No persistence (data lost on shutdown)
 * - Suitable for single-process applications or development
 */
export class InMemoryAssetCache implements IAssetCache {
  private readonly store = new Map<string, Asset>();

  async set(asset: Asset): Promise<void> {
    this.store.set(asset.id, asset);
  }

  async get(assetId: string): Promise<Asset | undefined> {
    return this.store.get(assetId);
  }

  has(assetId: string): boolean {
    return this.store.has(assetId);
  }

  async delete(assetId: string): Promise<void> {
    this.store.delete(assetId);
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }
}

/**
 * LRU (Least Recently Used) cache implementation with size limits.
 *
 * Features:
 * - Automatic eviction of least recently used items
 * - Configurable maximum size (by item count)
 * - Suitable for memory-constrained environments
 * - Fast O(1) operations with Map
 *
 * @example
 * ```typescript
 * const cache = new LRUAssetCache(100); // Max 100 items
 * await cache.set(myAsset);
 * const asset = await cache.get('asset-123'); // Marks as recently used
 * ```
 */
export class LRUAssetCache implements IAssetCache {
  private readonly maxSize: number;
  private readonly store = new Map<string, Asset>();
  private readonly accessOrder: string[] = [];

  constructor(maxSize: number = 1000) {
    if (maxSize <= 0) {
      throw new Error('Cache maxSize must be greater than 0');
    }
    this.maxSize = maxSize;
  }

  async set(asset: Asset): Promise<void> {
    const existingIndex = this.accessOrder.indexOf(asset.id);
    if (existingIndex >= 0) {
      this.accessOrder.splice(existingIndex, 1);
    }

    this.store.set(asset.id, asset);
    this.accessOrder.push(asset.id);

    this.evictIfNeeded();
  }

  async get(assetId: string): Promise<Asset | undefined> {
    const asset = this.store.get(assetId);
    if (asset) {
      this.markAsRecent(assetId);
    }
    return asset;
  }

  has(assetId: string): boolean {
    return this.store.has(assetId);
  }

  async delete(assetId: string): Promise<void> {
    this.store.delete(assetId);
    const index = this.accessOrder.indexOf(assetId);
    if (index >= 0) {
      this.accessOrder.splice(index, 1);
    }
  }

  clear(): void {
    this.store.clear();
    this.accessOrder.length = 0;
  }

  size(): number {
    return this.store.size;
  }

  private markAsRecent(assetId: string): void {
    const index = this.accessOrder.indexOf(assetId);
    if (index >= 0) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(assetId);
  }

  private evictIfNeeded(): void {
    while (this.store.size > this.maxSize) {
      const lruId = this.accessOrder.shift();
      if (lruId) {
        this.store.delete(lruId);
      }
    }
  }
}

/**
 * No-op cache implementation that doesn't cache anything.
 *
 * Useful for:
 * - Testing without side effects
 * - Scenarios where caching is disabled
 * - Memory-critical environments
 */
export class NoOpAssetCache implements IAssetCache {
  async set(): Promise<void> {
    // No-op
  }

  async get(): Promise<undefined> {
    return undefined;
  }

  has(): boolean {
    return false;
  }

  async delete(): Promise<void> {
    // No-op
  }

  clear(): void {
    // No-op
  }

  size(): number {
    return 0;
  }
}
