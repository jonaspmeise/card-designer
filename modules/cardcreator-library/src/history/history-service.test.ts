import {
  describe,
  test,
  expect,
  beforeEach,
} from 'bun:test';
import { HistoryService } from './history-service';
import { BaseCommand } from '../architecture/types';
import { NO_OP_LOGGER } from '..';
import { EventService } from '../events/event-service';
import { InternalEventBus } from '../events/events';
import { timeout } from '../test-utility';
import { CardCreatorEvent } from '../types/events';

class DummyCommand extends BaseCommand {
  constructor(
    public readonly data = {},
    public readonly target = {
      value: 0,
    },
  ) {
    super();
  }

  message(): string {
    return 'Dummy Command';
  }

  events(): readonly CardCreatorEvent[] {
    return [];
  }
  protected _do(): void {
    this.target.value++;
  }
  protected _undo(): void {
    this.target.value--;
  }
}

describe('HistoryService', () => {
  let service: HistoryService;
  const logger = console;
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

  describe('push', () => {
    test('pushed commands should be executed', (done) => {
      // GIVEN / THEN
      const command = new DummyCommand();
      command.do = () => {
        done();
        return true;
      };

      // WHEN
      service.push(command);
    });

    test('pushed commands should be fetchable from history', () => {
      // GIVEN / THEN
      const command = new DummyCommand();

      // WHEN
      service.push(command);

      // THEN
      expect(service.history()).toHaveLength(1);
    });

    test('metadata of each command should be included in the history (was executed or not)', () => {
      // GIVEN / THEN
      const command = new DummyCommand();

      // WHEN
      service.push(command);

      // THEN
      expect(service.history()).toHaveLength(1);
      expect(service.history()[0].done()).toEqual(true);
      expect(service.history()[0].id).toBeDefined();
    });

    test('pushed commands should trigger an event', (done) => {
      // THEN
      eventService.publish = async (event) => {
        if (event.type === 'commandExecuted') {
          done();
        }
      };

      // GIVEN / WHEN
      service.push(new DummyCommand());

      timeout(done);
    });
  });

  describe('clear', () => {
    test('can be cleared', () => {
      // GIVEN
      service.push(new DummyCommand());

      // WHEN
      service.clear();

      // THEN
      expect(service.history()).toHaveLength(0);
    });
  });

  describe('misc', () => {
    test('undone commands should trigger an event', (done) => {
      // THEN
      eventService.publish = async (event) => {
        if (event.type === 'commandUndone') {
          done();
        }
      };

      // GIVEN
      const command = service.push(new DummyCommand());

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
      const command = new DummyCommand();
      command.events = () => [
        {
          type: 'projectLoaded',
          data: {
            name: 'My Project',
            template: '',
            _functions: new Map(),
          },
        },
      ];

      // WHEN
      service.push(command);
      timeout(done);
    });
  });

  describe('do', () => {
    test('if an invalid command is done explicitly, an error is logged and nothing happens.', (done) => {
      // THEN
      logger.error = (message) => {
        if (/exist/i.test(message)) {
          done();
        }
      };

      // GIVEN / WHEN
      service.do('non-existing-command-id');

      timeout(done);
    });

    test('if a valid command is done explicitly, it is executed again.', () => {
      // GIVEN
      const command = service.push(new DummyCommand());

      expect(command.target.value).toBe(1);
      command.undo();
      expect(command.target.value).toBe(0);

      // WHEN
      service.do(command.id);

      // THEN
      expect(command.target.value).toBe(1);
    });

    test('if a done command is done explicitly again, nothing happens.', () => {
      // GIVEN
      const command = new DummyCommand();
      const returned = service.push(command);

      expect(command.target.value).toEqual(1);

      // WHEN
      service.do(returned.id);

      // THEN
      expect(command.target.value).toBe(1);
    });

    test('side effects of commands are executed when a command is done.', (done) => {
      // GIVEN
      const command = new DummyCommand();

      // THEN
      command.sideeffects = () => {
        done();
      };

      // WHEN
      service.push(command);

      timeout(done);
    });
  });

  describe('undo', () => {
    test('if an invalid command is undone explicitly, an error is logged and nothing happens.', (done) => {
      // THEN
      logger.error = (message) => {
        if (/exist/i.test(message)) {
          done();
        }
      };

      // GIVEN / WHEN
      service.undo('non-existing-command-id');

      timeout(done);
    });

    test('if a valid command is undone explicitly, its effect is undone.', () => {
      // GIVEN
      const command = service.push(new DummyCommand());
      expect(command.target.value).toBe(1);

      // WHEN
      service.undo(command.id);

      // THEN
      expect(command.target.value).toBe(0);
    });

    test('if a undone command is undone explicitly again, nothing happens.', () => {
      // GIVEN
      const command = new DummyCommand();
      const returned = service.push(command);

      // WHEN
      service.undo(returned.id);
      service.undo(returned.id);

      // THEN
      expect(command.target.value).toBe(0);
    });
  });
});
