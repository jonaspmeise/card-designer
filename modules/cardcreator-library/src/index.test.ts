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
import type {
  CardRenderer,
  Logger,
} from './types/domain';
import { FileProvider } from './files/file-provider';
import { timeout } from './utility';

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
    // Reset all mocked states to original mocks.
    library.events.clear();

    logger.info = async () => {};
    logger.debug = async () => {};
    logger.warn = async () => {};
    logger.error = async () => {};

    fileProvider.load = async (_: string) =>
      new Uint8Array();

    renderer.render = async () => new Uint8Array();
    renderer.supports = (_: string) => true;
  });

  describe('load project', () => {
    test('issues "loaded project" event when a project is loaded', (done) => {
      // THEN: Event is fired.
      library.events.on('projectLoaded', (event) => {
        expect(event.type).toBe('projectLoaded');
        done();
      });

      // GIVEN / WHEN
      library.project.load({
        projectName: 'test'
      });

      timeout(done);
    });

    test('issues a "confirmation" event when a new project is loaded, while another project is already loaded', (done) => {
      // THEN: a confirmation is sent.
      library.events.on('dialog', event => {
        expect(event.data.text).toMatch(/project/gi);
        expect(event.data.level)
        done();
      });

      // GIVEN: project is already loaded
      library.project.load({
        projectName: 'test'
      });

      // WHEN: another project is loaded
      library.project.load({
        projectName: 'test2'
      });

      timeout(done);
    });

    test.todo('issue no "confirmation" event when the same project is loaded two times (without modifications.', () => {});
    test.todo('the project status can be tracked via the sync API.', () => {});
    test.todo('if a new project is loaded and the dialog is confirmed, that project is loaded.', () => {});
    test.todo('if a new project is loaded and the dialog is confirmed, that project is not loaded.', () => {});
  });
});
