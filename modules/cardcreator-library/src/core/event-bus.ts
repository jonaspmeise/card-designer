/**
 * Event bus implementation for the card-creator library.
 * Provides type-safe event publishing and subscription with support for
 * multi-event handlers (event conjunction).
 *
 * @module EventBus
 */

import { Logger } from '../index.shared';
import type { CardCreatorEvent, CardCreatorEventTypeMap, DomainEvent } from '../types/events';

/**
 * Generate a UUID v4 string.
 * Simple implementation that works in both Node.js and browser environments.
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback implementation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Handler function that processes one or multiple event types.
 */
type EventHandler<DOMAIN extends DomainEvent> = (event: DOMAIN) => void | Promise<void>;

/**
 * Internal representation of an handler method.
 * Maintains type relationship between event types, handler, and collected events.
 */
interface EventRegistryEntry<DOMAINS extends readonly DomainEvent[] = readonly DomainEvent[]> {
  id: string;
  eventTypes: ReadonlyArray<DOMAINS[number]['type']>;
  handler: EventHandler<DOMAINS[number]>;
  collectedEvents: DOMAINS[number][];
}

/**
 * Event bus for managing event subscriptions and publications.
 *
 * Features:
 * - Type-safe event publishing and subscription
 * - Multi-event handlers with automatic conjunction resolution
 * - Error handling and propagation to error listeners
 *
 * @example
 * ```typescript
 * const eventBus = new EventBus(logger);
 *
 * // Multi-event handler (conjunction)
 * eventBus.on(['projectLoaded', 'fileOpened'], (projectEvent, fileEvent) => {
 *   console.log('Both events occurred');
 * });
 *
 * // Publish an event
 * await eventBus.publish({
 *   type: 'projectLoaded',
 *   projectId: '123',
 *   projectName: 'My Project',
 *   timestamp: new Date(),
 *   correlationId: 'abc-123',
 * });
 * ```
 */
export class EventBus {
  /** Handles for all kind of events. */
  private readonly handlerRegistry: Map<string, Set<EventRegistryEntry<readonly DomainEvent[]>>> =
    new Map();

  /** Logger instance for event bus operations */
  private readonly logger?: Logger;

  /** Handlers for unhandled errors in listeners */
  private readonly errorHandlers: ((error: Error, event?: CardCreatorEvent) => void)[] = [];

  /**
   * Create a new EventBus instance.
   *
   * @param logger - Logger instance for diagnostic output
   */
  constructor(logger?: Logger) {
    this.logger = logger;
  }

  /**
   * Subscribe to multiple events at the same time.
   *
   * @param eventTypes - Array of event types to listen for.
   * @param handler - Function to call when any of the specified events is called.
   * @returns Unsubscribe function to remove the handler.
   *
   * @example
   * ```typescript
   * eventBus.on(
   *   ['projectLoaded', 'fileOpened'],
   *   (projectEvent, fileEvent) => {
   *     console.log('Project was loaded or file was loaded!');
   *   }
   * );
   * ```
   */
  on<E extends keyof CardCreatorEventTypeMap>(
    eventTypes: E | E[],
    handler: EventHandler<CardCreatorEventTypeMap[E]>
  ): () => void {
    const registrationId = generateId();
    const resolvedEventTypes = Array.isArray(eventTypes) ? eventTypes : [eventTypes];

    type EventTypes = DomainEvent | CardCreatorEventTypeMap[E];
    const populatedHandler: EventRegistryEntry<readonly EventTypes[]> = {
      eventTypes: eventTypes as ReadonlyArray<EventTypes['type']>,
      handler: handler as EventHandler<EventTypes>,
      collectedEvents: [],
      id: registrationId,
    };

    resolvedEventTypes.forEach((eventType) => {
      this._registerHandler(eventType, populatedHandler);
    });

    this.logger?.debug(
      `Conjunction handler (#${registrationId}) registered for events: ${resolvedEventTypes.join(
        ', '
      )}`
    );

    // Return unsubscribe function
    return () => {
      resolvedEventTypes
        .map((t) => this.handlerRegistry.get(t)!)
        .forEach((set) => set.delete(populatedHandler));

      this.logger?.debug(
        `Conjunction handler (#${registrationId}) unregistered from events: ${resolvedEventTypes.join(
          ', '
        )}`
      );
    };
  }

  /**
   * Subscribe to error events that occur during event handling.
   *
   * @param handler - Function to call when an error occurs
   * @returns Unsubscribe function
   */
  onError(handler: (error: Error, event?: CardCreatorEvent) => void): () => void {
    this.errorHandlers.push(handler);
    return () => {
      const index = this.errorHandlers.indexOf(handler);
      if (index >= 0) {
        this.errorHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Publish an event to all registered handlers.
   * Executes handlers in registration order and handles errors gracefully.
   *
   * @param event - The event to publish
   * @throws Never throws; errors are passed to error handlers
   *
   * @example
   * ```typescript
   * await eventBus.publish({
   *   type: 'projectLoaded',
   *   projectId: '123',
   *   projectName: 'My Project',
   *   timestamp: new Date(),
   *   correlationId: 'abc-123',
   * });
   * ```
   */
  async publish(event: CardCreatorEvent): Promise<void> {
    const eventType = event.type;

    this.logger?.debug(`Publishing event: ${eventType}`, {
      correlationId: event.correlationId,
    });

    try {
      // Process conjunction handlers
      this.handlerRegistry.get(eventType)?.forEach((handler) => {
        this.logger?.debug(`Invoking handler (#${handler.id}) for event: ${eventType}`, {
          correlationId: event.correlationId,
        });

        handler.handler(event);
      });
    } catch (error) {
      this._emitError(error as Error, event);
    }
  }

  /**
   * Clear all handlers and error listeners, optionally for a specific event type.
   * Useful for testing and cleanup.
   *
   * @param eventType - Optional event type to clear handlers for. If not provided, clears all handlers.
   */
  clear(eventType?: keyof CardCreatorEventTypeMap): void {
    if (eventType) {
      this.handlerRegistry.delete(eventType);
      this.logger?.debug(`EventBus cleared for event type: ${eventType}`);
    } else {
      this.handlerRegistry.clear();
      this.errorHandlers.length = 0;
      this.logger?.debug('EventBus cleared for all event types and error handlers');
    }
  }

  private _registerHandler<E extends DomainEvent>(
    eventType: E['type'],
    registration: EventRegistryEntry<readonly DomainEvent[]>
  ): void {
    if (!this.handlerRegistry.has(eventType)) {
      this.logger?.debug(`Creating new handler set for event type: ${eventType}`);
      this.handlerRegistry.set(eventType, new Set());
    }

    this.handlerRegistry.get(eventType)!.add(registration);
    this.logger?.debug(`Handler registered for event type: ${eventType}`, {
      registrationId: registration.id,
    });
  }

  /**
   * Internal method to emit errors to registered error handlers.
   *
   * @param error - The error that occurred
   * @param event - The event that was being processed (optional)
   */
  private _emitError(error: Error, event?: CardCreatorEvent): void {
    this.logger?.error('Error in event handler', error, {
      eventType: event?.type,
      correlationId: event?.correlationId,
    });

    for (const handler of this.errorHandlers) {
      try {
        handler(error, event);
      } catch (err) {
        // Prevent error handlers from breaking the system
        this.logger?.error('Error in error handler', err as Error);
      }
    }
  }
}
