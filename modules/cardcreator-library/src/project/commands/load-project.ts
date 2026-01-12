import { BaseCommand } from '../../architecture/types';
import { ProjectLoadedEvent } from '../../events/event-types';
import { ProjectServiceState } from '../project-types';

export type LoadProjectCommandData = {
  prior: ProjectServiceState;
  next: ProjectServiceState;
};
export class LoadProjectCommand extends BaseCommand<
  LoadProjectCommandData,
  ProjectServiceState,
  [ProjectLoadedEvent]
> {
  constructor(
    public readonly data: LoadProjectCommandData,
    public readonly target: ProjectServiceState,
  ) {
    super();
  }

  public events(): readonly [ProjectLoadedEvent] {
    return [
      {
        type: 'projectLoaded',
        data: this.target.project,
      },
    ];
  }

  protected _do(): void {
    Object.assign(this.target, this.data.next);
  }

  protected _undo(): void {
    Object.assign(this.target, this.data.prior);
  }

  public message = () => `Loaded project`;
}
