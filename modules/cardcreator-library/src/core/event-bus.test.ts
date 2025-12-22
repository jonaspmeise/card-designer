/**
 * Test suite for EventBus functionality.
 * Tests the multi-event (conjunction) handler system.
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { EventBus } from './event-bus';
import { timeout } from '../test-utility';

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
    const unsubscribe = eventBus.on(['projectLoaded', 'fileOpened'], handler);

    expect(typeof unsubscribe).toBe('function');
  });

  test('should fire conjunction handler when all events are published', async (done) => {
    let projectEventReceived = false;
    let fileEventReceived = false;

    eventBus.on(['projectLoaded', 'fileOpened'], (event) => {
      projectEventReceived = event.type === 'projectLoaded';
      fileEventReceived = event.type === 'fileOpened';

      if (projectEventReceived && fileEventReceived) {
        done();
      }
    });

    // Publish first event
    await eventBus.publish({
      type: 'projectLoaded',
      projectId: 'test-proj',
      projectName: 'Test Project',
      timestamp: new Date(),
      correlationId: 'test-corr',
    });

    // Publish second event
    await eventBus.publish({
      type: 'fileOpened',
      fileId: 'test-file',
      filePath: '/path/to/file',
      projectId: 'test-proj',
      timestamp: new Date(),
      correlationId: 'test-corr',
    });

    timeout(done);
  });

  test('should allow unsubscribing from handlers', async () => {
    const unsubscribe = eventBus.on(['projectLoaded', 'fileOpened'], () => {
      throw new Error('should not be called!');
    });

    unsubscribe();

    // Publish events
    await eventBus.publish({
      type: 'projectLoaded',
      projectId: 'test-proj',
      projectName: 'Test Project',
      timestamp: new Date(),
      correlationId: 'test-corr',
    });

    await eventBus.publish({
      type: 'fileOpened',
      fileId: 'test-file',
      filePath: '/path/to/file',
      projectId: 'test-proj',
      timestamp: new Date(),
      correlationId: 'test-corr',
    });
  });

  test('should handle error events', async (done) => {
    eventBus.onError((error) => {
      expect(error.message).toBe('Test error');
      done();
    });

    // Register a handler that throws
    eventBus.on(['projectLoaded', 'fileOpened'], () => {
      throw new Error('Test error');
    });

    // Publish events
    await eventBus.publish({
      type: 'projectLoaded',
      projectId: 'test-proj',
      projectName: 'Test Project',
      timestamp: new Date(),
      correlationId: 'test-corr',
    });

    await eventBus.publish({
      type: 'fileOpened',
      fileId: 'test-file',
      filePath: '/path/to/file',
      projectId: 'test-proj',
      timestamp: new Date(),
      correlationId: 'test-corr',
    });
  });

  test('should call multi-event handler correctly', async (done) => {
    let projectLoadedEventTriggered = false;
    let fileOpenedEventTriggered = false;

    eventBus.on(['projectLoaded', 'fileOpened'], (event) => {
      if (event.type === 'projectLoaded') {
        projectLoadedEventTriggered = true;
      } else if (event.type === 'fileOpened') {
        fileOpenedEventTriggered = true;
      }

      if (projectLoadedEventTriggered && fileOpenedEventTriggered) {
        done();
      }
    });

    eventBus.clear();

    // Publish events after clearing
    await eventBus.publish({
      type: 'projectLoaded',
      projectId: 'test-proj',
      projectName: 'Test Project',
      timestamp: new Date(),
      correlationId: 'test-corr',
    });

    await eventBus.publish({
      type: 'fileOpened',
      fileId: 'test-file',
      filePath: '/path/to/file',
      projectId: 'test-proj',
      timestamp: new Date(),
      correlationId: 'test-corr',
    });
  });

  test('should clear all handlers and error listeners', async (done) => {
    let projectLoadedEventTriggered = false;
    let fileOpenedEventTriggered = false;

    eventBus.on(['projectLoaded', 'fileOpened'], (event) => {
      if (event.type === 'projectLoaded') {
        projectLoadedEventTriggered = true;
      } else if (event.type === 'fileOpened') {
        fileOpenedEventTriggered = true;
      }

      if (projectLoadedEventTriggered && fileOpenedEventTriggered) {
        done();
      }
    });

    eventBus.clear();

    // Publish events after clearing
    await eventBus.publish({
      type: 'projectLoaded',
      projectId: 'test-proj',
      projectName: 'Test Project',
      timestamp: new Date(),
      correlationId: 'test-corr',
    });

    await eventBus.publish({
      type: 'fileOpened',
      fileId: 'test-file',
      filePath: '/path/to/file',
      projectId: 'test-proj',
      timestamp: new Date(),
      correlationId: 'test-corr',
    });
  });

  test('should clear handlers for specific event type', async () => {
    let handler1Called = false;
    let handler2Called = false;

    // Handler 1 requires projectLoaded and fileOpened
    eventBus.on(['projectLoaded', 'fileOpened'], () => {
      handler1Called = true;
    });

    // Handler 2 requires only assetLoaded
    eventBus.on(['assetLoaded'], () => {
      handler2Called = true;
    });

    // Clear handlers for projectLoaded - this should remove handler1 entirely
    eventBus.clear('projectLoaded');

    // Publish projectLoaded - handler1 should not fire
    await eventBus.publish({
      type: 'projectLoaded',
      projectId: 'test-proj',
      projectName: 'Test Project',
      timestamp: new Date(),
      correlationId: 'test-corr',
    });

    expect(handler1Called).toBe(false); // Handler1 removed due to clearing projectLoaded

    // Publish assetLoaded - handler2 should fire
    await eventBus.publish({
      type: 'assetLoaded',
      assetId: 'asset-1',
      assetType: 'image',
      source: 'memory',
      timestamp: new Date(),
      correlationId: 'test-corr',
    });

    expect(handler2Called).toBe(true); // Handler2 still works
  });
});
