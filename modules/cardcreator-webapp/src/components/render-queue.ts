/**
 * Render Queue Web Component - Shows pending renders
 */
const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host { display: flex; flex-direction: column; flex: 1; overflow: hidden; }
    .header { padding: 8px; background: var(--bg-tertiary, #353550); border-bottom: 1px solid var(--border, #404060); font-weight: 600; display: flex; justify-content: space-between; align-items: center; }
    .actions { display: flex; gap: 4px; }
    button { background: var(--accent, #7c3aed); color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    button.danger { background: #dc2626; }
    .list { flex: 1; overflow: auto; }
    .item { padding: 8px 12px; border-bottom: 1px solid var(--border, #404060); display: flex; justify-content: space-between; align-items: center; }
    .item:hover { background: var(--bg-hover, #404060); }
    .item.processing { background: #1e1b4b; }
    .name { font-size: 13px; }
    .status { font-size: 11px; color: #888; }
    .spinner { animation: spin 1s linear infinite; display: inline-block; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty { padding: 24px; text-align: center; color: #888; }
    .progress { height: 4px; background: var(--bg-secondary, #252540); margin-top: 8px; }
    .progress-bar { height: 100%; background: var(--accent, #7c3aed); transition: width 0.3s; }
  </style>
  <div class="header">
    <span>Render Queue</span>
    <div class="actions">
      <button id="render-all">Render All</button>
      <button id="clear" class="danger">Clear</button>
    </div>
  </div>
  <div class="progress" id="progress" hidden>
    <div class="progress-bar" id="progress-bar"></div>
  </div>
  <div class="list" id="list">
    <div class="empty">Queue is empty</div>
  </div>
`;

interface QueueItem {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'done';
}

export class RenderQueueElement extends HTMLElement {
  private shadow: ShadowRoot;
  private queue: QueueItem[] = [];
  private processed = 0;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    this.shadow.appendChild(
      template.content.cloneNode(true),
    );
  }

  connectedCallback(): void {
    this.shadow.getElementById('render-all')!.onclick =
      () => this.renderAll();
    this.shadow.getElementById('clear')!.onclick = () =>
      this.clear();

    window.addEventListener('cc:cards-loaded', ((
      e: CustomEvent,
    ) => {
      const cards = e.detail || [];
      this.queue = cards.map((c: any) => ({
        id: c.id || crypto.randomUUID(),
        name: c.name || 'Unnamed',
        status: 'pending' as const,
      }));
      this.processed = 0;
      this.render();
    }) as EventListener);

    window.addEventListener('cc:render-progress', ((
      e: CustomEvent,
    ) => {
      const { current, total, cardId } = e.detail || {};
      this.processed = current || 0;
      const item = this.queue.find((q) => q.id === cardId);
      if (item) item.status = 'processing';
      this.render();
    }) as EventListener);

    window.addEventListener('cc:render-complete', ((
      e: CustomEvent,
    ) => {
      const item = this.queue.find(
        (q) => q.id === e.detail?.cardId,
      );
      if (item) item.status = 'done';
      this.render();
    }) as EventListener);
  }

  private render(): void {
    const list = this.shadow.getElementById('list')!;
    const progress =
      this.shadow.getElementById('progress')!;
    const progressBar =
      this.shadow.getElementById('progress-bar')!;

    if (this.queue.length === 0) {
      list.innerHTML =
        '<div class="empty">Queue is empty</div>';
      progress.hidden = true;
      return;
    }

    const pending = this.queue.filter(
      (q) => q.status !== 'done',
    );
    if (pending.length < this.queue.length) {
      progress.hidden = false;
      progressBar.style.width = `${
        ((this.queue.length - pending.length) /
          this.queue.length) *
        100
      }%`;
    } else {
      progress.hidden = true;
    }

    list.innerHTML =
      pending
        .map(
          (item) => `
      <div class="item ${item.status}">
        <span class="name">${item.name}</span>
        <span class="status">
          ${
            item.status === 'processing'
              ? '<span class="spinner">⏳</span>'
              : item.status
          }
        </span>
      </div>
    `,
        )
        .join('') ||
      '<div class="empty">All rendered!</div>';
  }

  private renderAll(): void {
    const lib = (window as any).cardCreatorLibrary;
    lib?.render?.all?.();
  }

  private clear(): void {
    this.queue = [];
    this.processed = 0;
    this.render();
  }

  // For testing
  getQueue(): QueueItem[] {
    return this.queue;
  }
  getList(): HTMLElement {
    return this.shadow.getElementById('list')!;
  }
  clickRenderAll(): void {
    this.shadow.getElementById('render-all')!.click();
  }
  clickClear(): void {
    this.shadow.getElementById('clear')!.click();
  }
}

customElements.define(
  'cc-render-queue',
  RenderQueueElement,
);
