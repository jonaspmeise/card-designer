/**
 * Render Jobs Web Component - Shows completed render jobs
 */
const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host { display: flex; flex-direction: column; flex: 1; overflow: hidden; }
    .header { padding: 8px; background: var(--bg-tertiary, #353550); border-bottom: 1px solid var(--border, #404060); font-weight: 600; display: flex; justify-content: space-between; }
    .count { font-size: 12px; color: #888; }
    .list { flex: 1; overflow: auto; }
    .job { padding: 8px 12px; border-bottom: 1px solid var(--border, #404060); display: flex; gap: 8px; align-items: center; }
    .job:hover { background: var(--bg-hover, #404060); }
    .thumb { width: 40px; height: 56px; background: var(--bg-secondary, #252540); border-radius: 4px; object-fit: contain; }
    .info { flex: 1; min-width: 0; }
    .name { font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .meta { font-size: 11px; color: #888; }
    .status { font-size: 11px; padding: 2px 6px; border-radius: 4px; }
    .status.success { background: #166534; color: #4ade80; }
    .status.error { background: #7f1d1d; color: #f87171; }
    .empty { padding: 24px; text-align: center; color: #888; }
  </style>
  <div class="header">
    <span>Render Jobs</span>
    <span class="count" id="count"></span>
  </div>
  <div class="list" id="list">
    <div class="empty">No render jobs yet</div>
  </div>
`;

interface RenderJob {
  id: string;
  cardName: string;
  status: 'success' | 'error';
  thumbnail?: string;
  time: number;
  error?: string;
}

export class RenderJobsElement extends HTMLElement {
  private shadow: ShadowRoot;
  private jobs: RenderJob[] = [];

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    this.shadow.appendChild(
      template.content.cloneNode(true),
    );
  }

  connectedCallback(): void {
    window.addEventListener('cc:render-complete', ((
      e: CustomEvent,
    ) => {
      this.addJob({
        id: crypto.randomUUID(),
        cardName: e.detail?.cardName || 'Unknown',
        status: 'success',
        thumbnail: e.detail?.thumbnail,
        time: Date.now(),
      });
    }) as EventListener);

    window.addEventListener('cc:render-error', ((
      e: CustomEvent,
    ) => {
      this.addJob({
        id: crypto.randomUUID(),
        cardName: e.detail?.cardName || 'Unknown',
        status: 'error',
        error: e.detail?.error,
        time: Date.now(),
      });
    }) as EventListener);
  }

  private addJob(job: RenderJob): void {
    this.jobs.unshift(job);
    if (this.jobs.length > 100) this.jobs.pop();
    this.render();
  }

  private render(): void {
    const list = this.shadow.getElementById('list')!;
    const count = this.shadow.getElementById('count')!;

    if (this.jobs.length === 0) {
      list.innerHTML =
        '<div class="empty">No render jobs yet</div>';
      count.textContent = '';
      return;
    }

    count.textContent = `${this.jobs.length} jobs`;
    list.innerHTML = this.jobs
      .map(
        (job) => `
      <div class="job">
        ${
          job.thumbnail
            ? `<img class="thumb" src="${job.thumbnail}" alt="">`
            : '<div class="thumb"></div>'
        }
        <div class="info">
          <div class="name">${job.cardName}</div>
          <div class="meta">${new Date(
            job.time,
          ).toLocaleTimeString()}</div>
        </div>
        <span class="status ${job.status}">${
          job.status
        }</span>
      </div>
    `,
      )
      .join('');
  }

  // For testing
  getJobs(): RenderJob[] {
    return this.jobs;
  }
  getList(): HTMLElement {
    return this.shadow.getElementById('list')!;
  }
}

customElements.define('cc-render-jobs', RenderJobsElement);
