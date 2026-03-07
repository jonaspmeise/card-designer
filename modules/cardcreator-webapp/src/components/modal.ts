/**
 * Modal Web Component
 * A reusable Bootstrap-style modal for confirmations and dialogs.
 */
export class ModalElement extends HTMLElement {
  private shadow: ShadowRoot;
  private _backdrop!: HTMLDivElement;
  private _modal!: HTMLDivElement;
  private _title!: HTMLHeadingElement;
  private _body!: HTMLDivElement;
  private _footer!: HTMLDivElement;
  private _closeButton!: HTMLButtonElement;

  private _resolvePromise?: (result: boolean) => void;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    this.shadow.appendChild(
      this.template().content.cloneNode(true),
    );

    this._backdrop = this.shadow.getElementById(
      'backdrop',
    ) as HTMLDivElement;
    this._modal = this.shadow.getElementById(
      'modal',
    ) as HTMLDivElement;
    this._title = this.shadow.getElementById(
      'modal-title',
    ) as HTMLHeadingElement;
    this._body = this.shadow.getElementById(
      'modal-body',
    ) as HTMLDivElement;
    this._footer = this.shadow.getElementById(
      'modal-footer',
    ) as HTMLDivElement;
    this._closeButton = this.shadow.getElementById(
      'close-button',
    ) as HTMLButtonElement;

    this._closeButton.addEventListener('click', () => {
      this.close(false);
    });

    this._backdrop.addEventListener('click', (e) => {
      if (e.target === this._backdrop) {
        this.close(false);
      }
    });
  }

  /**
   * Shows a confirmation dialog with the given title and message.
   * @param title The modal title
   * @param message The modal body message
   * @param confirmText The text for the confirm button (default: "Confirm")
   * @param cancelText The text for the cancel button (default: "Cancel")
   * @returns A promise that resolves to true if confirmed, false if cancelled
   */
  public confirm(
    title: string,
    message: string,
    confirmText: string = 'Confirm',
    cancelText: string = 'Cancel',
  ): Promise<boolean> {
    this._title.textContent = title;
    this._body.textContent = message;

    // Clear existing buttons
    this._footer.innerHTML = '';

    // Create cancel button
    const cancelButton = document.createElement('button');
    cancelButton.id = 'cancel-button';
    cancelButton.className = 'btn btn-secondary';
    cancelButton.textContent = cancelText;
    cancelButton.addEventListener('click', () => {
      this.close(false);
    });

    // Create confirm button
    const confirmButton = document.createElement('button');
    confirmButton.id = 'confirm-button';
    confirmButton.className = 'btn btn-primary';
    confirmButton.textContent = confirmText;
    confirmButton.addEventListener('click', () => {
      this.close(true);
    });

    this._footer.appendChild(cancelButton);
    this._footer.appendChild(confirmButton);

    // Show modal
    this._backdrop.classList.add('show');
    this._modal.classList.add('show');

    return new Promise((resolve) => {
      this._resolvePromise = resolve;
    });
  }

  /**
   * Closes the modal with the given result.
   * @param result The result to resolve the promise with
   */
  public close(result: boolean): void {
    this._backdrop.classList.remove('show');
    this._modal.classList.remove('show');

    if (this._resolvePromise) {
      this._resolvePromise(result);
      this._resolvePromise = undefined;
    }
  }

  /**
   * Returns whether the modal is currently visible.
   */
  public isOpen(): boolean {
    return this._backdrop.classList.contains('show');
  }

  protected template(): HTMLTemplateElement {
    const template = document.createElement('template');
    template.innerHTML = `
      <style>
        :host {
          display: contents;
        }

        .backdrop {
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

        .backdrop.show {
          display: flex;
        }

        .modal {
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

        .modal.show {
          display: flex;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          border-bottom: 1px solid var(--border, #404060);
          background: var(--bg-tertiary, #353550);
        }

        .modal-title {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }

        .close-button {
          background: none;
          border: none;
          color: var(--text, #eee);
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          line-height: 1;
        }

        .close-button:hover {
          color: var(--accent, #7c3aed);
        }

        .modal-body {
          padding: 16px;
          overflow: auto;
          line-height: 1.5;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          padding: 16px;
          border-top: 1px solid var(--border, #404060);
          background: var(--bg-tertiary, #353550);
        }

        .btn {
          padding: 8px 16px;
          border-radius: 4px;
          border: none;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: opacity 0.2s;
        }

        .btn:hover {
          opacity: 0.9;
        }

        .btn-primary {
          background: var(--accent, #7c3aed);
          color: white;
        }

        .btn-secondary {
          background: var(--bg-hover, #404060);
          color: var(--text, #eee);
        }
      </style>

      <div class="backdrop" id="backdrop">
        <div class="modal" id="modal">
          <div class="modal-header">
            <h2 class="modal-title" id="modal-title">Modal Title</h2>
            <button class="close-button" id="close-button">&times;</button>
          </div>
          <div class="modal-body" id="modal-body">
            Modal content goes here.
          </div>
          <div class="modal-footer" id="modal-footer">
          </div>
        </div>
      </div>
    `;

    return template;
  }
}

customElements.define('cc-modal', ModalElement);
