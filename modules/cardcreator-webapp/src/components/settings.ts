/**
 * Settings Web Component
 */
const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host { display: flex; flex-direction: column; flex: 1; overflow: hidden; }
    .header { padding: 8px; background: var(--bg-tertiary, #353550); border-bottom: 1px solid var(--border, #404060); font-weight: 600; }
    .content { flex: 1; overflow: auto; padding: 12px; }
    .group { margin-bottom: 16px; }
    .group-title { font-size: 12px; color: #888; margin-bottom: 8px; text-transform: uppercase; }
    .field { margin-bottom: 12px; }
    label { display: block; font-size: 13px; margin-bottom: 4px; }
    input, select { width: 100%; background: var(--bg-secondary, #252540); color: var(--text, #eee); border: 1px solid var(--border, #404060); padding: 6px 8px; border-radius: 4px; box-sizing: border-box; }
    input[type="checkbox"] { width: auto; margin-right: 8px; }
    .checkbox-label { display: flex; align-items: center; }
  </style>
  <div class="header">Settings</div>
  <div class="content">
    <div class="group">
      <div class="group-title">Output</div>
      <div class="field">
        <label>Format</label>
        <select id="format">
          <option value="png">PNG</option>
          <option value="jpg">JPG</option>
          <option value="webp">WebP</option>
        </select>
      </div>
      <div class="field">
        <label>Quality (1-100)</label>
        <input type="number" id="quality" min="1" max="100" value="90">
      </div>
      <div class="field">
        <label>Scale</label>
        <input type="number" id="scale" min="0.1" max="4" step="0.1" value="1">
      </div>
    </div>
    <div class="group">
      <div class="group-title">Editor</div>
      <div class="field">
        <label class="checkbox-label">
          <input type="checkbox" id="lineNumbers" checked>
          Show line numbers
        </label>
      </div>
      <div class="field">
        <label>Font size</label>
        <input type="number" id="fontSize" min="10" max="24" value="13">
      </div>
    </div>
  </div>
`;

export interface AppSettings {
  format: 'png' | 'jpg' | 'webp';
  quality: number;
  scale: number;
  lineNumbers: boolean;
  fontSize: number;
}

const STORAGE_KEY = 'cc-settings';

export class SettingsElement extends HTMLElement {
  private shadow: ShadowRoot;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    this.shadow.appendChild(
      template.content.cloneNode(true),
    );
  }

  connectedCallback(): void {
    this.loadSettings();
    this.shadow
      .querySelectorAll('input, select')
      .forEach((el) => {
        el.addEventListener('change', () =>
          this.saveSettings(),
        );
      });
  }

  private loadSettings(): void {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    try {
      const settings: AppSettings = JSON.parse(stored);
      (
        this.shadow.getElementById(
          'format',
        ) as HTMLSelectElement
      ).value = settings.format;
      (
        this.shadow.getElementById(
          'quality',
        ) as HTMLInputElement
      ).value = String(settings.quality);
      (
        this.shadow.getElementById(
          'scale',
        ) as HTMLInputElement
      ).value = String(settings.scale);
      (
        this.shadow.getElementById(
          'lineNumbers',
        ) as HTMLInputElement
      ).checked = settings.lineNumbers;
      (
        this.shadow.getElementById(
          'fontSize',
        ) as HTMLInputElement
      ).value = String(settings.fontSize);
    } catch {
      /* ignore */
    }
  }

  private saveSettings(): void {
    const settings = this.getSettings();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(settings),
    );
    window.dispatchEvent(
      new CustomEvent('cc:settings-changed', {
        detail: settings,
      }),
    );
  }

  getSettings(): AppSettings {
    return {
      format: (
        this.shadow.getElementById(
          'format',
        ) as HTMLSelectElement
      ).value as 'png' | 'jpg' | 'webp',
      quality: Number(
        (
          this.shadow.getElementById(
            'quality',
          ) as HTMLInputElement
        ).value,
      ),
      scale: Number(
        (
          this.shadow.getElementById(
            'scale',
          ) as HTMLInputElement
        ).value,
      ),
      lineNumbers: (
        this.shadow.getElementById(
          'lineNumbers',
        ) as HTMLInputElement
      ).checked,
      fontSize: Number(
        (
          this.shadow.getElementById(
            'fontSize',
          ) as HTMLInputElement
        ).value,
      ),
    };
  }

  // For testing
  getFormatSelect(): HTMLSelectElement {
    return this.shadow.getElementById(
      'format',
    ) as HTMLSelectElement;
  }
  getQualityInput(): HTMLInputElement {
    return this.shadow.getElementById(
      'quality',
    ) as HTMLInputElement;
  }
}

customElements.define('cc-settings', SettingsElement);
