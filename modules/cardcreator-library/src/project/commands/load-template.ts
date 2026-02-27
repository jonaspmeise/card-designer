import { BaseCommand } from '../../architecture/types';
import { TemplateLoadedEvent } from '../../events/event-types';
import {
  Template,
  TemplateState,
} from '../../template/template-types';

export type LoadTemplateCommandData = {
  prior: TemplateState;
  next: TemplateState;
};
export class LoadTemplateCommand extends BaseCommand<
  LoadTemplateCommandData,
  TemplateState,
  [TemplateLoadedEvent]
> {
  constructor(
    public readonly data: LoadTemplateCommandData,
    public readonly target: TemplateState,
    private readonly triggerRenderPreview: () => void,
  ) {
    super();
  }

  public events(): readonly [TemplateLoadedEvent] {
    return [
      {
        type: 'templateLoaded',
        data: this.target,
      },
    ];
  }

  protected _do(): void {
    this.target.template = this.data.next.template;
    this.target._functions = this.data.next._functions;
  }

  protected _undo(): void {
    this.target.template = this.data.prior.template;
    this.target._functions = this.data.prior._functions;
  }

  public message = () => `Loaded template`;

  public sideeffects(): void {
    this.triggerRenderPreview();
  }
}
