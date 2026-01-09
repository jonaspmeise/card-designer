import { CardCreatorLibrary } from 'cardcreator-library';

export type LibraryRequestEvent = CustomEvent<{
  provide: (library: CardCreatorLibrary) => void;
}>;

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
   * Requests an instance of the CardCreatorLibrary from the hosting application.
   * This method is called when the component is connected to the DOM.
   */
  connectedCallback() {
    console.debug(
      `Component connected to DOM, requesting library...`,
    );
    this.dispatchEvent(
      new CustomEvent(
        CardcreatorHTMLComponent.REQUEST_LIB,
        {
          bubbles: true,
          composed: true,
          detail: {
            provide: (lib: CardCreatorLibrary) => {
              console.debug(
                `Library provided for component "${this.constructor.name}".`,
              );
              this.library = lib;
              this.init();
            },
          },
        },
      ),
    );
  }

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
