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
import { HistoryService } from '../history/history-service';
import { ProjectData } from './project-types';
import { CardService } from '../cards/card-service';

/**
 * Tests for the logic of the project service.
 * Events are mocked.
 * History is _not_ mocked, as the command executions are our core functionality in this service.
 */
const dummyProjectData: ProjectData = {
  name: 'Dummy Project',
  source: '',
};

describe('ProjectService', () => {
  // Mocks.
  const fileProvider: FileProvider = {
    load: async (_) => new Uint8Array(),
    save: async (_, __) => {},
  };
  const logger: Logger = NO_OP_LOGGER;
  const eventService: EventBus = new EventService({
    logger,
  });
  const historyService: HistoryService = new HistoryService(
    {
      logger,
      eventService,
    },
  );
  const cardService: CardService = new CardService({
    logger,
    eventService,
    historyService,
  });

  // Service.
  const service: ProjectService = new ProjectService({
    logger: logger,
    fileProvider: fileProvider,
    eventService: eventService,
    historyService: historyService,
    cardService: cardService,
  });

  afterEach(() => {
    eventService.clear();
    historyService.clear();
    cardService.clear();

    logger.info = async () => {};
    logger.debug = async () => {};
    logger.warn = async () => {};
    logger.error = async () => {};

    eventService.publish = async (_) => {};

    fileProvider.load = async (_) => new Uint8Array();
    fileProvider.save = async (_, __) => {};

    cardService.cards = () => [];
    cardService.load = async (_cards) => {};

    service.reset(true);
  });

  describe('load', () => {
    test('an initial project is always loaded.', () => {
      // WHEN / THEN
      expect(service.data()).toEqual({
        name: 'New Project',
        source: '<svg></svg>',
      });
    });

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
        ...dummyProjectData,
        name: 'test',
      });

      timeout(done);
    });

    test('the project status can be tracked via the sync API.', () => {
      // GIVEN
      service.load({
        ...dummyProjectData,
        name: 'test',
      });

      // WHEN / THEN
      expect(service.data().name).toEqual('test');
    });

    test('issues a "command executed" event when a project is loaded', (done) => {
      // THEN: Event is fired.
      eventService.publish = async (event) => {
        if (event.type === 'commandExecuted') {
          done();
        }
      };

      // GIVEN / WHEN
      service.load(dummyProjectData);
      timeout(done);
    });

    test('can be undone, thus going back to the prior project state.', async () => {
      // GIVEN / WHEN
      const call = await service.load({
        ...dummyProjectData,
        name: 'test2',
      });

      expect(call).toBeDefined();
      await call!.undo();

      // THEN
      expect(service.data().name).toEqual('New Project');
    });

    test('can be undone, then re-done, thus keeping the new state.', async () => {
      // GIVEN
      // We accept all incoming project changes.
      eventService.publish = async (event) => {
        if (event.type === 'dialog') {
          await event.data.callbacks.Confirm();
        }
      };

      service.load({
        ...dummyProjectData,
        name: 'test1',
      });

      // WHEN
      await service.load({
        ...dummyProjectData,
        name: 'test2',
      });

      expect(historyService.history()).toHaveLength(2);
      const loadCommand = historyService.history()[1];

      // THEN
      await loadCommand.undo();
      expect(service.data().name).toEqual('test1');

      // THEN
      await loadCommand.do();
      expect(service.data().name).toEqual('test2');
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
        ...dummyProjectData,
        name: 'test1',
      });
      // Project is overwritten...
      service.load({
        ...dummyProjectData,
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
        ...dummyProjectData,
        name: 'test1',
      });
      // Project is overwritten...
      service.load({
        ...dummyProjectData,
        name: 'test2',
      });

      timeout(done);
    });

    test('issue no "(confirmation) dialog" event when the same project is loaded two times (without modifications.', () => {
      // THEN
      eventService.publish = async (event) => {
        if (event.type === 'dialog') {
          throw new Error('No dialog should be issued!');
        }
      };

      // GIVEN / WHEN
      service.load({
        ...dummyProjectData,
        name: 'test1',
      });
      // Same data is loaded twice!
      service.load({
        ...dummyProjectData,
        name: 'test1',
      });
    });

    test('issues a "(confirmation) dialog" event when a new project is loaded, while another project is already loaded', (done) => {
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
        ...dummyProjectData,
        name: 'test',
      });

      // WHEN: another project is loaded
      service.load({
        ...dummyProjectData,
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
        ...dummyProjectData,
        name: 'test',
      });

      // THEN
      expect(service.isModified()).toBe(true);
    });

    test('is false after saving a modified project.', async () => {
      // GIVEN / WHEN
      service.load({
        ...dummyProjectData,
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
      fileProvider.save = async (_, __) => {
        done();
      };

      service.load({
        ...dummyProjectData,
        name: 'test',
      });

      // WHEN
      service.save();

      timeout(done);
    });

    test('saves to the given path when provided.', (done) => {
      // THEN
      fileProvider.save = async (path: string, __) => {
        expect(path).toBe(
          'my/custom/path.cardcreator.json',
        );
        done();
      };

      // GIVEN
      service.load({
        ...dummyProjectData,
        name: 'test',
      });

      // WHEN
      service.save('my/custom/path.cardcreator.json');

      timeout(done);
    });

    test('saves to the default path when no path is provided.', (done) => {
      // THEN
      fileProvider.save = async (path: string, __) => {
        expect(path).toBe('test.cardcreator.json');
        done();
      };

      // GIVEN
      service.load({
        ...dummyProjectData,
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
        ...dummyProjectData,
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
        ...dummyProjectData,
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
        ...dummyProjectData,
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
        ...dummyProjectData,
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
        ...dummyProjectData,
        name: 'test',
      });

      // WHEN
      service.reset(true);

      timeout(done);
    });
  });

  describe('close', () => {
    test('resets the project service when closing.', (done) => {
      let cleared = false;
      let eventSent = false;
      // THEN
      eventService.clear = () => {
        cleared = true;

        if (eventSent) {
          done();
        }
      };

      eventService.publish = async (event) => {
        if (event.type === 'projectClosed') {
          expect(service.data().name).toEqual(
            'New Project',
          );

          eventSent = true;

          if (cleared) {
            done();
          }
        }
      };

      // WHEN
      service.close();
      timeout(done);
    });
  });
});
