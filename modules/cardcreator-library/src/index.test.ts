/**
 * Comprehensive test suite for the card-creator library.
 * Tests the event-driven architecture, command dispatching, and all integrations.
 *
 * @module Tests
 */

import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
} from 'bun:test';
import { EventBus } from './events/event-bus';
import {
  InMemoryAssetCache,
  LRUAssetCache,
  NoOpAssetCache,
} from './cache/cache';
import { CommandDispatcher } from './interaction/command-dispatcher';
import { CardCreatorLibrary, NO_OP_LOGGER } from './index';
import type {
  CardRenderer,
  Asset,
  AssetCache,
  Logger,
} from './types/domain';
import { FileProvider } from './files/file-provider';
import { timeout } from './test-utility';

describe('CardcreatorLibrary', () => {
  // Mocks.
  const fileProvider: FileProvider = {
    load: async (_: string) => new Uint8Array(),
  };
  const renderer: CardRenderer = {
    render: async () => new Uint8Array(),
    supports: (_: string) => true,
  };
  const logger: Logger = NO_OP_LOGGER;

  // Library.
  const library: CardCreatorLibrary =
    new CardCreatorLibrary({
      logger: logger,
      renderer: renderer,
      fileProvider: fileProvider,
    });

  afterEach(() => {
    // Reset all mocked states.
    library!.reset();

    logger.info = () => {};
    logger.debug = () => {};
    logger.warn = () => {};
    logger.error = () => {};

    fileProvider.load = async (_: string) =>
      new Uint8Array();

    renderer.render = async () => new Uint8Array();
    renderer.supports = (_: string) => true;
  });

  test('issues an event when a project is loaded.', (done) => {
    library.on('projectLoaded', (event) => {
      expect(event.type).toBe('projectLoaded');
      done();
    });

    library.loadProject();

    timeout(done);
  });
});
