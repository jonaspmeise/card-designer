/**
 * Preview Web Component - Shows rendered card preview
 */
import { CardcreatorHTMLComponent } from '../cardcreator-component';

export class PreviewElement extends CardcreatorHTMLComponent {
  private autoPreviewElement!: HTMLInputElement;
  private refreshButton!: HTMLButtonElement;
  private previewImage!: HTMLImageElement;
  // The loaded Object URL of the image.
  private imageUrl: string | null = null;
  // The blob of the currently loaded image.
  private imageBlob: Blob | null = null;

  constructor() {
    super();
  }

  protected template(): HTMLTemplateElement {
    const template = document.createElement('template');
    template.innerHTML = `
      <style>
        :host { display: flex; flex-direction: column; flex: 1; overflow: hidden; }
        .header { padding: 8px; background: var(--bg-tertiary, #353550); border-bottom: 1px solid var(--border, #404060); font-weight: 600; display: flex; justify-content: space-between; align-items: center; }
        .controls { display: flex; gap: 8px; align-items: center; font-size: 12px; }
        label { display: flex; align-items: center; gap: 4px; cursor: pointer; }
        .container { flex: 1; display: flex; align-items: center; justify-content: center; overflow: auto; padding: 16px; background: repeating-conic-gradient(#252540 0% 25%, #1a1a2e 0% 50%) 50% / 20px 20px; }
        .preview { max-width: 100%; max-height: 100%; box-shadow: 0 4px 20px rgba(0,0,0,0.4); }
        .empty { color: #888; text-align: center; user-select: none; }
        .rendering { color: #888; text-align: center; }
        button { background: var(--accent, #7c3aed); color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px; }
        button:disabled { opacity: 0.5; cursor: not-allowed; }
      </style>
      <div class="header">
        <span>Preview</span>
        <div class="controls">
          <label>
            <input type="checkbox" id="auto-preview" checked>
            Auto preview
          </label>
          <button id="refresh" disabled>Refresh</button>
        </div>
      </div>
      <div class="container" id="container">
        <img id="preview-image"></img>
        <div id="preview-help-text" class="empty">Select a card to preview</div>
      </div>
    `;
    return template;
  }

  protected init(): void {
    this.autoPreviewElement = this.shadow.getElementById(
      'auto-preview',
    ) as HTMLInputElement;
    this.autoPreviewElement.addEventListener(
      'change',
      () => {
        console.debug(`Auto-preview is toggled...`);

        this.library.render.enablePreview(
          this.autoPreviewElement.checked,
        );

        this.refreshButton.disabled =
          this.autoPreviewElement.checked;
      },
    );

    this.refreshButton = this.shadow.getElementById(
      'refresh',
    ) as HTMLButtonElement;
    this.refreshButton.addEventListener('click', () => {
      console.debug('Refresh button clicked...');

      this.library.render.triggerPreview(false);
    });

    this.previewImage = this.shadow.getElementById(
      'preview-image',
    ) as HTMLImageElement;

    // Register hooks.
    this.library.events.on(
      'previewRenderFinished',
      (data) => {
        console.debug(
          'Preview render issued event, updating preview...',
        );

        (
          this.shadow.getElementById(
            'preview-help-text',
          ) as HTMLDivElement
        ).hidden = true;

        if (this.imageUrl != null) {
          console.debug(
            'Revoking old preview image URL...',
          );
          URL.revokeObjectURL(this.imageUrl);
          this.imageUrl = null;
        }

        const arrayBuffer = data.data.image as ArrayBuffer;
        this.imageBlob = new Blob([arrayBuffer], {
          type: 'image/png',
        });
        this.imageUrl = URL.createObjectURL(this.imageBlob);

        this.previewImage.src = this.imageUrl;
      },
    );
  }

  public image(): Blob | null {
    return this.imageBlob;
  }
}

customElements.define('cc-preview', PreviewElement);
