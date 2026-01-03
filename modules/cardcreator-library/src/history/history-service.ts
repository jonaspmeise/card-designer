import {
  Clearable,
  Command,
  DependableService,
  PopulatedCommand,
} from '../architecture/types';
import { generateId } from '../cross-cutting-concerns';
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

    const populated: PopulatedCommand<T> = {
      ...command,
      id,
      status: 'done',
      do: () => {
        this._dependencies.logger.info(
          `Doing command ID: ${id}...`,
        );

        command.do();

        this._dependencies.eventService.publish({
          type: 'commandExecuted',
          data: populated,
        });
      },
      undo: () => {
        this._dependencies.logger.info(
          `Undoing command ID: ${id}...`,
        );

        command.undo();

        this._dependencies.eventService.publish({
          type: 'commandUndone',
          data: populated,
        });
      },
      events: command.events,
    };

    // Execute command.
    this._history.push(populated);
    populated.do();

    // Execute additional events.
    populated.events().forEach((event) => {
      this._dependencies.logger.debug(
        `Emitting event "${event.type}" from command ID "${id}"...`,
      );

      this._dependencies.eventService.publish(event);

      this._dependencies.logger.debug(
        `Emitted event "${event.type}" from command ID "${id}".`,
      );
    });

    return populated;
  }

  public history(): ReadonlyArray<
    PopulatedCommand<Command>
  > {
    this._dependencies.logger.debug(
      `Fetching command history...`,
    );

    return this._history;
  }
}
