/**
 * Config Web Component
 */
const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host { display: flex; flex-direction: column; flex: 1; overflow: hidden; }
    .header { padding: 8px; background: var(--bg-tertiary, #353550); border-bottom: 1px solid var(--border, #404060); font-weight: 600; }
    .content { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    textarea { flex: 1; background: var(--bg-secondary, #252540); color: var(--text, #eee); border: none; padding: 12px; font-family: 'Fira Code', monospace; font-size: 13px; resize: none; }
    .error { color: #f87171; padding: 8px; background: #450a0a; font-size: 12px; display: none; }
    .error.visible { display: block; }
    .footer { padding: 8px; display: flex; gap: 8px; background: var(--bg-tertiary, #353550); }
    button { background: var(--accent, #7c3aed); color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; }
  </style>
  <div class="header">Configuration</div>
  <div class="content">
    <textarea id="editor" placeholder="Enter JSON configuration..."></textarea>
    <div class="error" id="error"></div>
  </div>
  <div class="footer">
    <button id="apply">Apply</button>
    <button id="reset">Reset</button>
  </div>
`;

export class ConfigElement extends HTMLElement {
  private shadow: ShadowRoot;
  private currentConfig: Record<string, unknown> = {};

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    this.shadow.appendChild(
      template.content.cloneNode(true),
    );
  }

  connectedCallback(): void {
    this.shadow.getElementById('apply')!.onclick = () =>
      this.applyConfig();
    this.shadow.getElementById('reset')!.onclick = () =>
      this.resetConfig();

    window.addEventListener('cc:config-loaded', ((
      e: CustomEvent,
    ) => {
      this.currentConfig = e.detail || {};
      this.getEditor().value = JSON.stringify(
        this.currentConfig,
        null,
        2,
      );
      this.clearError();
    }) as EventListener);
  }

  private applyConfig(): void {
    const text = this.getEditor().value.trim();
    if (!text) {
      this.showError('Configuration is empty');
      return;
    }

    try {
      const parsed = JSON.parse(text);
      this.clearError();
      const lib = (window as any).cardCreatorLibrary;
      if (lib?.config?.merge) {
        lib.config.merge(parsed);
      }
    } catch (err) {
      this.showError(
        `Invalid JSON: ${(err as Error).message}`,
      );
    }
  }

  private resetConfig(): void {
    this.getEditor().value = JSON.stringify(
      this.currentConfig,
      null,
      2,
    );
    this.clearError();
  }

  private showError(message: string): void {
    const el = this.shadow.getElementById('error')!;
    el.textContent = message;
    el.classList.add('visible');
  }

  private clearError(): void {
    this.shadow
      .getElementById('error')!
      .classList.remove('visible');
  }

  // For testing
  getEditor(): HTMLTextAreaElement {
    return this.shadow.getElementById(
      'editor',
    ) as HTMLTextAreaElement;
  }

  getError(): HTMLElement {
    return this.shadow.getElementById('error')!;
  }

  clickApply(): void {
    this.shadow.getElementById('apply')!.click();
  }
}

customElements.define('cc-config', ConfigElement);
