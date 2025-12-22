/**
 * Core event definitions for the card-creator library.
 * These events form the backbone of the event-driven architecture,
 * allowing consumers to react to significant lifecycle and operational changes.
 */

import {
  FileOpenedEvent,
  ProjectLoadedEvent,
} from '../events/events';

/** Base event interface that all domain events extend */
export abstract class DomainEvent<
  DATA extends Readonly<Record<string, unknown>> = {},
> {
  constructor(
    public readonly type: string,
    public readonly data: DATA,
  ) {}
}

export type EventOfType<
  U extends DomainEvent,
  T extends U['type'],
> = Extract<U, { type: T }>;

/**
 * All possible events in the CardCreator system.
 */
export type CardCreatorEvent =
  | ProjectLoadedEvent
  | FileOpenedEvent;

/**
 * Type-safe mapping of event types to their corresponding event interfaces.
 * Ensures compile-time safety and prevents typos.
 *
 * This is a strict type that ensures every event type has a corresponding event interface.
 * If a new event is added to CardCreatorEvent, it must also be added here.
 */
export interface CardCreatorEventTypeMap {
  projectLoaded: ProjectLoadedEvent;
  fileOpened: FileOpenedEvent;
}
