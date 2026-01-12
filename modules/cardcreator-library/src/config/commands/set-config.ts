import {
  BaseCommand,
  Command,
} from '../../architecture/types';
import { ConfigChangedEvent } from '../../events/event-types';
import { Config } from '../config-types';

export type SetConfigCommandData = {
  prior: Readonly<Config>;
  next: Readonly<Config>;
};
export class SetConfigCommand extends BaseCommand<
  SetConfigCommandData,
  Config,
  [ConfigChangedEvent]
> {
  constructor(
    public readonly data: SetConfigCommandData,
    public readonly target: Config,
  ) {
    super();

    if (data.prior === target) {
      throw new Error(
        'Prior config must not be the same reference as target config.',
      );
    }

    if (data.next === target) {
      throw new Error(
        'Next config must not be the same reference as target config.',
      );
    }
  }

  public events(): readonly [ConfigChangedEvent] {
    return [
      {
        type: 'configChanged',
        data: {},
      },
    ];
  }

  protected _do(): void {
    this._set(this.data.next);
  }

  protected _undo(): void {
    this._set(this.data.prior);
  }

  /**
   * Sets the target to the given value.
   * @param value The value to set.
   */
  private _set(value: Readonly<Config>): void {
    // Delete all entries in the current config and replace them with the new one, without changing the reference.
    Object.keys(this.target).forEach((key) => {
      Reflect.deleteProperty(this.target, key);
    });

    Object.entries(value).forEach(([key, value]) => {
      Reflect.set(this.target, key, value);
    });
  }

  public message = () => `Config modified`;
}
