/**
 * Event bus implementation for the card-creator library.
 * Provides type-safe event publishing and subscription with support for
 * multi-event handlers (event conjunction).
 *
 * @module EventBus
 */

import {
  Clearable,
  DependableService,
} from '../architecture/types';
import { generateId } from '../cross-cutting-concerns';
import type {
  CardCreatorEvent,
  EventKeys,
  SingleEvent,
} from '../types/events';
import { EventServiceDependencies } from './event-types';
import { EventHandler, InternalEventBus } from './events';

/**
 * Internal representation of an handler method.
 * Maintains type relationship between event types, handler, and collected events.
 */
interface EventRegistryEntry<
  DOMAIN extends SingleEvent<EventKeys>,
> {
  id: string;
  type: DOMAIN['type'];
  handler: EventHandler<DOMAIN>;
  collectedEvents: Array<DOMAIN['data']>;
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
 * const eventService = new EventBus(logger);
 *
 * // Event handler
 * eventService.on('projectLoaded', event => {
 *   console.log(`Loaded project "${event.data.name}"!`);
 * });
 *
 * // Publish an event
 * await eventService.publish({
 *   type: 'projectLoaded',
 *   projectId: '123',
 *   name: 'My Project'
 * });
 * ```
 */
export class EventService
  extends DependableService<EventServiceDependencies>
  implements InternalEventBus, Clearable
{
  /** Handles for all kind of events. */
  private handlerRegistry: Partial<{
    [K in EventKeys]: Set<
      EventRegistryEntry<SingleEvent<K>>
    >;
  }> = {};

  /** Handlers for unhandled errors in listeners */
  private readonly errorHandlers: ((
    error: Error,
    event?: CardCreatorEvent,
  ) => void)[] = [];

  constructor(_dependencies: EventServiceDependencies) {
    super(_dependencies, _dependencies.logger);
  }

  on<K extends EventKeys>(
    type: K,
    handler: EventHandler<SingleEvent<K>>,
  ): () => void {
    const registrationId = generateId();

    const entry: EventRegistryEntry<SingleEvent<K>> = {
      type,
      handler: handler,
      collectedEvents: [],
      id: registrationId,
    };

    this._registerHandler(type, entry);

    this._dependencies.logger.debug(
      `Handler (#${registrationId}) registered for event "${type}".`,
    );

    // Return unsubscribe function
    return () => {
      this.handlerRegistry[type]?.delete(entry);

      this._dependencies.logger.debug(
        `Handler (#${registrationId}) unregistered for event "${type}".`,
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

    this._dependencies.logger.debug(
      `Publishing event of type "${eventType}"...`,
    );

    try {
      // Process conjunction handlers; isolate errors per handler so one failing
      // listener doesn't prevent other listeners from running.
      this._dependencies.logger.debug(
        `${
          this.handlerRegistry[eventType]?.size ?? 0
        } registered handlers found for event: ${eventType}`,
      );
      this.handlerRegistry[eventType]?.forEach(
        (handler) => {
          this._dependencies.logger.debug(
            `Invoking handler (#${handler.id}) for event: ${eventType}`,
          );

          try {
            handler.handler(event);
          } catch (err) {
            this._emitError(err as Error, event);
          }
        },
      );
    } catch (error) {
      this._emitError(error as Error, event);
    }
  }

  public clear(eventType?: EventKeys): void {
    if (eventType !== undefined) {
      delete this.handlerRegistry[eventType];

      this._dependencies.logger.debug(
        `EventBus cleared for event type: ${eventType}`,
      );
    } else {
      this.handlerRegistry = {};

      this.errorHandlers.length = 0;
      this._dependencies.logger.debug(
        'EventBus cleared for all event types and error handlers',
      );
    }
  }

  private _registerHandler<T extends EventKeys>(
    eventType: T,
    registration: EventRegistryEntry<SingleEvent<T>>,
  ): void {
    if (!(eventType in this.handlerRegistry)) {
      this._dependencies.logger.debug(
        `Creating new handler set for event type: ${eventType}`,
      );
      this.handlerRegistry[eventType] = new Set<
        EventRegistryEntry<SingleEvent<T>>
      >();
    }

    this.handlerRegistry[eventType]?.add(registration);

    this._dependencies.logger.debug(
      `Handler registered for event type: ${eventType}`,
      {
        registrationId: registration.id,
      },
    );
  }

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
    this._dependencies.logger.error(
      `Error in event handler of type "${event?.type}"`,
      error,
    );

    for (const handler of this.errorHandlers) {
      try {
        handler(error, event);
      } catch (err) {
        this._dependencies.logger.error(
          'Error in error handler...?',
          err as Error,
        );
      }
    }
  }
}
