/**
 * Test suite for eventService functionality.
 * Tests the multi-event (conjunction) handler system.
 */

import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
} from 'bun:test';
import { EventService } from './event-service';

describe('EventService', () => {
  let eventService: EventService;

  beforeEach(() => {
    eventService = new EventService();
  });

  afterEach(() => {
    eventService?.clear();
  });

  test('should register conjunction handlers', () => {
    const handler = () => {};
    const unsubscribe = eventService.on(
      'projectLoaded',
      handler,
    );

    expect(typeof unsubscribe).toBe('function');
  });

  test('should allow unsubscribing from handlers', async () => {
    // GIVEN
    const unsubscribe = eventService.on('projectLoaded', () => {
      throw new Error('should not be called!');
    });

    // WHEN
    unsubscribe();

    await eventService.publish({
      type: 'projectLoaded',
      data: {
        name: 'Test Project'
      }
    });

    // THEN
    // implicit assert, since error would fail the test
  });

  test('should handle error events', async (done) => {
    eventService.onError((error) => {
      expect(error.message).toBe('Test error');
      done();
    });

    // Register a handler that throws
    eventService.on('projectLoaded', () => {
      throw new Error('Test error');
    });

    // Publish events
    await eventService.publish({
      type: 'projectLoaded',
      data: {
        name: 'Test Project'
      }
    });
  });

  test('should clear all handlers and error listeners', async () => {
    eventService.on(
      'projectLoaded',
      _ => {
        throw new Error('should not be called!');
      },
    );
    eventService.on(
      'fileOpened',
      _ => {
        throw new Error('should not be called!');
      }
    )

    eventService.clear();

    // Publish events after clearing - should not trigger anything
    await eventService.publish({
      type: 'projectLoaded',
      data: {
        name: 'Test Project'
      }
    });

    await eventService.publish({
      type: 'fileOpened',
      data: {
        filePath: '/my/file/path'
      }
    });
  });

  test('should clear handlers for specific event type', async () => {
    let handler1Called = false;
    let handler2Called = false;

    // Handler 1 requires projectLoaded and fileOpened
    eventService.on('projectLoaded', () => {
      handler1Called = true;
    });

    // Handler 2 requires only fileOpened
    eventService.on('fileOpened', () => {
      handler2Called = true;
    });

    // Clear handlers for projectLoaded - this should remove handler1 entirely
    eventService.clear('projectLoaded');

    // Publish projectLoaded - handler1 should not fire
    await eventService.publish({
      type: 'projectLoaded',
      data: {
        name: 'Test Project'
      }
    });
    expect(handler1Called).toBe(false);

    // Publish assetLoaded - handler2 should fire
    await eventService.publish({
      type: 'fileOpened',
      data: {
        filePath: '/my/file/path'
      }
    });
    expect(handler2Called).toBe(true);
  });
});
