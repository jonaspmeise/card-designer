/**
 * Core domain interfaces used throughout the card-creator library.
 * These represent key abstractions for logging, rendering, and caching.
 */

import { OutputFormat } from '../render/render-types';

// ============================================================================
// OUTPUT FORMAT TYPE
// ============================================================================

export interface Logger {
  debug(message: string, ...context: any): Promise<void>;
  info(message: string, ...context: any): Promise<void>;
  warn(message: string, ...context: any): Promise<void>;
  error(message: string, ...context: any): Promise<void>;
}

export type LogLevel = keyof Logger;

// ============================================================================
// FILE HANDLER INTERFACE
// ============================================================================

/**
 * File handler interface for loading files from various sources.
 * Allows different implementations for CLI (native fs) and webapp (File API).
 */
export interface FileHandler {
  /**
   * Load a file from a given path or file reference.
   *
   * @param path - File path or identifier (depends on implementation)
   * @returns Promise resolving to the file contents as bytes
   * @throws Error if file cannot be read
   */
  loadFile(path: string): Promise<Uint8Array>;

  /**
   * Check if a file exists at the given path.
   *
   * @param path - File path to check
   * @returns True if the file exists, false otherwise
   */
  fileExists(path: string): Promise<boolean>;
}

// ============================================================================
// ASSET TYPES
// ============================================================================

/**
 * Abstract base class for assets in the card-creator system.
 * Assets represent reusable resources (images, data, etc.) that can be
 * stored and retrieved from various locations.
 */
export abstract class Asset {
  readonly id: string;
  readonly name: string;
  readonly mimeType: string;
  readonly createdAt: Date;

  protected constructor(
    id: string,
    name: string,
    mimeType: string,
  ) {
    this.id = id;
    this.name = name;
    this.mimeType = mimeType;
    this.createdAt = new Date();
  }

  /**
   * Load the asset data.
   * Implementation depends on storage location (memory, remote, file, etc).
   *
   * @returns Promise resolving to the asset bytes
   */
  abstract load(): Promise<Uint8Array>;
}

/**
 * In-memory asset stored as base64-encoded data.
 * Best for small assets in single-process environments.
 */
export class InMemoryAsset extends Asset {
  private readonly data: string;

  constructor(
    id: string,
    name: string,
    mimeType: string,
    data: string,
  ) {
    super(id, name, mimeType);
    this.data = data;
  }

  async load(): Promise<Uint8Array> {
    const binaryString = Buffer.from(
      this.data,
      'base64',
    ).toString('binary');
    return new Uint8Array(
      binaryString
        .split('')
        .map((char: string) => char.charCodeAt(0)),
    );
  }
}

/**
 * Remote asset fetched from a URL.
 * Useful for cloud-hosted resources with caching considerations.
 */
export class RemoteAsset extends Asset {
  private readonly url: string;

  constructor(
    id: string,
    name: string,
    mimeType: string,
    url: string,
  ) {
    super(id, name, mimeType);
    this.url = url;
  }

  async load(): Promise<Uint8Array> {
    const response = await fetch(this.url);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch asset from ${this.url}: ${response.statusText}`,
      );
    }
    return new Uint8Array(await response.arrayBuffer());
  }
}

/**
 * File-based asset stored on the local filesystem.
 * Suitable for development and on-premise deployments.
 */
export class FileAsset extends Asset {
  private readonly filePath: string;

  constructor(
    id: string,
    name: string,
    mimeType: string,
    filePath: string,
  ) {
    super(id, name, mimeType);
    this.filePath = filePath;
  }

  async load(): Promise<Uint8Array> {
    if (typeof window !== 'undefined') {
      throw new Error(
        'FileAsset cannot be used in browser environment',
      );
    }

    const fs = await import('fs/promises');
    return new Uint8Array(await fs.readFile(this.filePath));
  }
}

// ============================================================================
// CACHE INTERFACE
// ============================================================================

/**
 * Cache interface for storing and retrieving assets.
 * Implementations can use memory, disk, Redis, or other backends.
 * Enables performance optimization through asset reuse.
 */
export interface AssetCache {
  /**
   * Store an asset in the cache.
   *
   * @param asset - The asset to cache
   * @returns Promise resolving when the asset is cached
   */
  set(asset: Asset): Promise<void>;

  /**
   * Retrieve an asset from the cache by ID.
   *
   * @param assetId - The ID of the asset to retrieve
   * @returns Promise resolving to the asset or undefined if not cached
   */
  get(assetId: string): Promise<Asset | undefined>;

  /**
   * Check if an asset exists in the cache.
   *
   * @param assetId - The ID to check
   * @returns True if cached, false otherwise
   */
  has(assetId: string): boolean;

  /**
   * Remove an asset from the cache.
   *
   * @param assetId - The ID of the asset to remove
   * @returns Promise resolving when the asset is removed
   */
  delete(assetId: string): Promise<void>;

  /**
   * Clear assets from the cache.
   * If eventType is provided, only clear handlers for that event type.
   * If not provided, clear all handlers.
   */
  clear(): void;

  /**
   * Get the current number of items in the cache.
   */
  size(): number;
}
