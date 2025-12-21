/**
 * Event bus implementation for the card-creator library.
 * Provides type-safe event publishing and subscription with support for
 * multi-event handlers (event conjunction).
 *
 * @module EventBus
 */

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
 * Handler function that processes multiple event types (conjunction).
 * This allows reacting to a specific combination of events.
 */
type ConjunctionHandler = (...events: DomainEvent[]) => void | Promise<void>;

/**
 * Internal registration for conjunction handlers (multiple event types).
 */
interface ConjunctionRegistration {
  id: string;
  eventTypes: string[];
  handler: ConjunctionHandler;
  collectedEvents: Map<string, DomainEvent>;
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
  private readonly handlerRegistry: Map<DomainEvent['type'], Set<ConjunctionRegistration>> =
    new Map();

  /** Logger instance for event bus operations */
  private readonly logger: any;

  /** Handlers for unhandled errors in listeners */
  private readonly errorHandlers: ((error: Error, event?: CardCreatorEvent) => void)[] = [];

  /**
   * Create a new EventBus instance.
   *
   * @param logger - Logger instance for diagnostic output
   */
  constructor(logger?: any) {
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
    eventTypes: E[],
    handler: CardCreatorEventTypeMap[E]
  ): () => void {
    const eventTypeStrings = eventTypes as string[];
    const registrationId = generateId();

    const registration: ConjunctionRegistration = {
      id: registrationId,
      eventTypes: eventTypeStrings,
      handler,
      collectedEvents: new Map(),
    };

    this.conjunctionHandlers.push(registration);

    this.logger?.debug(
      `Conjunction handler registered for events: ${eventTypeStrings.join(', ')}`,
      {
        registrationId,
      }
    );

    // Return unsubscribe function
    return () => {
      const index = this.conjunctionHandlers.findIndex((h) => h.id === registrationId);
      if (index >= 0) {
        this.conjunctionHandlers.splice(index, 1);
        this.logger?.debug(`Conjunction handler unsubscribed`, { registrationId });
      }
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
      for (const registration of this.conjunctionHandlers) {
        registration.collectedEvents.set(eventType, event);

        // Check if all required events have been collected
        const hasAllEvents = registration.eventTypes.every((type) =>
          registration.collectedEvents.has(type)
        );

        if (hasAllEvents) {
          try {
            const conjunctionEvents = registration.eventTypes.map(
              (type) => registration.collectedEvents.get(type)!
            );
            await registration.handler(...conjunctionEvents);

            // Clear collected events for next cycle
            registration.collectedEvents.clear();
          } catch (error) {
            this._emitError(error as Error, event);
          }
        }
      }
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
      const eventTypeStr = eventType as string;
      // Filter to keep only registrations that don't have this event type
      const remainingHandlers = this.conjunctionHandlers.filter((registration) => {
        const index = registration.eventTypes.indexOf(eventTypeStr);
        if (index >= 0) {
          // Remove the event type from this registration
          registration.eventTypes.splice(index, 1);
          registration.collectedEvents.delete(eventTypeStr);
          // If no event types left, don't keep this registration
          return registration.eventTypes.length > 0;
        }
        return true; // Keep registrations that don't have this event type
      });

      // Truncate the array and add back the remaining handlers
      this.conjunctionHandlers.length = 0;
      this.conjunctionHandlers.push(...remainingHandlers);
      this.logger?.debug(`EventBus cleared for event type: ${eventTypeStr}`);
    } else {
      this.conjunctionHandlers.length = 0;
      this.errorHandlers.length = 0;
      this.logger?.debug('EventBus cleared');
    }
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
