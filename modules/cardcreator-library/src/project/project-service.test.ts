import {
  describe,
  test,
  expect,
  afterEach,
} from 'bun:test';
import { NO_OP_LOGGER } from '..';
import { FileProvider } from '../files/file-provider';
import { timeout } from '../test-utility';
import { Logger } from '../types/domain';
import { ProjectService } from './project-service';
import { EventBus } from '../events/events';
import { EventService } from '../events/event-service';

describe('ProjectService', () => {
  // Mocks.
  const fileProvider: FileProvider = {
    load: async (_: string) => new Uint8Array(),
    save: async (_: string, __: Uint8Array) => {},
  };
  const logger: Logger = NO_OP_LOGGER;
  const eventService: EventBus = new EventService();

  // Service.
  const service: ProjectService = new ProjectService({
    logger: logger,
    fileProvider: fileProvider,
    eventBus: eventService,
  });

  afterEach(() => {
    eventService.clear();

    logger.info = async () => {};
    logger.debug = async () => {};
    logger.warn = async () => {};
    logger.error = async () => {};

    eventService.publish = async (event) => {};

    fileProvider.load = async (_: string) =>
      new Uint8Array();
    fileProvider.save = async (
      _: string,
      __: Uint8Array,
    ) => {};

    service.reset(true);
  });

  test('an initial project is always loaded.', () => {
    // WHEN / THEN
    expect(service.data()).toEqual({
      name: 'New Project',
    });
  });

  describe('load', () => {
    test('issues "loaded project" event when a project is loaded', (done) => {
      // THEN: Event is fired.
      eventService.publish = async (event) => {
        if (event.type === 'projectLoaded') {
          expect(event.data.name).toBe('test');
          done();
        }
      };

      // GIVEN / WHEN
      service.load({
        name: 'test',
      });

      timeout(done);
    });

    test('issues a "confirmation" event when a new project is loaded, while another project is already loaded', (done) => {
      // THEN: a confirmation is sent.
      eventService.publish = async (event) => {
        if (event.type === 'dialog') {
          expect(event.data.text).toMatch(/project/gi);
          expect(event.data.level);
          done();
        }
      };

      // GIVEN: project is already loaded
      service.load({
        name: 'test',
      });

      // WHEN: another project is loaded
      service.load({
        name: 'test2',
      });

      timeout(done);
    });

    test('issue no "confirmation" event when the same project is loaded two times (without modifications.', () => {
      // THEN
      eventService.publish = async (event) => {
        if (event.type === 'dialog') {
          throw new Error('No dialog should be issued!');
        }
      };

      // GIVEN / WHEN
      service.load({
        name: 'test1',
      });
      // Same data is loaded twice!
      service.load({
        name: 'test1',
      });
    });

    test('the project status can be tracked via the sync API.', () => {
      // GIVEN
      service.load({
        name: 'test',
      });

      // WHEN / THEN
      expect(service.data()).toEqual({
        name: 'test',
      });
    });

    test('if a new project is loaded and the dialog is confirmed, that project is loaded.', (done) => {
      eventService.publish = async (event) => {
        if (event.type === 'dialog') {
          // WHEN: This event should exist!
          await event.data.callbacks.Confirm();

          // THEN: The project should be overwritten with the second setting!
          expect(service.data().name).toEqual('test2');
          done();
        }
      };

      // GIVEN
      service.load({
        name: 'test1',
      });
      // Project is overwritten...
      service.load({
        name: 'test2',
      });

      timeout(done);
    });

    test('if a new project is loaded and the dialog is cancelled, that project is not loaded.', (done) => {
      eventService.publish = async (event) => {
        if (event.type === 'dialog') {
          // WHEN: This event should exist!
          await event.data.callbacks.Cancel();

          // THEN: The first loaded project (not the second one) should be loaded.
          expect(service.data().name).toEqual('test1');
          done();
        }
      };

      // GIVEN
      service.load({
        name: 'test1',
      });
      // Project is overwritten...
      service.load({
        name: 'test2',
      });

      timeout(done);
    });
  });

  describe('is modified', () => {
    test('is false when loading the initial project.', () => {
      // WHEN / THEN
      expect(service.isModified()).toBe(false);
    });

    test('is true when loading a new project.', () => {
      // GIVEN / WHEN
      service.load({
        name: 'test',
      });

      // THEN
      expect(service.isModified()).toBe(true);
    });

    test('is false after saving a modified project.', async () => {
      // GIVEN / WHEN
      service.load({
        name: 'test',
      });
      await service.save();
      // THEN
      expect(service.isModified()).toBe(false);
    });
  });

  describe('save', () => {
    test('calls the file provider save method when saving a project.', (done) => {
      // GIVEN
      fileProvider.save = async (
        _: string,
        __: Uint8Array,
      ) => {
        done();
      };

      service.load({
        name: 'test',
      });

      // WHEN
      service.save();

      timeout(done);
    });

    test('saves to the given path when provided.', (done) => {
      // THEN
      fileProvider.save = async (
        path: string,
        __: Uint8Array,
      ) => {
        expect(path).toBe(
          'my/custom/path.cardcreator.json',
        );
        done();
      };

      // GIVEN
      service.load({
        name: 'test',
      });

      // WHEN
      service.save('my/custom/path.cardcreator.json');

      timeout(done);
    });

    test('saves to the default path when no path is provided.', (done) => {
      // THEN
      fileProvider.save = async (
        path: string,
        __: Uint8Array,
      ) => {
        expect(path).toBe('test.cardcreator.json');
        done();
      };

      // GIVEN
      service.load({
        name: 'test',
      });

      // WHEN
      service.save();

      timeout(done);
    });

    test('issues a "project saved" event when saving a project.', (done) => {
      // THEN
      eventService.publish = async (event) => {
        if (event.type === 'projectSaved') {
          expect(event.data.path);
          done();
        }
      };

      // GIVEN
      service.load({
        name: 'test',
      });

      // WHEN
      service.save();
      timeout(done);
    });
  });

  describe('reset', () => {
    test('prompts a dialog if the project was already modified.', (done) => {
      // THEN
      eventService.publish = async (event) => {
        if (event.type === 'dialog') {
          expect(event.data.text).toMatch(/reset/gi);

          done();
        }
      };

      // GIVEN
      service.load({
        name: 'test',
      });

      // WHEN
      service.reset();

      // ERROR
      timeout(done);
    });

    test('sends an event when the project reset is confirmed and resets the project.', (done) => {
      // GIVEN / WHEN
      eventService.publish = async (event) => {
        if (event.type === 'dialog') {
          event.data.callbacks.Confirm();
        } else if (event.type === 'projectReset') {
          expect(service.data().name).toEqual(
            'New Project',
          );
          done();
        }
      };

      // GIVEN
      service.load({
        name: 'test',
      });

      // WHEN
      service.reset();

      // ERROR
      timeout(done);
    });

    test('sends no event when the project reset is cancelled and does not reset the project.', (done) => {
      // GIVEN / WHEN
      eventService.publish = async (event) => {
        if (event.type === 'dialog') {
          await event.data.callbacks.Cancel();

          expect(service.data().name).toEqual('test');
          done();
        } else if (event.type === 'projectReset') {
          throw new Error(
            'reset was cancelled, should not call this event!',
          );
        }
      };

      // GIVEN
      service.load({
        name: 'test',
      });

      // WHEN
      service.reset();

      // ERROR
      timeout(done);
    });

    test('can be forced, so the dialog confirm option is always skipped.', (done) => {
      // THEN
      eventService.publish = async (event) => {
        if (event.type === 'projectReset') {
          expect(service.data().name).toEqual(
            'New Project',
          );
          done();
        }
      };

      // GIVEN
      service.load({
        name: 'test',
      });

      // WHEN
      service.reset(true);

      timeout(done);
    });
  });
});
