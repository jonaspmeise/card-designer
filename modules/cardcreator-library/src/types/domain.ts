/**
 * Core domain interfaces used throughout the card-creator library.
 * These represent key abstractions for logging, rendering, and caching.
 */

// ============================================================================
// HANDLER OPTIONS
// ============================================================================

/**
 * Common options for event handler registration.
 * Abstracted to avoid repetition across the codebase.
 */
export interface HandlerOptions {
  readonly priority?: number;
  readonly once?: boolean;
}

// ============================================================================
// LOGGER INTERFACE
// ============================================================================

/**
 * Logger interface for structured logging across the library.
 * Implementations can route logs to file, console, cloud services, etc.
 * Follows common logging patterns (debug, info, warn, error, fatal).
 */
export interface ILogger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, error?: Error, context?: Record<string, unknown>): void;
  fatal(message: string, error?: Error, context?: Record<string, unknown>): void;
}

// ============================================================================
// CARD RENDERER INTERFACE
// ============================================================================

/**
 * Card renderer interface for converting SVG content to rendered output.
 * Implementations might use Puppeteer, Skia, or other rendering engines.
 */
export interface ICardRenderer {
  /**
   * Renders an SVG string to a byte array in the specified format.
   *
   * @param svg - The SVG content as a string
   * @param format - Output format (e.g., 'png', 'jpg', 'pdf')
   * @returns Promise resolving to the rendered bytes
   * @throws Error if rendering fails
   */
  render(svg: string, format: string): Promise<Uint8Array>;

  /**
   * Checks if this renderer supports the given output format.
   * Called before attempting to render.
   *
   * @param format - The desired output format
   * @returns True if supported, false otherwise
   */
  supports(format: string): boolean;
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

  protected constructor(id: string, name: string, mimeType: string) {
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

  /**
   * Get a string representation of the asset location.
   * Used for logging and debugging.
   */
  abstract getLocation(): string;
}

/**
 * In-memory asset stored as base64-encoded data.
 * Best for small assets in single-process environments.
 */
export class InMemoryAsset extends Asset {
  private readonly data: string;

  constructor(id: string, name: string, mimeType: string, data: string) {
    super(id, name, mimeType);
    this.data = data;
  }

  async load(): Promise<Uint8Array> {
    const binaryString = Buffer.from(this.data, 'base64').toString('binary');
    return new Uint8Array(
      binaryString.split('').map((char: string) => char.charCodeAt(0))
    );
  }

  getLocation(): string {
    return `memory://${this.id}`;
  }
}

/**
 * Remote asset fetched from a URL.
 * Useful for cloud-hosted resources with caching considerations.
 */
export class RemoteAsset extends Asset {
  private readonly url: string;

  constructor(id: string, name: string, mimeType: string, url: string) {
    super(id, name, mimeType);
    this.url = url;
  }

  async load(): Promise<Uint8Array> {
    const response = await fetch(this.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch asset from ${this.url}: ${response.statusText}`);
    }
    return new Uint8Array(await response.arrayBuffer());
  }

  getLocation(): string {
    return this.url;
  }
}

/**
 * File-based asset stored on the local filesystem.
 * Suitable for development and on-premise deployments.
 */
export class FileAsset extends Asset {
  private readonly filePath: string;

  constructor(id: string, name: string, mimeType: string, filePath: string) {
    super(id, name, mimeType);
    this.filePath = filePath;
  }

  async load(): Promise<Uint8Array> {
    if (typeof window !== 'undefined') {
      throw new Error('FileAsset cannot be used in browser environment');
    }

    const fs = await import('fs/promises');
    return new Uint8Array(await fs.readFile(this.filePath));
  }

  getLocation(): string {
    return `file://${this.filePath}`;
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
export interface IAssetCache {
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
   * Clear all assets from the cache.
   */
  clear(): void;

  /**
   * Get the current number of items in the cache.
   */
  size(): number;
}
