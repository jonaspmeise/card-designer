import { CardCreatorDependencies } from '..';
import { ID } from '../cross-cutting-concerns';
import { CardCreatorEvent } from '../types/events';

/**
 * A utility class that models that a service is dependent on a subset of system dependencies.
 */
export abstract class DependableService<
  T extends Partial<CardCreatorDependencies>,
> {
  constructor(protected readonly _dependencies: T) {}
}

/**
 * Utility interface to model that a service can clean itself up (remove all dangling resources, ...).
 */
export interface Clearable {
  clear(): void;
}

/**
 * A command that can be executed and undone on a target.
 * The command is immutable and holds all data required for execution and undoing.
 */
export interface Command<
  DATA extends Readonly<Record<string, unknown>> = Readonly<
    Record<string, unknown>
  >,
  TARGET = unknown,
  EVENTS extends CardCreatorEvent[] = CardCreatorEvent[],
> {
  readonly data: DATA;
  // The target should be an object reference which itself is not overwritten.
  // Only properties of that target may be changed, but not the entire reference itself.
  readonly target: TARGET;
  // The events that are emitted when the command is executed.
  events(): ReadonlyArray<EVENTS[number]>;
  do(): Promise<void>;
  undo(): Promise<void>;
}

export type PopulatedCommand<C extends Command = Command> =
  C & {
    status: 'done' | 'undone';
    readonly id: ID;
  };
