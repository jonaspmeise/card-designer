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
 * Handler function that processes a single event type.
 */
type EventHandler<T extends DomainEvent> = (event: T) => void | Promise<void>;

/**
 * Handler function that processes multiple event types (conjunction).
 * This allows reacting to a specific combination of events.
 */
type ConjunctionHandler = (...events: DomainEvent[]) => void | Promise<void>;

/**
 * Internal handler registration for a single event type.
 */
interface HandlerRegistration<T extends DomainEvent> {
  id: string;
  handler: EventHandler<T>;
  priority: number;
  once: boolean;
}

/**
 * Internal registration for conjunction handlers (multiple event types).
 */
interface ConjunctionRegistration {
  id: string;
  eventTypes: string[];
  handler: ConjunctionHandler;
  priority: number;
  collectedEvents: Map<string, DomainEvent>;
}

/**
 * Event bus for managing event subscriptions and publications.
 *
 * Features:
 * - Type-safe event publishing and subscription
 * - Multi-event handlers with automatic conjunction resolution
 * - Handler priorities for execution ordering
 * - One-time handlers with automatic cleanup
 * - Error handling and propagation to error listeners
 *
 * @example
 * ```typescript
 * const eventBus = new EventBus(logger);
 *
 * // Single event handler
 * eventBus.on('projectLoaded', (event) => {
 *   console.log(`Project ${event.projectName} loaded`);
 * });
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
  /** Single-event handlers mapped by event type */
  private readonly handlers = new Map<string, HandlerRegistration<any>[]>();

  /** Conjunction handlers for multi-event subscriptions */
  private readonly conjunctionHandlers: ConjunctionRegistration[] = [];

  /** Logger instance for event bus operations */
  private readonly logger: any; // ILogger interface

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
   * Subscribe to an event or multiple events.
   *
   * For single event:
   * @param eventType - The type of event to listen for
   * @param handler - Function to call when event is published
   * @param options - Subscription options
   * @returns Unsubscribe function to remove the handler
   *
   * For multiple events (conjunction):
   * @param eventTypes - Array of event types to listen for
   * @param handler - Function to call when all events have been published
   * @param options - Subscription options
   * @returns Unsubscribe function to remove the handler
   *
   * @example
   * ```typescript
   * // Single event
   * const unsubscribe = eventBus.on('projectLoaded', (event) => {
   *   console.log(event);
   * });
   *
   * // Multiple events (conjunction)
   * eventBus.on(
   *   ['projectLoaded', 'fileOpened'],
   *   (projectEvent, fileEvent) => {
   *     console.log('Both events occurred');
   *   }
   * );
   * ```
   */
  on<K extends keyof CardCreatorEventTypeMap>(
    eventType: K,
    handler: EventHandler<CardCreatorEventTypeMap[K]>,
    options?: { priority?: number; once?: boolean }
  ): () => void;

  on(
    eventTypes: (keyof CardCreatorEventTypeMap)[],
    handler: ConjunctionHandler,
    options?: { priority?: number; once?: boolean }
  ): () => void;

  on(
    eventTypeOrTypes: any,
    handler: any,
    options?: { priority?: number; once?: boolean }
  ): () => void {
    // Handle multi-event (conjunction) case
    if (Array.isArray(eventTypeOrTypes)) {
      const eventTypes = eventTypeOrTypes as string[];
      const registrationId = generateId();
      const priority = options?.priority ?? 0;
      const once = options?.once ?? false;

      const registration: ConjunctionRegistration = {
        id: registrationId,
        eventTypes,
        handler,
        priority,
        collectedEvents: new Map(),
      };

      this.conjunctionHandlers.push(registration);
      // Sort by priority
      this.conjunctionHandlers.sort((a, b) => b.priority - a.priority);

      this.logger?.debug(`Conjunction handler registered for events: ${eventTypes.join(', ')}`, {
        registrationId,
        priority,
        once,
      });

      // Return unsubscribe function
      return () => {
        const index = this.conjunctionHandlers.findIndex((h) => h.id === registrationId);
        if (index >= 0) {
          this.conjunctionHandlers.splice(index, 1);
          this.logger?.debug(`Conjunction handler unsubscribed`, { registrationId });
        }
      };
    }

    // Handle single-event case
    const handlerId = generateId();
    const priority = options?.priority ?? 0;
    const once = options?.once ?? false;

    const registration: HandlerRegistration<any> = {
      id: handlerId,
      handler,
      priority,
      once,
    };

    const eventHandlers = this.handlers.get(eventTypeOrTypes as string) ?? [];
    eventHandlers.push(registration);
    // Sort by priority (higher priority first)
    eventHandlers.sort((a, b) => b.priority - a.priority);
    this.handlers.set(eventTypeOrTypes as string, eventHandlers);

    this.logger?.debug(`Handler registered for event: ${eventTypeOrTypes as string}`, {
      handlerId,
      priority,
      once,
    });

    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(eventTypeOrTypes as string);
      if (handlers) {
        const index = handlers.findIndex((h) => h.id === handlerId);
        if (index >= 0) {
          handlers.splice(index, 1);
          this.logger?.debug(`Handler unsubscribed from event: ${eventTypeOrTypes as string}`, {
            handlerId,
          });
        }
      }
    };
  }

  /**
   * Subscribe to an event that fires only once, then automatically unsubscribes.
   *
   * @param eventType - The type of event to listen for
   * @param handler - Function to call when event is published
   * @param options - Subscription options
   * @returns Unsubscribe function to remove the handler before it fires
   */
  once<K extends keyof CardCreatorEventTypeMap>(
    eventType: K,
    handler: EventHandler<CardCreatorEventTypeMap[K]>,
    options?: { priority?: number }
  ): () => void {
    const unsubscribe = this.on(eventType, handler, {
      ...options,
      once: true,
    });
    return unsubscribe;
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
   * Executes handlers in priority order and handles errors gracefully.
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
      // Execute single-event handlers
      const handlers = this.handlers.get(eventType) ?? [];
      for (const registration of handlers) {
        try {
          await registration.handler(event);

          // Remove one-time handlers
          if (registration.once) {
            const index = handlers.indexOf(registration);
            if (index >= 0) {
              handlers.splice(index, 1);
            }
          }
        } catch (error) {
          this._emitError(error as Error, event);
        }
      }

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
   * Get the number of handlers registered for a specific event type.
   *
   * @param eventType - The event type to check
   * @returns Number of handlers
   */
  getHandlerCount(eventType: keyof CardCreatorEventTypeMap): number {
    return this.handlers.get(eventType as string)?.length ?? 0;
  }

  /**
   * Clear all handlers and error listeners.
   * Useful for testing and cleanup.
   */
  clear(): void {
    this.handlers.clear();
    this.conjunctionHandlers.length = 0;
    this.errorHandlers.length = 0;
    this.logger?.debug('EventBus cleared');
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
