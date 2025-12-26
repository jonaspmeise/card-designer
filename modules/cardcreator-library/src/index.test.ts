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
    // Reset all mocked states to original mocks.
    library.events.clear();
    library.project.reset(true);

    logger.info = async () => {};
    logger.debug = async () => {};
    logger.warn = async () => {};
    logger.error = async () => {};

    fileProvider.load = async (_: string) =>
      new Uint8Array();

    renderer.render = async () => new Uint8Array();
    renderer.supports = (_: string) => true;
  });

  test('an initial project is always loaded.', () => {
    // WHEN / THEN
    expect(library.project.data()).toEqual({
      name: 'New Project'
    });
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
        name: 'test'
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
        name: 'test'
      });

      // WHEN: another project is loaded
      library.project.load({
        name: 'test2'
      });

      timeout(done);
    });

    test('issue no "confirmation" event when the same project is loaded two times (without modifications.', () => {
      // THEN
      library.events.on('dialog', _ => {
        throw new Error('No dialog should be issued!');
      });

      // GIVEN / WHEN
      library.project.load({
        name: 'test1'
      });
      // Same data is loaded twice!
      library.project.load({
        name: 'test1'
      });
    });

    test('the project status can be tracked via the sync API.', () => {
      // GIVEN
      library.project.load({
        name: 'test'
      });

      // WHEN / THEN
      expect(library.project.data()).toEqual({
        name: 'test'
      });
    });

    test('if a new project is loaded and the dialog is confirmed, that project is loaded.', (done) => {
      library.events.on('dialog', async event => {
        // WHEN: This event should exist!
        await event.data.callbacks.Confirm();

        // THEN: The project should be overwritten with the second setting!
        expect(library.project.data().name).toEqual('test2');
        done();
      });

      // GIVEN
      library.project.load({
        name: 'test1'
      });
      // Project is overwritten...
      library.project.load({
        name: 'test2'
      });

      timeout(done);
    });

    test('if a new project is loaded and the dialog is cancelled, that project is not loaded.', (done) => {
      library.events.on('dialog', async event => {
        // WHEN: This event should exist!
        await event.data.callbacks.Cancel();

        // THEN: The first loaded project (not the second one) should be loaded.
        expect(library.project.data().name).toEqual('test1');
        done();
      });

      // GIVEN
      library.project.load({
        name: 'test1'
      });
      // Project is overwritten...
      library.project.load({
        name: 'test2'
      });

      timeout(done);
    });
  });

  describe('reset', () => {
    test('prompts a dialog if the project was already modified.', (done) => {
      // THEN
      library.events.on('dialog', event => {
        expect(event.data.text).toMatch(/reset/gi);

        done();
      });

      // GIVEN
      library.project.load({
        name: 'test'
      });

      // WHEN
      library.project.reset();

      // ERROR
      timeout(done);
    });

    test('sends an event when the project reset is confirmed and resets the project.', (done) => {
      // GIVEN / WHEN
      library.events.on('dialog', event => {
        event.data.callbacks.Confirm();
      });
      // GIVEN / THEN
      library.events.on('projectReset', _ => {
        expect(library.project.data().name).toEqual('New Project');

        done();
      });

      // GIVEN
      library.project.load({
        name: 'test'
      });

      // WHEN
      library.project.reset();

      // ERROR
      timeout(done);
    });

    test('sends no event when the project reset is cancelled and does not reset the project.', (done) => {
      // GIVEN / WHEN
      library.events.on('dialog', async event => {
        await event.data.callbacks.Cancel();

        expect(library.project.data().name).toEqual('test');
        done();
      });
      library.events.on('projectReset', _ => {
        throw new Error('reset was cancelled, should not call this event!');
      });

      // GIVEN
      library.project.load({
        name: 'test'
      });

      // WHEN
      library.project.reset();

      // ERROR
      timeout(done);
    });

    test('can be forced, so the dialog confirm option is always skipped.', (done) => {
      // THEN
      library.events.on('projectReset', _ => {
        expect(library.project.data().name).toEqual('New Project');
        done();
      });

      // GIVEN
      library.project.load({
        name: 'test'
      });

      // WHEN
      library.project.reset(true);

      timeout(done);
    });
  });
});
