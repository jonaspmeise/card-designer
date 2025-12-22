/**
 * Test suite for cache implementations.
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { InMemoryAsset } from '../types/domain';
import { InMemoryAssetCache, LRUAssetCache, NoOpAssetCache } from './cache';

const createTestAsset = (id: string) => {
  return new InMemoryAsset(
    id,
    `asset-${id}`,
    'image/png',
    Buffer.from('test-data').toString('base64')
  );
};

describe('InMemoryAssetCache', () => {
  let cache: InMemoryAssetCache;

  beforeEach(() => {
    cache = new InMemoryAssetCache();
  });

  test('should store and retrieve assets', async () => {
    const asset = createTestAsset('test-1');
    await cache.set(asset);

    const retrieved = await cache.get('test-1');
    expect(retrieved).toBe(asset);
  });

  test('should return undefined for non-existent assets', async () => {
    const retrieved = await cache.get('non-existent');
    expect(retrieved).toBeUndefined();
  });

  test('should check asset existence', async () => {
    const asset = createTestAsset('test-2');
    cache.set(asset);

    expect(cache.has('test-2')).toBe(true);
    expect(cache.has('non-existent')).toBe(false);
  });

  test('should get cache size', async () => {
    cache.set(createTestAsset('test-3'));
    cache.set(createTestAsset('test-4'));

    expect(cache.size()).toBe(2);
  });

  test('should clear all assets', async () => {
    cache.set(createTestAsset('test-5'));
    cache.set(createTestAsset('test-6'));

    cache.clear();
    expect(cache.size()).toBe(0);
  });
});

describe('LRUAssetCache', () => {
  let cache: LRUAssetCache;

  beforeEach(() => {
    cache = new LRUAssetCache(2); // Max 2 items
  });

  test('should evict least recently used items', async () => {
    const asset1 = createTestAsset('lru-1');
    const asset2 = createTestAsset('lru-2');
    const asset3 = createTestAsset('lru-3');

    await cache.set(asset1);
    await cache.set(asset2);
    await cache.set(asset3); // This should evict asset1

    expect(await cache.get('lru-1')).toBeUndefined();
    expect(await cache.get('lru-2')).not.toBeNull();
    expect(await cache.get('lru-3')).not.toBeNull();
  });

  test('should mark accessed items as recently used', async () => {
    const asset1 = createTestAsset('lru-4');
    const asset2 = createTestAsset('lru-5');
    const asset3 = createTestAsset('lru-6');

    await cache.set(asset1);
    await cache.set(asset2);
    await cache.get('lru-4'); // Access asset1 to make it recent
    await cache.set(asset3); // This should evict asset2

    expect(await cache.get('lru-4')).not.toBeNull();
    expect(await cache.get('lru-5')).toBeUndefined();
  });
});

describe('NoOpAssetCache', () => {
  let cache: NoOpAssetCache;

  beforeEach(() => {
    cache = new NoOpAssetCache();
  });

  test('should not store assets', async () => {
    const asset = createTestAsset('noop-1');
    cache.set(asset);

    expect(await cache.get('noop-1')).toBeUndefined();
  });

  test('should always return false for has', async () => {
    const asset = createTestAsset('noop-2');
    cache.set(asset);

    expect(cache.has('noop-2')).toBe(false);
  });

  test('should return 0 for size', async () => {
    const asset = createTestAsset('noop-3');
    cache.set(asset);

    expect(cache.size()).toBe(0);
  });
});
