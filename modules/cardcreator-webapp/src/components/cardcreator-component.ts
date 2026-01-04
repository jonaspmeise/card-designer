import { CardCreatorLibrary } from 'cardcreator-library';

/**
 * Base class for Cardcreator Web Components.
 */
export abstract class CardcreatorHTMLComponent extends HTMLElement {
  private static readonly REQUEST_LIB =
    'cc:request-library';
  protected library!: CardCreatorLibrary;

  /**
   * Requests an instance of the CardCreatorLibrary from the hosting application.
   * This method is called when the component is connected to the DOM.
   */
  connectedCallback() {
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
    this.library = library;
  }

  /**
   * A delegated initialization method called after the library has been provided.
   */
  abstract init(): void;
}
