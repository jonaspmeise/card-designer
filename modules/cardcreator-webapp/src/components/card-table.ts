import { CardcreatorHTMLComponent } from './cardcreator-component';

/**
 * Card Table Web Component - Shows loaded cards in a table
 */
const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host { display: flex; flex-direction: column; flex: 1; overflow: hidden; }
    .header { padding: 8px; background: var(--bg-tertiary, #353550); border-bottom: 1px solid var(--border, #404060); font-weight: 600; display: flex; justify-content: space-between; }
    .count { font-size: 12px; color: #888; }
    .table-wrap { flex: 1; overflow: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { position: sticky; top: 0; background: var(--bg-tertiary, #353550); text-align: left; padding: 8px; border-bottom: 2px solid var(--border, #404060); }
    td { padding: 8px; border-bottom: 1px solid var(--border, #404060); }
    tr:hover { background: var(--bg-hover, #404060); }
    tr.selected { background: var(--accent, #7c3aed); }
    tr { cursor: pointer; }
    .empty { padding: 24px; text-align: center; color: #888; }
  </style>
  <div class="header">
    <span>Cards</span>
    <span class="count" id="count"></span>
  </div>
  <div class="table-wrap">
    <table>
      <caption>
        <span id="card-table-card-count">No cards loaded.</span>
      </caption>
      <thead id="thead"></thead>
      <tbody id="tbody">
      </tbody>
    </table>
  </div>
`;

interface Card {
  id?: string;
  [key: string]: unknown;
}

export class CardTableElement extends CardcreatorHTMLComponent {
  private shadow: ShadowRoot;
  private cards: Card[] = [];
  private columns: string[] = [];
  private selectedId: string | null = null;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    this.shadow.appendChild(
      template.content.cloneNode(true),
    );
  }

  init(): void {
    // TODO: Implement cards loaded.
    this.library.events.on(
      'cardsLoaded',
      (cards: Card[]) => {
        this.cards = cards.map((c, i) => ({
          id: c.id || `card-${i}`,
          ...c,
        }));
        this.columns = this.extractColumns();
        this.selectedId = null;
        this.render();
      },
    );
  }

  private extractColumns(): string[] {
    const cols = new Set<string>();
    this.cards.forEach((card) => {
      Object.keys(card).forEach((k) => {
        if (k !== 'id') cols.add(k);
      });
    });
    return Array.from(cols).slice(0, 6); // Limit visible columns
  }

  private render(): void {
    const thead = this.shadow.getElementById('thead')!;
    const tbody = this.shadow.getElementById('tbody')!;
    const count = this.shadow.getElementById('count')!;

    count.textContent = `${this.cards.length} cards`;

    if (this.cards.length === 0) {
      thead.innerHTML = '';
      tbody.innerHTML =
        '<tr><td class="empty" colspan="100">No cards loaded</td></tr>';
      return;
    }

    thead.innerHTML = `<tr>${this.columns
      .map((c) => `<th>${c}</th>`)
      .join('')}</tr>`;
    tbody.innerHTML = this.cards
      .map(
        (card) => `
      <tr data-id="${card.id}" class="${
          card.id === this.selectedId ? 'selected' : ''
        }">
        ${this.columns
          .map(
            (c) => `<td>${this.formatValue(card[c])}</td>`,
          )
          .join('')}
      </tr>
    `,
      )
      .join('');

    tbody.querySelectorAll('tr').forEach((row) => {
      row.onclick = () => this.selectCard(row.dataset.id!);
    });
  }

  private formatValue(val: unknown): string {
    if (val === null || val === undefined) return '';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  }

  private selectCard(id: string): void {
    this.selectedId = id;
    this.render();

    window.dispatchEvent(
      new CustomEvent('cc:card-selected', {
        detail: {
          cardId: id,
          card: this.cards.find((c) => c.id === id),
        },
      }),
    );
  }
}

customElements.define('cc-card-table', CardTableElement);
