import { DependableService } from '../architecture/types';
import {
  Card,
  RenderContext,
} from '../render/render-types';
import {
  Template,
  TemplateServiceDependencies,
  TemplateState,
} from './template-types';
import { Logger, LogLevel } from '../types/domain';
import { RenderLogger } from './render-logger';
import { LoadTemplateCommand } from '../project/commands/load-template';

export class TemplateService extends DependableService<
  TemplateServiceDependencies,
  TemplateState
> {
  private _renderLogger: Logger = new RenderLogger(
    this._dependencies.eventService,
  );

  constructor(
    dependencies: TemplateServiceDependencies,
    state: TemplateState,
  ) {
    super(dependencies, dependencies.logger, state);
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

    // Extracting all functions from this template.
    const functions: Map<string, Function> = new Map();

    Array.from(
      source.matchAll(/{{(?<source>.+?)}}/gms),
    ).forEach((match) => {
      functions.set(
        match[0],
        new Function(
          '$card',
          '$config',
          '$job',
          '$console',
          `${/return/gim.test(match[0]) ? '' : 'return'} ${
            match.groups?.source
          }`,
        ),
      );
    });

    this._dependencies.logger.debug(
      `Extracted ${functions.size} functions from template.`,
    );

    const command: LoadTemplateCommand =
      new LoadTemplateCommand(
        {
          prior: structuredClone(this._state),
          next: {
            template: source,
            _functions: functions,
          },
        },
        this._state,
      );

    this._dependencies.historyService.push(command);
  }

  /**
   * Gets the current template.
   * @returns The current template.
   */
  public template(): Template {
    this._dependencies.logger.debug(
      'Getting current template...',
    );

    return this._state.template;
  }

  /**
   * Applies a given template to the given card.
   * @param template The template to apply.
   * @param card The card to apply the template to.
   * @param job Optional render job info, which give context about in what context this render is happening.
   * @returns The rendered result as a string.
   */
  public apply(card: Card, job: RenderContext): string {
    this._dependencies.logger.debug(
      'Applying template to card...',
      this._state.template,
      card,
    );

    let rendered = this._state.template;
    this._state._functions.forEach((func, source) => {
      const result = func(
        card,
        this._dependencies.configService.config(),
        job,
        // We delegate all render job logging to the render logger.
        (
          ['debug', 'info', 'warn', 'error'] as LogLevel[]
        ).reduce(
          (consoleObj, level) => {
            consoleObj[level] = (msg: string) => {
              this._renderLogger[level](msg, card);
            };
            return consoleObj;
          },
          {} as {
            [key in LogLevel]: (msg: string) => void;
          },
        ),
      );
      rendered = rendered.replaceAll(source, result);
    });

    this._dependencies.logger.debug(
      'Applying template to card...',
      this._state.template,
      card,
    );

    return rendered;
  }
}
