import {
  describe,
  test,
  expect,
  beforeEach,
  mock,
} from 'bun:test';
import { EventService } from '../events/event-service';
import { timeout } from '../test-utility';
import { DialogService } from './dialog-service';
import { DialogOptions } from './dialog-types';

describe('DialogService', () => {
  let service: DialogService;
  let eventService: EventService;
  const logger = {
    ...console,
  };

  const defaultOptions: DialogOptions = {
    title: 'Test Dialog',
    message: 'Test message',
    level: 'info',
    choices: [
      { label: 'OK', style: 'primary' },
      { label: 'Cancel', style: 'secondary' },
    ],
  };

  beforeEach(() => {
    // GIVEN
    eventService = new EventService({
      logger: logger,
    });

    service = new DialogService({
      logger: logger,
      eventService: eventService,
    });

    logger.info = () => {};
    logger.debug = () => {};
    logger.warn = () => {};
    logger.error = () => {};
  });

  describe('show', () => {
    test('emits dialogOpened event with correct data', (done) => {
      // GIVEN
      const okCallback = async () => {};
      const cancelCallback = async () => {};

      // WHEN
      eventService.on('dialogOpened', (event) => {
        // THEN
        expect(event.data.title).toBe('Test Dialog');
        expect(event.data.message).toBe('Test message');
        expect(event.data.level).toBe('info');
        expect(event.data.choices).toEqual([
          { label: 'OK', style: 'primary' },
          { label: 'Cancel', style: 'secondary' },
        ]);
        expect(event.data.forced).toBe(false);
        expect(typeof event.data.pick).toBe('function');
        done();
      });

      service.show(defaultOptions, {
        OK: okCallback,
        Cancel: cancelCallback,
      });

      timeout(done);
    });

    test('respects forced option', (done) => {
      // GIVEN
      const options = { ...defaultOptions, forced: true };

      // WHEN
      eventService.on('dialogOpened', (event) => {
        // THEN
        expect(event.data.forced).toBe(true);
        done();
      });

      service.show(options, { OK: async () => {} });

      timeout(done);
    });

    test('defaults forced to false when not provided', (done) => {
      // WHEN
      eventService.on('dialogOpened', (event) => {
        // THEN
        expect(event.data.forced).toBe(false);
        done();
      });

      service.show(defaultOptions, { OK: async () => {} });

      timeout(done);
    });
  });

  describe('pick', () => {
    test('executes the callback for the picked choice', (done) => {
      // GIVEN
      const okCallback = async () => {
        done();
      };
      const cancelCallback = mock(async () => {});

      eventService.on('dialogOpened', (event) => {
        // WHEN
        event.data.pick('OK');
      });

      // THEN
      service.show(defaultOptions, {
        OK: okCallback,
        Cancel: cancelCallback,
      });

      timeout(done);
    });

    test('throws an error if an option is picked that does not exist', (done) => {
      // GIVEN
      eventService.on('dialogOpened', (event) => {
        // WHEN
        expect(() =>
          event.data.pick('NonExistentChoice'),
        ).toThrow();
        // THEN
        done();
      });

      service.show(defaultOptions, { OK: async () => {} });

      timeout(done);
    });
  });
});
