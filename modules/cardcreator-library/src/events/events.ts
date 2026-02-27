/**
 * Interfaces for event buses, to divide between external concern (consumer perspective; registering / unregistering handlers)
 * and internal concerns (developer perspective; issuing events).
 */

import {
  CardCreatorEvent,
  DomainEvent,
  EventKeys,
  SingleEvent,
} from '../types/events';

export interface EventBus
  extends InternalEventBus, ExternalEventBus {}

export interface SharedEventBus {
  /**
   * Clear all handlers and error listeners, optionally for only a specific event type.
   * Use this to prevent memory leaks.
   *
   * @param eventType - Optional event type to clear handlers for. If not provided, clears all registered handlers.
   */
  clear(eventType?: EventKeys): void;
}

export interface InternalEventBus extends SharedEventBus {
  /**
   * Publish an event to all registered handlers.
   * Executes handlers in registration order and handles errors gracefully.
   *
   * @param event - The event to publish
   * @throws Never throws; errors are passed to own error handler.
   *
   * @example
   * ```typescript
   * await eventService.publish({
   *   type: 'projectLoaded',
   *   projectId: '123',
   *   name: 'My Project',
   *   timestamp: new Date(),
   *   correlationId: 'abc-123',
   * });
   * ```
   */
  publish(event: CardCreatorEvent): Promise<void>;
}

export interface ExternalEventBus extends SharedEventBus {
  /**
   * Subscribe to error events that occur during event handling.
   *
   * @param handler - Function to call when an error occurs
   * @returns Unsubscribe function
   */
  onError(
    handler: (
      error: Error,
      event?: CardCreatorEvent,
    ) => void,
  ): () => void;

  /**
   * Subscribe to an event.
   *
   * @param type - Event type to listen for.
   * @param handler - Function to call when the specified event is called.
   * @returns Unsubscribe function to remove the registered handler for this event.
   *
   * @example
   * ```typescript
   * eventService.on(
   *   'projectLoaded',
   *   event => {
   *     console.log('Project was loaded or file was loaded!');
   *   }
   * );
   * ```
   */
  on<K extends EventKeys>(
    type: K,
    handler: EventHandler<SingleEvent<K>>,
  ): () => void;
}

// Event types.

/**
 * Handler function that processes one or multiple event types.
 */
export type EventHandler<DOMAIN extends DomainEvent> = (
  event: DOMAIN,
) => void | Promise<void>;

// Add these event types to your existing event type union:
// | { type: 'templatePreviewed'; data: { template: Template; svg: string } }
// | { type: 'cardPreviewed'; data: { card: Card; svg: string } }
