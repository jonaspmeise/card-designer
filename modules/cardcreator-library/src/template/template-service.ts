import { DependableService } from '../architecture/types';
import { initProjectData } from '../project/project-types';
import { Card } from '../render/render-types';
import {
  Template,
  TemplateServiceDependencies,
} from './template-types';

export class TemplateService extends DependableService<TemplateServiceDependencies> {
  private _template: Template = {
    source: initProjectData().source,
  };

  constructor(dependencies: TemplateServiceDependencies) {
    super(dependencies);
  }

  public loadTemplate(source: string): void {
    this._dependencies.logger.debug(
      'Loading template...',
      source,
    );

    this._template = {
      source: source,
    };
    this._dependencies.eventService.publish({
      type: 'templateLoaded',
      data: {
        template: this._template,
      },
    });
  }

  public template(): Template {
    this._dependencies.logger.debug(
      'Getting current template...',
    );

    return this._template;
  }
}
