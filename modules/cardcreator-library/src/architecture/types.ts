import { CardCreatorDependencies } from '..';
import { ID } from '../cross-cutting-concerns';
import { Logger } from '../types/domain';
import { CardCreatorEvent } from '../types/events';

/**
 * A utility class that models that a service is dependent on a subset of system dependencies.
 */
export abstract class DependableService<
  DEPENDENCIES extends Partial<CardCreatorDependencies>,
  // A reference to the custom state, which this service has access too.
  // This state is serialized / deserialized on project load and actually persisted.
  // Transient state is not explicitly modeled and should be implemented in each service itself.
  STATE extends
    | Readonly<Record<string, unknown>>
    | undefined = undefined,
> {
  constructor(
    protected readonly _dependencies: DEPENDENCIES,
    logger: Logger,
    protected readonly _state: STATE = undefined as STATE,
  ) {
    logger.debug(
      `Initialized service "${
        this.constructor.name
      }" with dependencies: ${Object.keys(
        _dependencies,
      ).join(', ')}`,
    );
  }
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
  message(): string;
  readonly data: DATA;
  // The target should be an object reference which itself is not overwritten.
  // Only properties of that target may be changed, but not the entire reference itself.
  readonly target: TARGET;
  // The events that are emitted when the command is executed.
  events(): ReadonlyArray<EVENTS[number]>;
  // Executes the command and returns whether it was executed.
  do(): boolean;
  // Undoes the command and returns whether it was undone.
  undo(): boolean;
  // Is the command currently done?
  done(): boolean;
}

export abstract class BaseCommand<
  DATA extends Readonly<Record<string, unknown>> = Readonly<
    Record<string, unknown>
  >,
  TARGET = unknown,
  EVENTS extends CardCreatorEvent[] = CardCreatorEvent[],
> implements Command<DATA, TARGET, EVENTS> {
  protected _isDone = false;

  public done(): boolean {
    return this._isDone;
  }

  public do(): boolean {
    if (this._isDone) {
      return false;
    }
    this._do();
    this._isDone = true;

    return true;
  }

  public undo(): boolean {
    if (!this._isDone) {
      return false;
    }
    this._undo();
    this._isDone = false;

    return true;
  }

  abstract message(): string;
  abstract readonly data: DATA;
  abstract readonly target: TARGET;
  abstract events(): ReadonlyArray<EVENTS[number]>;
  protected abstract _do(): void;
  protected abstract _undo(): void;
}

export type PopulatedCommand<C extends Command = Command> =
  C & {
    readonly id: ID;
  };
