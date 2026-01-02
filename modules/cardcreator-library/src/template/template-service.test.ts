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
import { HistoryService } from '../history/history-service';
import { TemplateService } from './template-service';
import { Card } from '../render/render-types';
import { Template } from './template-types';

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

  beforeEach(() => {
    service = new TemplateService({
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
        expect(service.apply(card)).toEqual(expected);
      },
    );
  });
});
