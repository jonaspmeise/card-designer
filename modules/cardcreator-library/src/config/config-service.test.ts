import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
} from 'bun:test';
import {
  Command,
  PopulatedCommand,
} from '../architecture/types';
import { NO_OP_LOGGER } from '..';
import { EventService } from '../events/event-service';
import { InternalEventBus } from '../events/events';
import { timeout } from '../test-utility';
import { HistoryService } from '../history/history-service';
import { ConfigService } from './config-service';
import { Card } from '../render/render-types';
import { time } from 'console';

describe('ConfigService', () => {
  let service: ConfigService;
  const logger = NO_OP_LOGGER;
  const eventService: InternalEventBus = new EventService({
    logger: logger,
  });
  let historyService: HistoryService;

  beforeEach(() => {
    historyService = new HistoryService({
      logger: logger,
      eventService: eventService,
    });

    service = new ConfigService({
      logger: logger,
      eventService: eventService,
      historyService: historyService,
    });

    logger.info = async (_msg: string) => {};
    logger.debug = async (_msg: string) => {};
    logger.warn = async (_msg: string) => {};
    logger.error = async (_msg: string) => {};

    eventService.publish = async (_event) => {};
  });

  describe('config', () => {
    test('returns undefined for unknown config keys.', () => {
      // GIVEN / WHEN
      const config = service.config();

      // THEN
      expect(config).toEqual({});
    });

    test('returns set config values.', () => {
      // GIVEN
      service.config()['my-key'] = 'my-value';

      // WHEN / THEN
      expect(service.config()).toEqual({
        'my-key': 'my-value',
      });
    });

    test('when a value is modified, an event is issued.', (done) => {
      // GIVEN
      eventService.publish = async (event) => {
        // THEN
        if (event.type !== 'configChanged') {
          return;
        }
        expect(event.data).toEqual({
          key: 'my-key',
          value: 'my-value',
        });
        done();
      };

      // WHEN
      service.config()['my-key'] = 'my-value';
      // THEN
      timeout(done);
    });

    test('triggers a command push', (done) => {
      // GIVEN
      service.config()['my-key'] = 'my-value';

      // THEN
      historyService.push = (command: Command) => {
        done();
        return command as any;
      };

      expect(service.config()).toEqual({
        'my-key': 'my-value',
      });

      // WHEN
      service.config()['my-key'] = 'my-new-value';
      timeout(done);
    });

    test('can be undone/redone via the history service.', () => {
      // GIVEN
      expect(service.config()).toEqual({});

      service.config()['my-key'] = 'my-value';
      expect(service.config()).toEqual({
        'my-key': 'my-value',
      });

      const command = historyService.history()[0];

      // WHEN
      command.undo();

      // THEN
      expect(service.config()).toEqual({});

      // WHEN
      command.do();
      // THEN
      expect(service.config()).toEqual({
        'my-key': 'my-value',
      });
    });

    test('can overwrite deep keys.', () => {
      // GIVEN
      service.config().parent = {};
      service.config().parent.middle = {};
      service.config().parent.middle.child = {
        value: 'something',
      };
      service.config().parent.middle.child.key = 'my-value';

      // WHEN / THEN
      expect(service.config()).toEqual({
        parent: {
          middle: {
            child: {
              value: 'something',
              key: 'my-value',
            },
          },
        },
      });
    });
  });

  describe('reset', () => {
    test('resets the config to empty by default.', () => {
      // GIVEN
      service.config()['my-key'] = 'my-value';
      expect(service.config()).toEqual({
        'my-key': 'my-value',
      });

      // WHEN
      service.reset();

      // THEN
      expect(service.config()).toEqual({});
    });

    test('after reset and modification, an event is issued.', (done) => {
      // GIVEN
      service.config()['my-key'] = 'my-value';

      eventService.publish = async (event) => {
        // THEN
        if (event.type !== 'configChanged') {
          return;
        }
        expect(event.data).toEqual({
          key: 'my-key',
          value: 'my-new-value',
        });
        done();
      };

      // WHEN
      service.reset();
      service.config()['my-key'] = 'my-new-value';
    });
  });
});
