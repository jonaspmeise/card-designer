/**
 * Preview Web Component - Shows rendered card preview
 */
const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host { display: flex; flex-direction: column; flex: 1; overflow: hidden; }
    .header { padding: 8px; background: var(--bg-tertiary, #353550); border-bottom: 1px solid var(--border, #404060); font-weight: 600; display: flex; justify-content: space-between; align-items: center; }
    .controls { display: flex; gap: 8px; align-items: center; font-size: 12px; }
    label { display: flex; align-items: center; gap: 4px; cursor: pointer; }
    .container { flex: 1; display: flex; align-items: center; justify-content: center; overflow: auto; padding: 16px; background: repeating-conic-gradient(#252540 0% 25%, #1a1a2e 0% 50%) 50% / 20px 20px; }
    .preview { max-width: 100%; max-height: 100%; box-shadow: 0 4px 20px rgba(0,0,0,0.4); }
    .empty { color: #888; text-align: center; }
    button { background: var(--accent, #7c3aed); color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px; }
  </style>
  <div class="header">
    <span>Preview</span>
    <div class="controls">
      <label>
        <input type="checkbox" id="auto-preview" checked>
        Auto preview
      </label>
      <button id="refresh">Refresh</button>
    </div>
  </div>
  <div class="container" id="container">
    <div class="empty">Select a card to preview</div>
  </div>
`;

export class PreviewElement extends HTMLElement {
  private shadow: ShadowRoot;
  private currentCardId: string | null = null;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    this.shadow.appendChild(
      template.content.cloneNode(true),
    );
  }

  connectedCallback(): void {
    this.shadow.getElementById('refresh')!.onclick = () =>
      this.refresh();

    window.addEventListener('cc:preview-rendered', ((
      e: CustomEvent,
    ) => {
      if (e.detail?.image) {
        this.showImage(e.detail.image);
      }
    }) as EventListener);

    window.addEventListener('cc:card-selected', ((
      e: CustomEvent,
    ) => {
      this.currentCardId = e.detail?.cardId || null;
      if (
        this.isAutoPreviewEnabled() &&
        this.currentCardId
      ) {
        this.requestPreview(this.currentCardId);
      }
    }) as EventListener);

    // Load auto-preview state from localStorage
    const stored = localStorage.getItem('cc-auto-preview');
    if (stored !== null) {
      this.getAutoPreviewCheckbox().checked =
        stored === 'true';
    }

    this.getAutoPreviewCheckbox().onchange = () => {
      localStorage.setItem(
        'cc-auto-preview',
        String(this.isAutoPreviewEnabled()),
      );
    };
  }

  private showImage(dataUrl: string): void {
    const container =
      this.shadow.getElementById('container')!;
    container.innerHTML = `<img class="preview" src="${dataUrl}" alt="Card preview">`;
  }

  private refresh(): void {
    if (this.currentCardId) {
      this.requestPreview(this.currentCardId);
    }
  }

  private requestPreview(cardId: string): void {
    const lib = (window as any).cardCreatorLibrary;
    lib?.preview?.render?.(cardId);
  }

  isAutoPreviewEnabled(): boolean {
    return this.getAutoPreviewCheckbox().checked;
  }

  public setAutoPreview(enabled: boolean): void {
    this.getAutoPreviewCheckbox().checked = enabled;
  }

  // For testing
  getAutoPreviewCheckbox(): HTMLInputElement {
    return this.shadow.getElementById(
      'auto-preview',
    ) as HTMLInputElement;
  }

  getContainer(): HTMLElement {
    return this.shadow.getElementById('container')!;
  }

  clickRefresh(): void {
    this.shadow.getElementById('refresh')!.click();
  }

  getCurrentCardId(): string | null {
    return this.currentCardId;
  }
}

customElements.define('cc-preview', PreviewElement);
