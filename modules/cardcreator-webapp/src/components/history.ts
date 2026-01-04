/**
 * History Web Component
 */
const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host { display: flex; flex-direction: column; flex: 1; overflow: hidden; }
    .header { padding: 8px; background: var(--bg-tertiary, #353550); border-bottom: 1px solid var(--border, #404060); font-weight: 600; display: flex; justify-content: space-between; align-items: center; }
    .actions { display: flex; gap: 4px; }
    button { background: var(--bg-secondary, #252540); color: var(--text, #eee); border: 1px solid var(--border, #404060); padding: 4px 8px; border-radius: 4px; cursor: pointer; }
    button:hover { background: var(--bg-hover, #404060); }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .list { flex: 1; overflow: auto; }
    .item { padding: 8px 12px; border-bottom: 1px solid var(--border, #404060); cursor: pointer; display: flex; justify-content: space-between; }
    .item:hover { background: var(--bg-hover, #404060); }
    .item.current { background: var(--accent, #7c3aed); }
    .time { font-size: 11px; color: #888; }
  </style>
  <div class="header">
    <span>History</span>
    <div class="actions">
      <button id="undo" title="Undo">↩</button>
      <button id="redo" title="Redo">↪</button>
    </div>
  </div>
  <div class="list" id="list"></div>
`;

interface HistoryEntry {
  id: string;
  label: string;
  timestamp: number;
}

export class HistoryElement extends HTMLElement {
  private shadow: ShadowRoot;
  private entries: HistoryEntry[] = [];
  private currentIndex = -1;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    this.shadow.appendChild(
      template.content.cloneNode(true),
    );
  }

  connectedCallback(): void {
    this.shadow.getElementById('undo')!.onclick = () =>
      this.undo();
    this.shadow.getElementById('redo')!.onclick = () =>
      this.redo();
    this.updateButtons(); // Initialize button states

    window.addEventListener('cc:history-changed', ((
      e: CustomEvent,
    ) => {
      this.entries = e.detail?.entries || [];
      this.currentIndex = e.detail?.currentIndex ?? -1;
      this.render();
    }) as EventListener);
  }

  private render(): void {
    const list = this.shadow.getElementById('list')!;
    list.innerHTML = '';

    this.entries.forEach((entry, i) => {
      const item = document.createElement('div');
      item.className = `item${
        i === this.currentIndex ? ' current' : ''
      }`;
      item.innerHTML = `<span>${
        entry.label
      }</span><span class="time">${this.formatTime(
        entry.timestamp,
      )}</span>`;
      item.onclick = () => this.goTo(i);
      list.appendChild(item);
    });

    this.updateButtons();
  }

  private formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString();
  }

  private updateButtons(): void {
    (
      this.shadow.getElementById(
        'undo',
      ) as HTMLButtonElement
    ).disabled = this.currentIndex <= 0;
    (
      this.shadow.getElementById(
        'redo',
      ) as HTMLButtonElement
    ).disabled =
      this.currentIndex >= this.entries.length - 1;
  }

  private undo(): void {
    const lib = (window as any).cardCreatorLibrary;
    lib?.history?.undo?.();
  }

  private redo(): void {
    const lib = (window as any).cardCreatorLibrary;
    lib?.history?.redo?.();
  }

  private goTo(index: number): void {
    const lib = (window as any).cardCreatorLibrary;
    lib?.history?.goTo?.(index);
  }

  // For testing
  getList(): HTMLElement {
    return this.shadow.getElementById('list')!;
  }
  getUndoButton(): HTMLButtonElement {
    return this.shadow.getElementById(
      'undo',
    ) as HTMLButtonElement;
  }
  getRedoButton(): HTMLButtonElement {
    return this.shadow.getElementById(
      'redo',
    ) as HTMLButtonElement;
  }
}

customElements.define('cc-history', HistoryElement);
