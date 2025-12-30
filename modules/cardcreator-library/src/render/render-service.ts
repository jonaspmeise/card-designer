import {
  DependableService,
  PopulatedCommand,
} from '../architecture/types';
import { generateId } from '../cross-cutting-concerns';
import {
  Card,
  RenderJob,
  RenderServiceDependencies,
} from './render-types';

/**
 * Service to render single cards.
 * Acts as a wrapper around the renderer implementation.
 */
export class RenderService extends DependableService<RenderServiceDependencies> {
  private readonly _history: Array<PopulatedCommand> = [];

  constructor(dependencies: RenderServiceDependencies) {
    super(dependencies);
  }

  // TODO: How to pass render parameters, card data, template, assets, all smoothly into here?
  public renderCard(card: Card) {
    this._dependencies.logger.info(
      'Rendering card...',
      card,
    );

    this._dependencies.eventService.publish({
      type: 'cardRenderStarted',
      data: {
        card: card,
      },
    });
    // TODO: Render cards.
    this._dependencies.eventService.publish({
      type: 'cardRenderFinished',
      data: {
        card: card,
      },
    });
  }

  public renderJob(job: RenderJob) {
    this._dependencies.logger.info('Rendering job...', job);

    this._dependencies.eventService.publish({
      type: 'jobRenderStarted',
      data: {
        job: job,
      },
    });

    // TODO: Render job.
    this._dependencies.eventService.publish({
      type: 'jobRenderFinished',
      data: {
        job: job,
      },
    });
  }
}
