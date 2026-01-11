import { CardCreatorLibrary } from 'cardcreator-library';

export const CARDCREATOR_ATTRIBUTE =
  'data-cardcreator-component';

/**
 * Base class for Cardcreator Web Components.
 */
export abstract class CardcreatorHTMLComponent extends HTMLElement {
  public static readonly REQUEST_LIB =
    'cardcreator:request-library';
  protected library!: CardCreatorLibrary;

  protected constructor() {
    super();

    this.setAttribute(CARDCREATOR_ATTRIBUTE, 'true');
  }

  /**
   * Provide the CardCreatorLibrary instance to the component.
   *
   * @param library The CardCreatorLibrary instance
   */
  public provide(library: CardCreatorLibrary) {
    console.debug(`Library provided.`);
    this.library = library;
    this.init();
  }

  /**
   * A delegated initialization method called after the library has been provided.
   */
  abstract init(): void;
}
