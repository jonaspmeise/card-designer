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
import { TemplateService } from '../template/template-service';
import { ConfigService } from '../config/config-service';

const dummyJob: RenderJob = {
  name: 'Dummy Job',
};

const dummyCard: Card = {
  name: 'my dummy card',
};

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
  const configService: ConfigService = new ConfigService({
    logger: logger,
    eventService: eventService,
    historyService: historyService,
  });
  const templateService: TemplateService =
    new TemplateService({
      logger: logger,
      eventService: eventService,
      historyService: historyService,
      configService: configService,
    });
  const renderer = {
    render: async (source: string, format: string) =>
      new Uint8Array(),
    supports: (_: string) => true,
  };

  beforeEach(() => {
    service = new RenderService({
      logger: logger,
      eventService: eventService,
      historyService: historyService,
      renderer: renderer,
      templateService: templateService,
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
    templateService.loadTemplate = (_source: string) => {};
    configService.config = () => ({});
  });

  describe('renderJob', () => {
    test('issues an event when a render job is started', (done) => {
      // GIVEN
      eventService.publish = async (event) => {
        // THEN
        if (event.type === 'jobRenderStarted') {
          done();
        }
      };

      // WHEN
      service.renderJob(dummyJob, []);
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
      service.renderJob(dummyJob, []);
      timeout(done);
    });

    test('issues a card render event when a card is rendered as part of a job', (done) => {
      // GIVEN
      let cardRenderEventIssued = false;

      eventService.publish = async (event) => {
        // THEN
        if (event.type === 'cardRenderStarted') {
          cardRenderEventIssued = true;
        }
        if (event.type === 'jobRenderFinished') {
          expect(cardRenderEventIssued).toBe(true);
          done();
        }
      };

      // WHEN
      service.renderJob(dummyJob, [dummyCard]);
      timeout(done);
    });
  });

  describe('renderCard', () => {
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

    test('issues a card compiled event when a render is occuring.', (done) => {
      // GIVEN
      templateService.apply = (_card) => {
        return '<svg>compiled text</svg>';
      };

      eventService.publish = async (event) => {
        // THEN
        if (event.type === 'cardCompiled') {
          expect(event.data.compiled).toEqual(
            '<svg>compiled text</svg>',
          );
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

    test('calls the template service to inject the template and then renders the card.', (done) => {
      let templateApplied = false;
      let rendererCalled = false;

      eventService.publish = async (event) => {
        // THEN
        if (event.type === 'cardRenderFinished') {
          expect(templateApplied).toBe(true);
          expect(rendererCalled).toBe(true);

          expect(
            event.data.image.byteLength,
          ).toBeGreaterThan(0);
          done();
        }
      };

      templateService.apply = (_card) => {
        templateApplied = true;
        return '<svg></svg>';
      };

      // GIVEN
      renderer.render = async (
        source: string,
        format: string,
      ) => {
        expect(source).toBe('<svg></svg>');
        expect(format).toBe('png');
        rendererCalled = true;
        return new Uint8Array([1, 2, 3]);
      };

      // WHEN
      service.renderCard(dummyCard);
      timeout(done);
    });
  });
});
