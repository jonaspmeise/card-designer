import { Command } from '../../architecture/types';
import { ProjectLoadedEvent } from '../../events/event-types';
import { ProjectServiceState } from '../project-types';

export type LoadProjectCommandData = {
  prior: ProjectServiceState;
  next: ProjectServiceState;
};
export class LoadProjectCommand
  implements
    Command<
      LoadProjectCommandData,
      ProjectServiceState,
      [ProjectLoadedEvent]
    >
{
  constructor(
    public readonly data: LoadProjectCommandData,
    public readonly target: ProjectServiceState,
  ) {}

  public events(): readonly [ProjectLoadedEvent] {
    return [
      {
        type: 'projectLoaded',
        data: this.target.project,
      },
    ];
  }

  public do(): void {
    Object.assign(this.target, this.data.next);
  }

  public undo(): void {
    Object.assign(this.target, this.data.prior);
  }
}
