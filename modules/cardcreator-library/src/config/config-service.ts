import { DependableService } from '../architecture/types';
import { SetConfigCommand } from './commands/set-config';
import {
  Config,
  ConfigServiceDependencies,
} from './config-types';

export class ConfigService extends DependableService<ConfigServiceDependencies> {
  private _config: Config | undefined = undefined;
  private _proxy!: Config;

  constructor(dependencies: ConfigServiceDependencies) {
    super(dependencies, dependencies.logger);

    this._set({});
  }

  /**
   * Sends a command to set the current config to the history service.
   */
  private _sendCommand(prior: Config, next: Config): void {
    this._dependencies.logger.debug(
      `Sending config change command to history service...`,
    );
    this._dependencies.historyService.push(
      new SetConfigCommand(
        {
          next: next,
          prior: prior,
        },
        this._config!,
      ),
    );
  }

  /**
   * Internal method to set the current config object.
   * @param config The config to set.
   */
  private _set(config: Config): void {
    this._dependencies.logger.debug(
      `Setting config to: ${JSON.stringify(config)}`,
    );

    const first: boolean = this._config === undefined;
    if (first) {
      this._config = {};
    }

    this._proxy = new Proxy(this._config!, {
      set: (target, property, value) => {
        this._dependencies.logger.debug(
          `Setting config key "${property.toString()}" to value: ${value}`,
        );

        const prior = { ...target };
        const next = { ...target };
        next[property as string] = value;

        this._sendCommand(prior, next);

        return true;
      },
    });

    if (!first) {
      this._sendCommand({ ...this._config }, config);
    }
  }

  // TODO: If I load config from both a file and manually, and then change them, how are they persisted?
  // Is there new file overwritten...?
  // There should be a simple mental model for this.
  // E.g., config is always loaded from a file with a hash, so that when the file changes, a reload is prompted.
  // Manual changes are always in-memory only and persisted in the project file.

  /**
   * Returns the current configuration.
   * @returns A mutable reference to the config object. Changes done to this object trigger events which can be undone.
   */
  public config(): Config {
    this._dependencies.logger.debug(`Getting config...`);

    return this._proxy;
  }

  public reset(config: Config = {}): void {
    this._dependencies.logger.info(`Resetting config.`);
    this._dependencies.logger.debug(
      `New config is:`,
      config,
    );

    this._set(config);
  }
}
