import { Command } from '../../architecture/types';
import { ConfigChangedEvent } from '../../events/event-types';
import { Config, KeyValuePair } from '../config-types';

export type SetConfigCommandData = {
  overwritten?: KeyValuePair;
  next: KeyValuePair;
};
export class SetConfigCommand
  implements
    Command<
      SetConfigCommandData,
      Config,
      [ConfigChangedEvent]
    >
{
  constructor(
    public readonly data: SetConfigCommandData,
    public readonly target: Config,
  ) {}

  public events(): readonly [ConfigChangedEvent] {
    return [
      {
        type: 'configChanged',
        data: {
          key: this.data.next[0],
          value: this.data.next[1],
        },
      },
    ];
  }

  public do(): void {
    // We need to make sure that the config is updated correctly (deeply).
    Reflect.set(
      this.target,
      this.data.next[0],
      this.data.next[1],
    );
  }

  public undo(): void {
    if (this.data.overwritten !== undefined) {
      this.target[this.data.overwritten[0]] =
        this.data.overwritten[1];
    } else {
      delete this.target[this.data.next[0]];
    }
  }
}
