/**
 * Test from the consumer perspective.
 *
 * @module Tests
 */

import { describe, afterEach } from 'bun:test';
import { CardCreatorLibrary, NO_OP_LOGGER } from './index';
import type { Logger } from './types/domain';
import { CardRenderer } from './render/render-types';
import { FileProvider } from './file/file-provider';

describe('CardcreatorLibrary', () => {
  // Mocks.
  const fileProvider: FileProvider = {
    load: async (_) => new Uint8Array(),
    save: async (_, __) => {},
  };
  const renderer: CardRenderer = {
    render: async () => new Uint8Array(),
    supports: (_) => true,
    parallelity: () => 1,
  };
  const logger: Logger = NO_OP_LOGGER;

  // Library.
  const library: CardCreatorLibrary =
    new CardCreatorLibrary(
      {
        renderer: renderer,
        fileProvider: fileProvider,
      },
      {
        logger: logger,
      },
    );

  afterEach(() => {
    // Reset all mocked states to original mocks.
    library.events.clear();
    library.project.reset(true);

    logger.info = async () => {};
    logger.debug = async () => {};
    logger.warn = async () => {};
    logger.error = async () => {};

    fileProvider.load = async (_) => new Uint8Array();
    fileProvider.save = async (_, __) => {};

    renderer.render = async () => new Uint8Array();
    renderer.supports = (_) => true;
  });
});
