import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
} from 'bun:test';
import { HistoryService } from './history-service';
import { Command } from '../architecture/types';
import { NO_OP_LOGGER } from '..';
import { EventService } from '../events/event-service';
import { InternalEventBus } from '../events/events';
import { timeout } from '../test-utility';

describe('HistoryService', () => {
  let service: HistoryService;
  const logger = NO_OP_LOGGER;
  const eventService: InternalEventBus = new EventService({
    logger: logger,
  });

  beforeEach(() => {
    service = new HistoryService({
      logger: logger,
      eventService: eventService,
    });

    logger.info = async (_msg: string) => {};
    logger.debug = async (_msg: string) => {};
    logger.warn = async (_msg: string) => {};
    logger.error = async (_msg: string) => {};

    eventService.publish = async (_event) => {};
  });

  test('pushed commands should be executed', (done) => {
    // GIVEN / THEN
    const command: Command = {
      data: {},
      target: {},
      events: () => [],
      do: async () => {
        done();
      },
      undo: async () => {},
    };

    // WHEN
    service.push(command);
    timeout(done);
  });

  test('pushed commands should be fetchable from history', () => {
    // GIVEN / THEN
    const command: Command = {
      data: {},
      target: {},
      events: () => [],
      do: async () => {},
      undo: async () => {},
    };

    // WHEN
    service.push(command);

    // THEN
    expect(service.history()).toHaveLength(1);
  });

  test('can be cleared', () => {
    // GIVEN
    service.push({
      data: {},
      target: {},
      events: () => [],
      do: async () => {},
      undo: async () => {},
    });

    // WHEN
    service.clear();

    // THEN
    expect(service.history()).toHaveLength(0);
  });

  test('metadata of each command should be included in the history (was executed or not)', () => {
    // GIVEN / THEN
    const command: Command = {
      data: {
        test: 'my-test-data',
      },
      target: {},
      events: () => [],
      do: async () => {},
      undo: async () => {},
    };

    // WHEN
    service.push(command);

    // THEN
    expect(service.history()).toHaveLength(1);
    expect(service.history()[0].status).toEqual('done');
    expect(service.history()[0].id).toBeDefined();
    expect(service.history()[0].data.test).toEqual(
      'my-test-data',
    );
  });

  test('pushed commands should trigger an event', (done) => {
    // GIVEN
    eventService.publish = async (event) => {
      if (event.type === 'commandExecuted') {
        expect(event.data.data).toEqual({
          test: 'my-test-data',
        });

        done();
      }
    };

    // THEN
    const command: Command = {
      data: {
        test: 'my-test-data',
      },
      target: {},
      events: () => [],
      do: async () => {},
      undo: async () => {},
    };

    // WHEN
    service.push(command);

    timeout(done);
  });

  test('undone commands should trigger an event', (done) => {
    // THEN
    eventService.publish = async (event) => {
      if (event.type === 'commandUndone') {
        expect(event.data.data).toEqual({
          test: 'my-test-data',
        });

        done();
      }
    };

    // GIVEN
    const command = service.push({
      data: {
        test: 'my-test-data',
      },
      target: {},
      events: () => [],
      do: async () => {},
      undo: async () => {},
    });

    // WHEN
    command.undo();

    timeout(done);
  });

  test('additional events are emitted when a command is executed', (done) => {
    eventService.publish = async (event) => {
      if (event.type === 'projectLoaded') {
        done();
      }
    };

    // GIVEN
    const command = service.push({
      data: {
        test: 'my-test-data',
      },
      target: {},
      events: () => [
        {
          type: 'projectLoaded',
          data: {} as any,
        },
      ],
      do: async () => {},
      undo: async () => {},
    });

    // WHEN
    service.push(command);
    timeout(done);
  });
});
