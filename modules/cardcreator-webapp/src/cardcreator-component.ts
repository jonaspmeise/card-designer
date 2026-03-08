import { CardCreatorLibrary } from 'cardcreator-library';
import { Modal } from './components/modal';

export const CARDCREATOR_ATTRIBUTE =
  'data-cardcreator-component';

/**
 * Base class for Cardcreator Web Components.
 *
 * Dialog state is completely private and cannot be accessed by subclasses.
 */
export abstract class CardcreatorHTMLComponent extends HTMLElement {
  public static readonly REQUEST_LIB =
    'cardcreator:request-library';
  protected library!: CardCreatorLibrary;
  protected shadow: ShadowRoot;

  private readonly modal: Modal;

  protected constructor(shadow?: ShadowRoot) {
    super();

    this.setAttribute(CARDCREATOR_ATTRIBUTE, 'true');

    this.shadow =
      shadow ?? this.attachShadow({ mode: 'open' });
    this.shadow.appendChild(
      this.template().content.cloneNode(true),
    );

    this.modal = new Modal(this.shadow);
  }

  /**
   * Provide the CardCreatorLibrary instance to the component.
   *
   * @param library The CardCreatorLibrary instance
   */
  public provide(library: CardCreatorLibrary) {
    console.debug(`Library provided.`);
    // Inject library for our self-administrated modal.
    this.modal.initLibrary(library);

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
