import { DependableService } from '../architecture/types';
import { generateId, ID } from '../cross-cutting-concerns';
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
  constructor(dependencies: RenderServiceDependencies) {
    super(dependencies, dependencies.logger);
  }

  // TODO: How to pass render parameters, card data, template, assets, all smoothly into here?
  /**
   * Renders a single card.
   * The resulting card will be published via an event.
   * The render context will completely be taken from all depending services.
   * @param card The card to render.
   */
  public async renderCard(card: Card): Promise<void> {
    this._dependencies.logger.info(
      'Rendering card...',
      card,
    );

    const id: ID = generateId();

    this._dependencies.eventService.publish({
      type: 'cardRenderStarted',
      data: {
        card: card,
        id: id,
      },
    });

    const compiled: string =
      this._dependencies.templateService.apply(card);

    this._dependencies.eventService.publish({
      type: 'cardCompiled',
      data: {
        card: card,
        compiled: compiled,
        id: id,
      },
    });

    const raw = await this._dependencies.renderer.render(
      compiled,
      {
        // TODO: Inject the correct output format here.
        format: 'png',
        // TODO: Inject correct size here.
        size: { width: 1000, height: 1000 },
      },
    );

    this._dependencies.eventService.publish({
      type: 'cardRenderFinished',
      data: {
        card: card,
        id: id,
        image: raw.buffer,
      },
    });
  }

  public renderJob(job: RenderJob, cards: Card[]): void {
    this._dependencies.logger.info('Rendering job...', job);

    const id: ID = generateId();

    this._dependencies.eventService.publish({
      type: 'jobRenderStarted',
      data: {
        job: job,
        id: id,
      },
    });

    // TODO: Render job.
    cards.forEach((card) => {
      this._dependencies.logger.info(
        'Rendering card for job...',
        card,
        job,
      );

      this.renderCard(card);
    });

    this._dependencies.eventService.publish({
      type: 'jobRenderFinished',
      data: {
        job: job,
        id: id,
      },
    });
  }
}
