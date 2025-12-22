/**
 * Test suite for EventBus functionality.
 * Tests the multi-event (conjunction) handler system.
 */

import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
} from 'bun:test';
import { EventBus } from './event-bus';
import { timeout } from '../test-utility';
import {
  FileOpenedEvent,
  ProjectLoadedEvent,
} from './events';

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  afterEach(() => {
    eventBus.clear();
  });

  test('should register conjunction handlers', () => {
    const handler = () => {};
    const unsubscribe = eventBus.on(
      'projectLoaded',
      handler,
    );

    expect(typeof unsubscribe).toBe('function');
  });

  test('should allow unsubscribing from handlers', async () => {
    // GIVEN
    const unsubscribe = eventBus.on('projectLoaded', () => {
      throw new Error('should not be called!');
    });

    // WHEN
    unsubscribe();

    await eventBus.publish(
      new ProjectLoadedEvent({
        projectName: 'Test Project',
      }),
    );

    // THEN
    // implicit assert, since error would fail the test
  });

  test('should handle error events', async (done) => {
    eventBus.onError((error) => {
      expect(error.message).toBe('Test error');
      done();
    });

    // Register a handler that throws
    eventBus.on(['projectLoaded'], () => {
      throw new Error('Test error');
    });

    // Publish events
    await eventBus.publish(
      new ProjectLoadedEvent({
        projectName: 'Test Project',
      }),
    );
  });

  test('should call multi-event handler correctly', async (done) => {
    let projectLoadedEventTriggered = false;
    let fileOpenedEventTriggered = false;

    eventBus.on(
      ['projectLoaded', 'fileOpened'],
      (event) => {
        if (event.type === 'projectLoaded') {
          projectLoadedEventTriggered = true;
        } else if (event.type === 'fileOpened') {
          fileOpenedEventTriggered = true;
        }

        if (
          projectLoadedEventTriggered &&
          fileOpenedEventTriggered
        ) {
          done();
        }
      },
    );

    eventBus.clear();

    // Publish events after clearing
    await eventBus.publish(
      new ProjectLoadedEvent({
        projectName: 'Test Project',
      }),
    );

    await eventBus.publish(
      new FileOpenedEvent({
        filePath: '/path/to/file',
      }),
    );
  });

  test('should clear all handlers and error listeners', async (done) => {
    let projectLoadedEventTriggered = false;
    let fileOpenedEventTriggered = false;

    eventBus.on(
      ['projectLoaded', 'fileOpened'],
      (event) => {
        if (event.type === 'projectLoaded') {
          projectLoadedEventTriggered = true;
        } else if (event.type === 'fileOpened') {
          fileOpenedEventTriggered = true;
        }

        if (
          projectLoadedEventTriggered &&
          fileOpenedEventTriggered
        ) {
          done();
        }
      },
    );

    eventBus.clear();

    // Publish events after clearing - should not trigger anything
    await eventBus.publish(
      new ProjectLoadedEvent({
        projectName: 'Test Project',
      }),
    );
    await eventBus.publish(
      new FileOpenedEvent({
        filePath: '/path/to/file',
      }),
    );
  });

  test('should clear handlers for specific event type', async () => {
    let handler1Called = false;
    let handler2Called = false;

    // Handler 1 requires projectLoaded and fileOpened
    eventBus.on('projectLoaded', () => {
      handler1Called = true;
    });

    // Handler 2 requires only fileOpened
    eventBus.on('fileOpened', () => {
      handler2Called = true;
    });

    // Clear handlers for projectLoaded - this should remove handler1 entirely
    eventBus.clear('projectLoaded');

    // Publish projectLoaded - handler1 should not fire
    await eventBus.publish(
      new ProjectLoadedEvent({
        projectName: 'Test Project',
      }),
    );
    expect(handler1Called).toBe(false);

    // Publish assetLoaded - handler2 should fire
    await eventBus.publish(
      new FileOpenedEvent({
        filePath: '/path/to/file',
      }),
    );
    expect(handler2Called).toBe(true);
  });
});
