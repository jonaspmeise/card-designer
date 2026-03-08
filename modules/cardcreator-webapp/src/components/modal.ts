/**
 * Modal module
 * Provides a generic modal dialog that can be injected into any shadow DOM.
 * This is a UI-only component that responds to dialog events.
 */

import { CardCreatorLibrary } from 'cardcreator-library';

// ── Types (mirrored from library to avoid circular imports) ──

/**
 * The severity/information level of the dialog.
 */
export type DialogLevel =
  | 'info'
  | 'warning'
  | 'error'
  | 'question';

/**
 * The visual style of a dialog button.
 */
export type DialogButtonStyle =
  | 'primary'
  | 'secondary'
  | 'danger';

/**
 * A button choice displayed in the dialog footer.
 */
export interface DialogChoice {
  label: string;
  style: DialogButtonStyle;
}

/**
 * Options passed to `show()` to configure a modal dialog.
 * The pick function is called when a button is clicked - the actual
 * business logic callbacks are handled by the DialogService, not here.
 */
export interface ModalOptions {
  /** The modal title. */
  title: string;
  /** The modal body message. */
  message: string;
  /** The severity/information level, which determines the icon and accent color. */
  level: DialogLevel;
  /** Buttons rendered in the footer. */
  choices: DialogChoice[];
  /** If true, the user cannot dismiss the modal without clicking a button (no close button, no backdrop click). */
  forced: boolean;
  /** Called when a button is clicked, passing the choice label. */
  pick: (choiceLabel: string) => void;
}

/**
 * Modal dialog manager.
 * Injects modal HTML/CSS into a shadow root and provides show/close methods.
 * All DOM references are cached on construction.
 */
export class Modal {
  private backdrop!: HTMLDivElement;
  private icon!: HTMLSpanElement;
  private title!: HTMLHeadingElement;
  private body!: HTMLDivElement;
  private footer!: HTMLDivElement;
  private closeButton!: HTMLButtonElement;
  private forced = false;
  private pick: ((choiceLabel: string) => void) | null =
    null;

  private shadow: ShadowRoot;
  private library!: CardCreatorLibrary;

  public constructor(shadow: ShadowRoot) {
    this.shadow = shadow;
    this.shadow.appendChild(
      this.template().content.cloneNode(true),
    );

    // Cache references
    this.backdrop = this.shadow.getElementById(
      'modal-backdrop',
    ) as HTMLDivElement;
    this.icon = this.shadow.getElementById(
      'modal-icon',
    ) as HTMLSpanElement;
    this.title = this.shadow.getElementById(
      'modal-title',
    ) as HTMLHeadingElement;
    this.body = this.shadow.getElementById(
      'modal-body',
    ) as HTMLDivElement;
    this.footer = this.shadow.getElementById(
      'modal-footer',
    ) as HTMLDivElement;
    this.closeButton = this.shadow.getElementById(
      'modal-close-button',
    ) as HTMLButtonElement;

    // Event: close button
    this.closeButton.addEventListener('click', () => {
      if (!this.forced) {
        this._dismiss();
      }
    });

    // Event: backdrop click
    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop && !this.forced) {
        this._dismiss();
      }
    });
  }

  public initLibrary(library: CardCreatorLibrary) {
    this.library = library;

    this.library.events.on('dialogOpened', (event) => {
      // show modal with options.
      this.show({
        title: event.data.title,
        message: event.data.message,
        level: event.data.level,
        choices: event.data.choices,
        forced: event.data.forced,
        pick: event.data.pick,
      });
    });
  }

  protected template(): HTMLTemplateElement {
    const template = document.createElement('template');
    template.innerHTML = `
      <style>
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
      </style>
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
    return template;
  }

  /**
   * Shows the modal with the given options.
   */
  public show(options: ModalOptions): void {
    this.forced = options.forced;
    this.pick = options.pick;

    // Title & icon
    this.icon.textContent = this._modalLevelIcon(
      options.level,
    );
    this.title.textContent = options.title;
    this.title.style.color = this._modalLevelColor(
      options.level,
    );

    // Body
    this.body.textContent = options.message;

    // Close button visibility
    this.closeButton.style.display = this.forced
      ? 'none'
      : '';

    // Buttons
    this.footer.innerHTML = '';
    options.choices.forEach((choice) => {
      const buttonEl = document.createElement('button');
      buttonEl.className = this._buttonStyleClass(
        choice.style,
      );
      buttonEl.textContent = choice.label;
      buttonEl.dataset.modalButton = choice.label;
      buttonEl.addEventListener('click', () => {
        console.debug(`Button clicked: ${choice.label}`);
        this._handlePick(choice.label);
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
   * Handles a button choice being picked.
   * Closes the modal and calls pick().
   */
  private _handlePick(choiceLabel: string): void {
    this.pick?.(choiceLabel);
    this._close();
  }

  /**
   * Handles dismissal without making a choice (X button or backdrop).
   * Closes the modal and calls onClose().
   */
  private _dismiss(): void {
    this._close();
  }

  /**
   * Internal close - hides the modal and clears state.
   */
  private _close(): void {
    this.backdrop.dataset.modalOpen = 'false';
    this.forced = false;
    this.pick = null;
  }

  /**
   * Maps a DialogLevel to its display icon.
   */
  private _modalLevelIcon(level: DialogLevel): string {
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
   * Maps a DialogLevel to its CSS accent color.
   * @param level The DialogLevel to get the color for
   * @returns A CSS color string representing the accent color for the given DialogLevel
   */
  private _modalLevelColor(level: DialogLevel): string {
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
   * Maps a DialogButtonStyle to its CSS class.
   */
  private _buttonStyleClass(
    style: DialogButtonStyle = 'secondary',
  ): string {
    return `modal-btn-${style}`;
  }
}
