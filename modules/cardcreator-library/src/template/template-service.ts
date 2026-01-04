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
  // The functions extracted from the template.
  // A mapping between the function source and the actual Function.
  private _functions: Map<string, Function> = new Map();

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

    // Reset prior state.
    this._template = {
      source: source,
    };
    this._functions.clear();

    // Extracting functions.
    const functions = Array.from(
      this._template.source.matchAll(
        /{{(?<source>.+?)}}/gms,
      ),
    );

    functions.forEach((match) => {
      this._functions.set(
        match[0],
        new Function(
          '$card',
          '$config',
          '$job',
          `${/return/gim.test(match[0]) ? '' : 'return'} ${
            match.groups?.source
          }`,
        ),
      );
    });

    this._dependencies.logger.debug(
      `Extracted ${this._functions.size} functions from template.`,
    );

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
  public apply(card: Card, job: RenderContext): string {
    let rendered = this._template.source;
    this._functions.forEach((func, source) => {
      const result = func(
        card,
        this._dependencies.configService.config(),
        job,
      );
      rendered = rendered.replaceAll(source, result);
    });

    this._dependencies.logger.debug(
      'Applying template to card...',
      this._template,
      card,
    );

    return rendered;
  }
}
