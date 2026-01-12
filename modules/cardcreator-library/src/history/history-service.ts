import {
  Clearable,
  Command,
  DependableService,
  PopulatedCommand,
} from '../architecture/types';
import { generateId, ID } from '../cross-cutting-concerns';
import { HistoryServiceDependencies } from './history-types';

/**
 * Service to record and manage history (commands).
 */
export class HistoryService
  extends DependableService<HistoryServiceDependencies>
  implements Clearable
{
  private readonly _history: Array<PopulatedCommand> = [];

  constructor(dependencies: HistoryServiceDependencies) {
    super(dependencies, dependencies.logger);
  }

  clear(): void {
    this._dependencies.logger.info('Clearing history...');
    this._history.length = 0;
  }

  /**
   * Registers a command in the history and executes it.
   * The returned command is a wrapped instance of the original command, enriching it with additional side-effects, such as logs and events.
   * @param command The command to register and execute.
   * @returns The registered and enriched command.
   */
  public push<T extends Command>(
    command: T,
  ): PopulatedCommand<T> {
    this._dependencies.logger.info(
      `Executing command of type "${command.constructor.name}"...`,
    );

    const id = generateId();
    this._dependencies.logger.info(
      `Generated command ID: ${id}`,
    );

    const populated = {
      id,
      do: () => {
        this._dependencies.logger.info(
          `Doing command ID: ${id}...`,
        );

        const executed = command.do();

        if (!executed) {
          this._dependencies.logger.info(
            `Command ID: ${id} was already done, skipping further actions...`,
          );
          return;
        }

        this._dependencies.logger.debug(
          `Publishing commandExecuted event for command ID: ${id}...`,
        );
        this._dependencies.eventService.publish({
          type: 'commandExecuted',
          data: populated as PopulatedCommand<T>,
        });
      },
      undo: () => {
        this._dependencies.logger.info(
          `Undoing command ID: ${id}...`,
        );

        const undone = command.undo();

        if (!undone) {
          this._dependencies.logger.info(
            `Command ID: ${id} was already undone, skipping further actions...`,
          );
          return;
        }

        this._dependencies.eventService.publish({
          type: 'commandUndone',
          data: populated as PopulatedCommand<T>,
        });
      },
      events: command.events,
      done: command.done,
    };

    const prototyped: PopulatedCommand<T> =
      Object.setPrototypeOf(populated, command);

    // Execute command.
    this._history.push(prototyped);
    prototyped.do();

    // Execute additional events.
    prototyped.events().forEach((event) => {
      this._dependencies.logger.debug(
        `Emitting event "${event.type}" from command ID "${id}"...`,
      );

      this._dependencies.eventService.publish(event);

      this._dependencies.logger.debug(
        `Emitted event "${event.type}" from command ID "${id}".`,
      );
    });

    return prototyped;
  }

  /**
   * Fetches a readonly copy of the command history (in ascending order).
   * @returns The command history.
   */
  public history(): ReadonlyArray<
    PopulatedCommand<Command>
  > {
    this._dependencies.logger.debug(
      `Fetching command history...`,
    );

    return this._history;
  }

  /**
   * Explicitly does a command by its ID.
   * If the command is already done, nothing happens.
   * If the command does not exist, an error is logged.
   * @param command The command of the ID to do.
   */
  public do(command: ID): void {
    this._dependencies.logger.debug(
      `Explicitly doing command by ID: ${command}...`,
    );

    const target = this._history.find(
      (c) => c.id === command,
    );

    if (target === undefined) {
      this._dependencies.logger.error(
        `Command with ID "${command}" does not exist and can't be done!`,
      );
      return;
    }

    target.do();
  }

  /**
   * Explicitly undoes a command by its ID.
   * If the command is already undone, nothing happens.
   * If the command does not exist, an error is logged.
   * @param command The ID of the command to undo.
   */
  public undo(command: ID): void {
    this._dependencies.logger.debug(
      `Explicitly undoing command by ID: ${command}...`,
    );

    const target = this._history.find(
      (c) => c.id === command,
    );

    if (target === undefined) {
      this._dependencies.logger.error(
        `Command with ID "${command}" does not exist and can't be undone!`,
      );
      return;
    }

    target.undo();
  }
}
