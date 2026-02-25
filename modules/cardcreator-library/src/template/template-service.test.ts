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
import { Template } from './template-types';
import { ConfigService } from '../config/config-service';
import { LogLevel } from '../types/domain';

describe('TemplateService', () => {
  let service: TemplateService;
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

  beforeEach(() => {
    service = new TemplateService({
      logger: logger,
      eventService: eventService,
      historyService: historyService,
      configService: configService,
    });

    logger.info = async (_msg: string) => {};
    logger.debug = async (_msg: string) => {};
    logger.warn = async (_msg: string) => {};
    logger.error = async (_msg: string) => {};

    eventService.publish = async (_event) => {};
    historyService.push = (_command: Command) => {
      return _command as any;
    };
    configService.config = () => ({});
  });

  describe('template', () => {
    test('has a initial dummy template.', () => {
      // GIVEN / WHEN
      const template = service.template();

      // THEN
      expect(template.source).toEqual('<svg></svg>');
    });
  });

  describe('loadTemplate', () => {
    test('issues an event when a template is loaded.', (done) => {
      // GIVEN
      eventService.publish = async (event) => {
        if (event.type === 'templateLoaded') {
          expect(event.data.template.source).toEqual(
            '<svg></svg>',
          );
          done();
        }
      };
      // WHEN
      service.loadTemplate('<svg></svg>');
      // THEN
      timeout(done);
    });

    test('allows loading the template synchronously.', () => {
      // GIVEN / WHEN
      service.loadTemplate('<svg></svg>');

      // THEN
      expect(service.template().source).toEqual(
        '<svg></svg>',
      );
    });

    test('if a card is previewed, and the template is modified, a preview event is issued. // TODO: It is not really clear "who" should consolidate changes done to template/card to trigger the preview, so it is done in each element for now...', (done) => {
      // GIVEN
      const card: Card = {
        id: 'test-card',
      };

      // WHEN
      library.render.template;

      // THEN
    });
  });

  describe('apply', () => {
    test.each([
      ['empty value', '', {}, { source: '' }],
      [
        'empty value with card',
        '',
        { some: 'thing' },
        { source: '' },
      ],
      [
        'passed template',
        '<svg></svg>',
        {},
        { source: '<svg></svg>' },
      ],
      ['static value', '3', {}, { source: '{{ 1 + 2 }}' }],
      [
        'simple function',
        'Hello, World!',
        {},
        { source: '{{ return "Hello, World" + "!"; }}' },
      ],
      [
        'simple card injection with plain value',
        'Card Name: My Card',
        { name: 'My Card' },
        { source: 'Card Name: {{ $card.name }}' },
      ],
      [
        'simple card injection with function',
        'Card Name: My Card',
        { name: 'My Card' },
        {
          source: 'Card Name: {{ return $card.name; }}',
        },
      ],
      [
        'multiline function',
        'Sum is: 15',
        {},
        {
          source: `Sum is: {{
          const a = 5;
          const b = 10;
          return a + b;
        }}`,
        },
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
        service.loadTemplate(template.source);
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
