import { LazyCardCreatorDependencies } from '..';
import {
  Clearable,
  DependableService,
} from '../architecture/types';
import { generateId, ID } from '../cross-cutting-concerns';
import {
  Card,
  RenderContext,
  RenderJob,
  RenderServiceDependencies,
} from './render-types';

/**
 * Service to render single cards.
 * Acts as a wrapper around the renderer implementation.
 */
export class RenderService
  extends DependableService<RenderServiceDependencies>
  implements Clearable
{
  // This is transient data, which does not have to be persisted.
  private _previewedCard: Card | undefined = undefined;

  constructor(dependencies: RenderServiceDependencies) {
    super(dependencies, dependencies.logger);
  }

  clear(): void {
    this._dependencies.logger.info(
      'Clearing render service...',
    );
    this._previewedCard = undefined;
  }

  // TODO: How to pass render parameters, card data, template, assets, all smoothly into here?
  /**
   * Renders a single card.
   * The resulting card will be published via an event.
   * The render context will completely be taken from all depending services.
   * @param card The card to render. If no card is supplied, the template is rendered as-is.
   * @return A promise that resolves with the rendered image data.
   */
  public async renderCard(
    card: Card | undefined,
  ): Promise<ArrayBufferLike> {
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
      this._dependencies.templateService.apply(
        card,
        {} as RenderContext,
      );

    this._dependencies.eventService.publish({
      type: 'cardCompiled',
      data: {
        card: card,
        compiled: compiled,
        id: id,
      },
    });

    const raw = (
      await this._dependencies.renderer.render(compiled, {
        // TODO: Inject the correct output format here.
        format: 'png',
        // TODO: Inject correct size here.
        size: { width: 1000, height: 1000 },
      })
    ).buffer;

    this._dependencies.eventService.publish({
      type: 'cardRenderFinished',
      data: {
        card: card,
        id: id,
        image: raw,
      },
    });

    return raw;
  }

  /**
   * Triggers a render preview.
   * If a card is selected, the preview will be triggered for this card.
   * Otherwise a generic preview will be triggered.
   */
  public async triggerPreview(): Promise<void> {
    this._dependencies.logger.info(
      'Triggering render preview...',
    );

    const card = this._previewedCard;

    this._dependencies.eventService.publish({
      type: 'previewRenderStarted',
      data: {
        card: card,
      },
    });

    const image = await this.renderCard(card);

    // Render card.
    this._dependencies.eventService.publish({
      type: 'previewRenderFinished',
      data: {
        card: card,
        image: image,
      },
    });
  }

  /**
   * Previews a card.
   * @param card The card to preview.
   */
  public preview(card: Card): void {
    this._dependencies.logger.info(
      'Previewing card...',
      card,
    );

    this._previewedCard = card;
    this.triggerPreview();
  }

  /**
   * Returns the currently previewed card, if any.
   * @returns The currently previewed card, or undefined if no card is previewed.
   */
  public previewed(): Card | undefined {
    this._dependencies.logger.debug(
      'Fetching currently previewed card...',
    );

    return this._previewedCard;
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
