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
  protected shadow: ShadowRoot;

  protected constructor() {
    super();

    this.setAttribute(CARDCREATOR_ATTRIBUTE, 'true');

    this.shadow = this.attachShadow({ mode: 'open' });
    this.shadow.appendChild(
      this.template().content.cloneNode(true),
    );
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
  protected abstract init(): void;

  /**
   * Provides the initial HTML template for the component.
   */
  protected abstract template(): HTMLTemplateElement;
}
