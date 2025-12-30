import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
} from 'bun:test';
import { Command } from '../architecture/types';
import { NO_OP_LOGGER } from '..';
import { EventService } from '../events/event-service';
import { InternalEventBus } from '../events/events';
import { timeout } from '../test-utility';
import { RenderService } from './render-service';
import { HistoryService } from '../history/history-service';
import { Card, RenderJob } from './render-types';

const dummyJob: RenderJob = {
  name: 'Dummy Job',
};

const dummyCard: Card = {};

describe('RenderService', () => {
  let service: RenderService;
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
  const renderer = {
    render: async () => new Uint8Array(),
    supports: (_: string) => true,
  };

  beforeEach(() => {
    service = new RenderService({
      logger: logger,
      eventService: eventService,
      historyService: historyService,
      renderer: renderer,
    });

    renderer.render = async () => new Uint8Array();
    renderer.supports = (_) => true;

    logger.info = async (_msg: string) => {};
    logger.debug = async (_msg: string) => {};
    logger.warn = async (_msg: string) => {};
    logger.error = async (_msg: string) => {};

    eventService.publish = async (_event) => {};
    historyService.push = (_command: Command) => {
      return _command as any;
    };
  });

  test('issues an event when a render job is started', (done) => {
    // GIVEN
    eventService.publish = async (event) => {
      // THEN
      if (event.type === 'jobRenderStarted') {
        done();
      }
    };

    // WHEN
    service.renderJob(dummyJob);
    timeout(done);
  });

  test('issues an event when a render job is finished', (done) => {
    // GIVEN
    eventService.publish = async (event) => {
      // THEN
      if (event.type === 'jobRenderFinished') {
        done();
      }
    };

    // WHEN
    service.renderJob(dummyJob);
    timeout(done);
  });

  test('issues an event when a card render is started', (done) => {
    // GIVEN
    eventService.publish = async (event) => {
      // THEN
      if (event.type === 'cardRenderStarted') {
        done();
      }
    };

    // WHEN
    service.renderCard(dummyCard);
    timeout(done);
  });

  test('issues an event when a card render is finished', (done) => {
    // GIVEN
    eventService.publish = async (event) => {
      // THEN
      if (event.type === 'cardRenderFinished') {
        done();
      }
    };

    // WHEN
    service.renderCard(dummyCard);
    timeout(done);
  });
});
