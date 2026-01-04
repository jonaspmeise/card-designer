import {
  describe,
  test,
  expect,
  beforeEach,
} from 'bun:test';
import { Command } from '../architecture/types';
import { NO_OP_LOGGER } from '..';
import { EventService } from '../events/event-service';
import { InternalEventBus } from '../events/events';
import { timeout } from '../test-utility';
import { HistoryService } from '../history/history-service';
import { CardService } from './card-service';

describe('CardService', () => {
  let service: CardService;
  const logger = NO_OP_LOGGER;
  const eventService: InternalEventBus = new EventService({
    logger: logger,
  });
  const historyService: HistoryService = new HistoryService(
    {
      logger: logger,
      eventService: eventService,
    },
  );

  beforeEach(() => {
    service = new CardService({
      logger: logger,
      eventService: eventService,
      historyService: historyService,
    });

    logger.info = async (_msg: string) => {};
    logger.debug = async (_msg: string) => {};
    logger.warn = async (_msg: string) => {};
    logger.error = async (_msg: string) => {};

    eventService.publish = async (_event) => {};
    historyService.push = (_command: Command) => {
      return _command as any;
    };
  });

  describe('load', () => {
    test('issues a "cards loaded" event when cards are loaded into the project.', (done) => {
      // THEN
      eventService.publish = async (event) => {
        if (event.type === 'cardsLoaded') {
          expect(event.data.cards).toHaveLength(2);
          done();
        }
      };

      // WHEN
      service.load([
        { name: 'Card 1', source: '' },
        { name: 'Card 2', source: '' },
      ]);

      timeout(done);
    });

    test('loaded cards can be retrieved via the API', () => {
      // GIVEN / WHEN
      service.load([
        { name: 'Card 1', source: '' },
        { name: 'Card 2', source: '' },
      ]);

      // THEN
      expect(service.cards()).toEqual([
        { name: 'Card 1', source: '' },
        { name: 'Card 2', source: '' },
      ]);
    });
  });

  describe('clear', () => {
    test('removes all loaded cards.', () => {
      // GIVEN
      service.load([
        { name: 'Card 1', source: '' },
        { name: 'Card 2', source: '' },
      ]);

      // WHEN
      service.clear();

      // THEN
      expect(service.cards()).toHaveLength(0);
    });
  });
});
