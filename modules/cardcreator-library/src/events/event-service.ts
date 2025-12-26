/**
 * Event bus implementation for the card-creator library.
 * Provides type-safe event publishing and subscription with support for
 * multi-event handlers (event conjunction).
 *
 * @module EventBus
 */

import { generateId } from '../cross-cutting-concerns';
import { Logger } from '../index.shared';
import type {
  CardCreatorEvent,
  EventKeys,
  SingleEvent,
} from '../types/events';
import { EventHandler, InternalEventBus } from './events';

/**
 * Internal representation of an handler method.
 * Maintains type relationship between event types, handler, and collected events.
 */
interface EventRegistryEntry<
  DOMAIN extends SingleEvent<EventKeys>
> {
  id: string;
  type: DOMAIN['type'];
  handler: EventHandler<DOMAIN>;
  collectedEvents: Array<DOMAIN['data']>;
};


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
 * // Event handler
 * eventBus.on('projectLoaded', event => {
 *   console.log(`Loaded project "${event.data.projectName}"!`);
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
export class EventService implements InternalEventBus {
  /** Handles for all kind of events. */
  private handlerRegistry: Partial<{
    [K in EventKeys]: Set<EventRegistryEntry<SingleEvent<K>>>
  }> = {};

  /** Logger instance for event bus operations */
  private readonly logger?: Logger;

  /** Handlers for unhandled errors in listeners */
  private readonly errorHandlers: ((
    error: Error,
    event?: CardCreatorEvent,
  ) => void)[] = [];

  /**
   * Create a new EventBus instance.
   *
   * @param logger - Logger instance for diagnostic output
   */
  constructor(logger?: Logger) {
    this.logger = logger;
  }

  on<K extends EventKeys>(
    type: K,
    handler: EventHandler<
      SingleEvent<K>
    >,
  ): () => void {
    const registrationId = generateId();

    const entry: EventRegistryEntry<
      SingleEvent<K>
    > = {
      type,
      handler: handler,
      collectedEvents: [],
      id: registrationId,
    };

    this._registerHandler(type, entry);

    this.logger?.debug(
      `Handler (#${registrationId}) registered for event "${type}".`
    );

    // Return unsubscribe function
    return () => {
      this.handlerRegistry[type]?.delete(entry);

      this.logger?.debug(
        `Handler (#${registrationId}) unregistered for event "${type}".`
      );
    };
  }

  onError(
    handler: (
      error: Error,
      event?: CardCreatorEvent,
    ) => void,
  ): () => void {
    this.errorHandlers.push(handler);
    return () => {
      const index = this.errorHandlers.indexOf(handler);
      if (index >= 0) {
        this.errorHandlers.splice(index, 1);
      }
    };
  }

  async publish(event: CardCreatorEvent): Promise<void> {
    const eventType = event.type;

    this.logger?.debug(`Publishing event: ${eventType}...`);

    try {
      // Process conjunction handlers; isolate errors per handler so one failing
      // listener doesn't prevent other listeners from running.
      (this.handlerRegistry[eventType])
        ?.forEach(handler => {
          this.logger?.debug(
            `Invoking handler (#${handler.id}) for event: ${eventType}`,
          );

          try {
            handler.handler(event);
          } catch (err) {
            this._emitError(err as Error, event);
          }
        });
    } catch (error) {
      this._emitError(error as Error, event);
    }
  }

  public clear(eventType?: EventKeys): void {
    if (eventType !== undefined) {
      delete this.handlerRegistry[eventType];

      this.logger?.debug(
        `EventBus cleared for event type: ${eventType}`,
      );
    } else {
      this.handlerRegistry = {};

      this.errorHandlers.length = 0;
      this.logger?.debug(
        'EventBus cleared for all event types and error handlers',
      );
    }
  }

  private _registerHandler<T extends EventKeys>(
    eventType: T,
    registration: EventRegistryEntry<
      SingleEvent<T>
    >,
  ): void {
    if (!(eventType in this.handlerRegistry)) {
      this.logger?.debug(
        `Creating new handler set for event type: ${eventType}`,
      );
      this.handlerRegistry[eventType] = new Set<EventRegistryEntry<SingleEvent<T>>>();
    }

    this.handlerRegistry[eventType]?.add(registration);

    this.logger?.debug(
      `Handler registered for event type: ${eventType}`,
      {
        registrationId: registration.id,
      },
    );
  };

  /**
   * Internal method to emit errors to registered error handlers.
   *
   * @param error - The error that occurred
   * @param event - The event that was being processed (optional)
   */
  private _emitError(
    error: Error,
    event?: CardCreatorEvent,
  ): void {
    this.logger?.error(
      `Error in event handler of type "${event?.type}"`,
      error,
    );

    for (const handler of this.errorHandlers) {
      try {
        handler(error, event);
      } catch (err) {
        this.logger?.error(
          'Error in error handler...?',
          err as Error,
        );
      }
    }
  }
}
