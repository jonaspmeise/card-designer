import {
  Clearable,
  DependableService,
} from '../architecture/types';
import { generateId, ID } from '../cross-cutting-concerns';
import { Card } from '../render/render-types';
import { CardServiceDependencies } from './card-types';

/**
 * Service to access card data.
 */
export class CardService
  extends DependableService<CardServiceDependencies>
  implements Clearable
{
  private _cards: Card[] = [];

  constructor(dependencies: CardServiceDependencies) {
    super(dependencies, dependencies.logger);
  }

  clear(): void {
    this._dependencies.logger.debug(
      'Clearing card service state...',
    );
    this._cards = [];
  }

  /**
   * Loads the given cards into the service.
   * @param cards The cards to load.
   */
  public load(cards: Card[]): void {
    this._dependencies.logger.debug(
      `Loading ${cards.length} cards...`,
      cards,
    );

    this._cards = cards;
    this._dependencies.eventService.publish({
      type: 'cardsLoaded',
      data: {
        cards: cards,
      },
    });

    this._dependencies.logger.debug(
      `Finished loading ${cards.length} cards.`,
    );
  }

  /**
   * Returns all loaded cards.
   * @returns All loaded cards.
   */
  public cards(): ReadonlyArray<Card> {
    this._dependencies.logger.debug(`Retrieving cards...`);

    return this._cards;
  }
}
