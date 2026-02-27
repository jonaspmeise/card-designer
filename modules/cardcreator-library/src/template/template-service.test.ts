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
import { dummyCard, timeout } from '../test-utility';
import { HistoryService } from '../history/history-service';
import { TemplateService } from './template-service';
import {
  Card,
  RenderContext,
} from '../render/render-types';
import { Template, TemplateState } from './template-types';
import { ConfigService } from '../config/config-service';
import { LogLevel } from '../types/domain';
import { RenderService } from '../render/render-service';

describe('TemplateService', () => {
  let service: TemplateService;
  let state: TemplateState;

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

  const renderService: RenderService = new RenderService({
    logger: logger,
    eventService: eventService,
    historyService: historyService,
    renderer: {
      render: async (_: string, __: any) =>
        new Uint8Array(),
      supports: (_) => true,
      parallelity: () => 1,
    },
    templateService: {} as TemplateService, // TODO: circular dependency...
  });

  beforeEach(() => {
    state = {
      template: '<svg></svg>',
      _functions: new Map(),
    };

    service = new TemplateService(
      {
        logger: logger,
        eventService: eventService,
        historyService: historyService,
        configService: configService,
      },
      state,
      () => {
        renderService.triggerPreview();
      },
    );

    logger.info = async (_msg: string) => {};
    logger.debug = async (_msg: string) => {};
    logger.warn = async (_msg: string) => {};
    logger.error = async (_msg: string) => {};

    eventService.publish = async (_event) => {};
    configService.config = () => ({});
    historyService.clear();
  });

  describe('template', () => {
    test('has a initial dummy template.', () => {
      // GIVEN / WHEN
      const template = service.template();

      // THEN
      expect(template).toEqual('<svg></svg>');
    });
  });

  describe('loadTemplate', () => {
    test('issues an event when a template is loaded.', (done) => {
      // GIVEN
      eventService.publish = async (event) => {
        if (event.type === 'templateLoaded') {
          expect(event.data.template).toEqual(
            '<svg>my-custom-svg</svg>',
          );

          expect(state.template).toEqual(
            '<svg>my-custom-svg</svg>',
          );

          done();
        }
      };

      // WHEN
      service.loadTemplate('<svg>my-custom-svg</svg>');

      // THEN
      timeout(done);
    });

    test('issues a preview when a template is loaded.', (done) => {
      // A card does not need to be selected. A template can exist without referencing a card!
      // GIVEN / THEN
      eventService.publish = async (event) => {
        if (event.type === 'previewRenderStarted') {
          expect(event.data.card).toBeUndefined();
          done();
        }
      };

      // WHEN
      service.loadTemplate('<svg>my-custom-svg</svg>');

      timeout(done);
    });

    test('allows a loaded template to be undone.', () => {
      // GIVEN
      service.loadTemplate('<svg>my custom svg</svg>');

      // WHEN / THEN
      expect(historyService.history()).toHaveLength(1);

      // WHEN
      historyService.history()[0].undo();

      // THEN
      // Back to default...
      expect(service.template()).toEqual('<svg></svg>');
    });

    test('allows loading the template synchronously.', () => {
      // GIVEN / WHEN
      service.loadTemplate('<svg></svg>');

      // THEN
      expect(service.template()).toEqual('<svg></svg>');
    });

    test.todo(
      'if a card is previewed, and the template is modified, a preview event is issued. // TODO: It is not really clear "who" should consolidate changes done to template/card to trigger the preview, so it is done in each element for now...',
      (done) => {
        // GIVEN
        const card: Card = {
          id: 'test-card',
        };

        // WHEN

        // THEN
      },
    );
  });

  describe('apply', () => {
    test.each([
      ['empty value', '', {}, ''],
      ['empty value with card', '', { some: 'thing' }, ''],
      ['passed template', '<svg></svg>', {}, '<svg></svg>'],
      ['static value', '3', {}, '{{ 1 + 2 }}'],
      [
        'simple function',
        'Hello, World!',
        {},
        '{{ return "Hello, World" + "!"; }}',
      ],
      [
        'simple card injection with plain value',
        'Card Name: My Card',
        { name: 'My Card' },
        'Card Name: {{ $card.name }}',
      ],
      [
        'simple card injection with function',
        'Card Name: My Card',
        { name: 'My Card' },
        'Card Name: {{ return $card.name; }}',
      ],
      [
        'multiline function',
        'Sum is: 15',
        {},
        `Sum is: {{
          const a = 5;
          const b = 10;
          return a + b;
        }}`,
      ],
    ])(
      'card can be applied to template: "%s"',
      (
        _: string,
        expected: string,
        card: Card,
        template: Template,
      ) => {
        // GIVEN
        service.loadTemplate(template);

        // WHEN / THEN
        expect(
          service.apply(card, {} as RenderContext),
        ).toEqual(expected);
      },
    );

    test('configurations are accessible within the template.', () => {
      // GIVEN
      configService.config = () => {
        return {
          'my-config-key': 'my-config-value',
        };
      };

      service.loadTemplate(
        'Config Value: {{ return $config["my-config-key"]; }}',
      );
      const card: Card = {};

      // WHEN / THEN
      expect(
        service.apply(card, {} as RenderContext),
      ).toEqual('Config Value: my-config-value');
    });

    test('if a render job is submitted, the job information are accessible within the template.', () => {
      // GIVEN
      service.loadTemplate(
        'Render Job Name: {{ return $job.name; }}',
      );

      // WHEN / THEN
      expect(
        service.apply(
          {},
          {
            name: 'My Render Job',
            index: 0,
            settings: {
              format: 'png',
              size: { width: 1000, height: 1000 },
            },
          },
        ),
      ).toEqual('Render Job Name: My Render Job');
    });

    test('index is accessible within the template when provided in the render job.', () => {
      // GIVEN
      service.loadTemplate(
        'Render Job Index: {{ return $job.index; }}',
      );

      // WHEN / THEN
      expect(
        service.apply(
          {},
          {
            name: 'My Render Job',
            index: 5,
            settings: {
              format: 'png',
              size: { width: 1000, height: 1000 },
            },
          },
        ),
      ).toEqual('Render Job Index: 5');
    });

    test.each([
      ['warn' as LogLevel],
      ['error' as LogLevel],
      ['info' as LogLevel],
      ['debug' as LogLevel],
    ])(
      'issues a render %s event when a template is rendered that issues log messages.',
      (level: LogLevel, done) => {
        // GIVEN
        service.loadTemplate(
          `<svg>{{ $console.${level}("Rendering card...") }}</svg>`,
        );

        eventService.publish = async (event) => {
          // THEN
          if (event.type === 'renderLog') {
            expect(event.data.message).toBe(
              'Rendering card...',
            );
            expect(event.data.level).toBe(level);
            expect(event.data.card).toBe(dummyCard);
            done();
          }
        };

        // WHEN
        service.apply(dummyCard, {} as RenderContext);
        timeout(done);
      },
    );
  });
});
