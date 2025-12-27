/**
 * Core event definitions for the card-creator library.
 * These events form the backbone of the event-driven architecture,
 * allowing consumers to react to significant lifecycle and operational changes.
 */

import {
  DialogEvent,
  FileOpenedEvent,
  ProjectLoadedEvent,
  ProjectResetEvent,
  ProjectSavedEvent,
} from '../events/event-types';

/** Base event interface that all domain events extend */
export type DomainEvent<
  TYPE extends string = string,
  DATA extends Readonly<Record<string, unknown>> = {},
> = {
  type: TYPE;
  data: DATA;
};

export type SingleEvent<KEY extends EventKeys> = Extract<
  CardCreatorEvent,
  {
    type: KEY;
  }
>;

export type EventKeys = CardCreatorEvent['type'];

/**
 * All possible events in the CardCreator system.
 */
export type CardCreatorEvent =
  | ProjectLoadedEvent
  | FileOpenedEvent
  | DialogEvent
  | ProjectResetEvent
  | ProjectSavedEvent;

/**
 * Type-safe mapping of event types to their corresponding event interfaces.
 * Ensures compile-time safety and prevents typos.
 *
 * This is a strict type that ensures every event type has a corresponding event interface.
 * If a new event is added to CardCreatorEvent, it must also be added here.
 */
export type CardCreatorEventTypeMap = {
  [KEY in CardCreatorEvent['type'][number]]: Extract<
    CardCreatorEvent,
    {
      type: KEY;
    }
  >;
};
