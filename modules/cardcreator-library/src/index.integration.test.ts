/**
 * Integration tests for CardCreatorLibrary.
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { CardCreatorLibrary } from './index';
import { InMemoryAssetCache } from './core/cache';
import type { Logger, CardRenderer } from './types/domain';

const createMockLogger = (): Logger => ({
  info: () => {},
  debug: () => {},
  warn: () => {},
  error: () => {},
});

const createMockRenderer = (): CardRenderer => ({
  render: async () => new Uint8Array([1, 2, 3]),
  supports: (format) => ['png', 'jpg', 'pdf'].includes(format as string),
});

describe('CardCreatorLibrary', () => {
  let library: CardCreatorLibrary;
  let logger: Logger;
  let renderer: CardRenderer;
  let cache: InMemoryAssetCache;

  beforeEach(() => {
    logger = createMockLogger();
    renderer = createMockRenderer();
    cache = new InMemoryAssetCache();

    library = new CardCreatorLibrary({
      logger,
      renderer,
      cache,
    });
  });

  afterEach(() => {
    library.reset();
  });

  test('should subscribe to conjunction events', async () => {
    let handlerCalled = false;

    library.on(['projectLoaded', 'fileOpened'], () => {
      handlerCalled = true;
    });

    // Publish events through the library's event bus
    await library..publish({
      type: 'projectLoaded',
      projectId: 'test-proj',
      projectName: 'Test Project',
      timestamp: new Date(),
      correlationId: 'test-corr',
    });

    await eventBus.publish({
      type: 'fileOpened',
      fileId: 'test-file',
      filePath: '/path/to/file',
      projectId: 'test-proj',
      timestamp: new Date(),
      correlationId: 'test-corr',
    });

    expect(handlerCalled).toBe(true);
  });

  test('should register error handlers', async () => {
    let errorCaught = false;
    let errorMessage = '';

    library.onError((error) => {
      errorCaught = true;
      errorMessage = error.message;
    });

    // Register a handler that throws
    library.on(['projectLoaded', 'fileOpened'], () => {
      throw new Error('Integration test error');
    });

    // Publish events through the library's event bus
    const eventBus = library.getEventBus();

    await eventBus.publish({
      type: 'projectLoaded',
      projectId: 'test-proj',
      projectName: 'Test Project',
      timestamp: new Date(),
      correlationId: 'test-corr',
    });

    await eventBus.publish({
      type: 'fileOpened',
      fileId: 'test-file',
      filePath: '/path/to/file',
      projectId: 'test-proj',
      timestamp: new Date(),
      correlationId: 'test-corr',
    });

    expect(errorCaught).toBe(true);
    expect(errorMessage).toBe('Integration test error');
  });

  test('should get event bus and logger instances', () => {
    expect(library.getEventBus()).toBeDefined();
    expect(library.getLogger()).toBe(logger);
    expect(library.getCache()).toBe(cache);
  });
});
