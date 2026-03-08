/**
 * Modal module
 * Provides a generic modal dialog that can be injected into any shadow DOM.
 */

/**
 * The severity/information level of the modal.
 */
export type ModalLevel =
  | 'info'
  | 'warning'
  | 'error'
  | 'question';

/**
 * The visual style of a modal button.
 */
export type ModalButtonStyle =
  | 'primary'
  | 'secondary'
  | 'danger';

/**
 * A button displayed in the modal footer.
 */
export interface ModalButton {
  /** The button label text. */
  label: string;
  /** Callback invoked when the button is clicked. The modal is closed automatically before the callback runs. */
  callback: () => void;
  /** Visual style of the button (default: 'secondary'). */
  style?: ModalButtonStyle;
}

/**
 * Options passed to `show()` to configure a modal dialog.
 */
export interface ModalOptions {
  /** The modal title. */
  title: string;
  /** The modal body message. */
  message: string;
  /** The severity/information level, which determines the icon and accent color. */
  level: ModalLevel;
  /** Buttons rendered in the footer. Each button closes the modal and triggers its callback. */
  buttons: ModalButton[];
  /** If true, the user cannot dismiss the modal without clicking a button (no close button, no backdrop click). */
  forced?: boolean;
}

/**
 * Maps a ModalLevel to its display icon.
 */
function modalLevelIcon(level: ModalLevel): string {
  switch (level) {
    case 'info':
      return 'ℹ️';
    case 'warning':
      return '⚠️';
    case 'error':
      return '❌';
    case 'question':
      return '❓';
  }
}

/**
 * Maps a ModalLevel to its CSS accent color.
 * @param level The ModalLevel to get the color for
 * @returns A CSS color string representing the accent color for the given ModalLevel
 */
function modalLevelColor(level: ModalLevel): string {
  switch (level) {
    case 'info':
      return '#3b82f6';
    case 'warning':
      return '#f59e0b';
    case 'error':
      return '#ef4444';
    case 'question':
      return '#7c3aed';
  }
}

/**
 * Maps a ModalButtonStyle to its CSS class.
 */
function buttonStyleClass(
  style: ModalButtonStyle = 'secondary',
): string {
  return `modal-btn-${style}`;
}

// ── CSS Styles (IDs only, one modal per app) ──

const MODAL_STYLES = `
  #modal-backdrop {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1000;
    align-items: center;
    justify-content: center;
  }

  #modal-backdrop[data-modal-open="true"] {
    display: flex;
  }

  #modal-dialog {
    display: none;
    background: var(--bg-secondary, #252540);
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow: hidden;
    flex-direction: column;
  }

  #modal-backdrop[data-modal-open="true"] #modal-dialog {
    display: flex;
  }

  #modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid var(--border, #404060);
    background: var(--bg-tertiary, #353550);
  }

  #modal-title-area {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  #modal-icon {
    font-size: 20px;
  }

  #modal-title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
  }

  #modal-close-button {
    background: none;
    border: none;
    color: var(--text, #eee);
    font-size: 24px;
    cursor: pointer;
    padding: 0;
    line-height: 1;
  }

  #modal-close-button:hover {
    color: var(--accent, #7c3aed);
  }

  #modal-body {
    padding: 16px;
    overflow: auto;
    line-height: 1.5;
  }

  #modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 16px;
    border-top: 1px solid var(--border, #404060);
    background: var(--bg-tertiary, #353550);
  }

  #modal-footer button {
    padding: 8px 16px;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: opacity 0.2s;
  }

  #modal-footer button:hover {
    opacity: 0.9;
  }

  .modal-btn-primary {
    background: var(--accent, #7c3aed);
    color: white;
  }

  .modal-btn-secondary {
    background: var(--bg-hover, #404060);
    color: var(--text, #eee);
  }

  .modal-btn-danger {
    background: #dc2626;
    color: white;
  }
`;

// ── HTML Markup ──

const MODAL_HTML = `
  <div id="modal-backdrop" data-modal-open="false">
    <div id="modal-dialog">
      <div id="modal-header">
        <div id="modal-title-area">
          <span id="modal-icon"></span>
          <h2 id="modal-title"></h2>
        </div>
        <button id="modal-close-button">&times;</button>
      </div>
      <div id="modal-body"></div>
      <div id="modal-footer"></div>
    </div>
  </div>
`;

// ── Modal Class ──

/**
 * Modal dialog manager.
 * Injects modal HTML/CSS into a shadow root and provides show/close methods.
 * All DOM references are cached on construction.
 */
export class Modal {
  private readonly backdrop: HTMLDivElement;
  private readonly icon: HTMLSpanElement;
  private readonly title: HTMLHeadingElement;
  private readonly body: HTMLDivElement;
  private readonly footer: HTMLDivElement;
  private readonly closeButton: HTMLButtonElement;
  private forced = false;

  constructor(shadow: ShadowRoot) {
    // Inject styles
    const style = document.createElement('style');
    style.textContent = MODAL_STYLES;
    shadow.appendChild(style);

    // Inject markup
    const wrapper = document.createElement('div');
    wrapper.innerHTML = MODAL_HTML;
    while (wrapper.firstChild) {
      shadow.appendChild(wrapper.firstChild);
    }

    // Cache references
    this.backdrop = shadow.getElementById(
      'modal-backdrop',
    ) as HTMLDivElement;
    this.icon = shadow.getElementById(
      'modal-icon',
    ) as HTMLSpanElement;
    this.title = shadow.getElementById(
      'modal-title',
    ) as HTMLHeadingElement;
    this.body = shadow.getElementById(
      'modal-body',
    ) as HTMLDivElement;
    this.footer = shadow.getElementById(
      'modal-footer',
    ) as HTMLDivElement;
    this.closeButton = shadow.getElementById(
      'modal-close-button',
    ) as HTMLButtonElement;

    // Event: close button
    this.closeButton.addEventListener('click', () => {
      if (!this.forced) {
        this._close();
      }
    });

    // Event: backdrop click
    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop && !this.forced) {
        this._close();
      }
    });
  }

  /**
   * Shows the modal with the given options.
   */
  public show(options: ModalOptions): void {
    this.forced = options.forced ?? false;

    // Title & icon
    this.icon.textContent = modalLevelIcon(options.level);
    this.title.textContent = options.title;
    this.title.style.color = modalLevelColor(options.level);

    // Body
    this.body.textContent = options.message;

    // Close button visibility
    this.closeButton.style.display = this.forced
      ? 'none'
      : '';

    // Buttons
    this.footer.innerHTML = '';
    options.buttons.forEach((btn) => {
      const buttonEl = document.createElement('button');
      buttonEl.className = buttonStyleClass(btn.style);
      buttonEl.textContent = btn.label;
      buttonEl.dataset.modalButton = btn.label;
      buttonEl.addEventListener('click', () => {
        this._close();
        btn.callback();
      });
      this.footer.appendChild(buttonEl);
    });

    // Show
    this.backdrop.dataset.modalOpen = 'true';
  }

  /**
   * Closes the modal if not forced.
   */
  public close(): void {
    if (this.forced) {
      return;
    }
    this._close();
  }

  /**
   * Force-closes the modal (ignores forced flag).
   */
  private _close(): void {
    this.backdrop.dataset.modalOpen = 'false';
    this.forced = false;
  }
}
