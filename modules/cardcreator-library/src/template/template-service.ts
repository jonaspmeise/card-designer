import { DependableService } from '../architecture/types';
import { initProjectData } from '../project/project-types';
import {
  Card,
  RenderContext,
  RenderJob,
} from '../render/render-types';
import { JobInfo } from '../../dist/types/domain';
import {
  Template,
  TemplateServiceDependencies,
} from './template-types';

export class TemplateService extends DependableService<TemplateServiceDependencies> {
  private _template: Template = {
    source: initProjectData().source,
  };

  constructor(dependencies: TemplateServiceDependencies) {
    super(dependencies, dependencies.logger);
  }

  /**
   * Loads a template from the given source.
   * @param source The template source as a raw string.
   */
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

  /**
   * Gets the current template.
   * @returns The current template.
   */
  public template(): Template {
    this._dependencies.logger.debug(
      'Getting current template...',
    );

    return this._template;
  }

  /**
   * Applies a given template to the given card.
   * @param template The template to apply.
   * @param card Tehe card to apply the template to.
   * @param job Optional render job info, which give context about in what context this render is happening.
   * @returns The rendered result as a string.
   */
  public apply(
    card: Card,
    job: RenderContext = {
      index: 0,
    },
  ): string {
    // TODO: There should be some caching with passed templates, because calculating each function
    // is highly expensive...
    // TODO: We can also hash each function so we deal with dulpicates very easily.
    const functions = Array.from(
      this._template.source.matchAll(
        /{{(?<source>.+?)}}/gm,
      ),
    );
    let rendered = this._template.source;
    functions.forEach((match) => {
      rendered = rendered.replace(
        match[0],
        new Function(
          '$card',
          '$config',
          '$job',
          `${/return/gim.test(match[0]) ? '' : 'return'} ${
            match.groups?.source
          }`,
        )(
          card,
          this._dependencies.configService.config(),
          job,
        ) as string,
      );
    });

    this._dependencies.logger.debug(
      'Applying template to card...',
      this._template,
      card,
    );

    return rendered;
  }
}
