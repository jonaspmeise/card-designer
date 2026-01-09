import { DependableService } from '../architecture/types';
import { SetConfigCommand } from './commands/set-config';
import {
  Config,
  ConfigServiceDependencies,
  KeyValuePair,
} from './config-types';

export class ConfigService extends DependableService<ConfigServiceDependencies> {
  private _config: Config = {};
  private _proxy: Config = new Proxy(this._config, {
    set: (target, property, value) => {
      this._dependencies.logger.debug(
        `Setting config key "${property.toString()}" to value: ${value}`,
      );

      const key = property.toString();

      this._dependencies.historyService.push(
        new SetConfigCommand(
          {
            next: [key, value],
            overwritten: target.hasOwnProperty(key)
              ? ([key, target[key]] as KeyValuePair)
              : undefined,
          },
          this._config,
        ),
      );

      return true;
    },
  });

  private _set(config: Config): void {
    this._dependencies.logger.debug(
      `Setting config to: ${JSON.stringify(config)}`,
    );

    this._config = config;
    this._proxy = new Proxy(this._config, {
      set: (target, property, value) => {
        this._dependencies.logger.debug(
          `Setting config key "${property.toString()}" to value: ${value}`,
        );

        const key = property.toString();

        this._dependencies.historyService.push(
          new SetConfigCommand(
            {
              next: [key, value],
              overwritten: target.hasOwnProperty(key)
                ? ([key, target[key]] as KeyValuePair)
                : undefined,
            },
            this._config,
          ),
        );

        return true;
      },
    });
  }

  constructor(dependencies: ConfigServiceDependencies) {
    super(dependencies, dependencies.logger);
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
