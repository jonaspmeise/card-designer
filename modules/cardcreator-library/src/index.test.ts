/**
 * Test from the consumer perspective.
 *
 * @module Tests
 */

import {
  describe,
  test,
  expect,
  afterEach,
} from 'bun:test';
import { CardCreatorLibrary, NO_OP_LOGGER } from './index';
import type { CardRenderer, Logger } from './types/domain';
import { FileProvider } from './files/file-provider';
import { timeout } from './test-utility';

describe('CardcreatorLibrary', () => {
  // Mocks.
  const fileProvider: FileProvider = {
    load: async (_: string) => new Uint8Array(),
    save: async (_: string, __: Uint8Array) => {},
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
    // Reset all mocked states to original mocks.
    library.events.clear();
    library.project.reset(true);

    logger.info = async () => {};
    logger.debug = async () => {};
    logger.warn = async () => {};
    logger.error = async () => {};

    fileProvider.load = async (_: string) =>
      new Uint8Array();
    fileProvider.save = async (
      _: string,
      __: Uint8Array,
    ) => {};

    renderer.render = async () => new Uint8Array();
    renderer.supports = (_: string) => true;
  });
});
