import { CardcreatorHTMLComponent } from '../cardcreator-component';

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
  <div>
    <input id="auto-preview-toggle" type="checkbox" checked />
    <button id="render-preview-button" disabled>Preview</button>
  </div>
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
  private selected: Card | null = null;
  private autoPreviewEnabled: boolean = true;
  private readonly renderButton: HTMLButtonElement;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    this.shadow.appendChild(
      template.content.cloneNode(true),
    );

    // Hook up toggles.
    (
      this.shadow.getElementById(
        'auto-preview-toggle',
      ) as HTMLInputElement
    ).addEventListener('change', (event) => {
      const toggle = event.target as HTMLInputElement;
      this.autoPreviewEnabled = toggle.checked;
    });

    this.renderButton = this.shadow.getElementById(
      'render-preview-button',
    ) as HTMLButtonElement;
    this.renderButton.addEventListener('click', () => {
      if (this.selected) {
        this.preview(this.selected);
      }
    });
  }

  /**
   * Init method, which is called after the library is registered.
   */
  init(): void {
    this.library.events.on('cardsLoaded', (event) => {
      this.cards = event.data.cards;
      this.columns = this.extractColumns();
      this.render();
    });
  }

  /**
   * Extracts all columns from current, loaded cards.
   * @returns a list of columns.
   */
  private extractColumns(): string[] {
    const cols = new Set<string>();
    this.cards.forEach((card) => {
      Object.keys(card).forEach((k) => {
        cols.add(k);
      });
    });
    return Array.from(cols);
  }

  /**
   * Renders the current state of the component.
   */
  private render(): void {
    const thead = this.shadow.getElementById('thead')!;
    const tbody = this.shadow.getElementById('tbody')!;
    const count = this.shadow.getElementById('count')!;

    count.textContent = `${this.cards.length} cards`;

    if (this.cards.length === 0) {
      this.renderButton.disabled = true;

      thead.innerHTML = '';
      tbody.innerHTML =
        '<tr><td class="empty" colspan="100">No cards loaded</td></tr>';
      return;
    }

    this.renderButton.disabled = this.selected === null;

    thead.innerHTML = `<tr>${this.columns
      .map((c) => `<th>${c}</th>`)
      .join('')}</tr>`;
    tbody.innerHTML = this.cards
      .map(
        (card, i) => `
      <tr data-card="${i}" class="${
          card === this.selected ? 'selected' : ''
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
      row.onclick = () =>
        this.selectCard(
          this.cards[Number(row.getAttribute('data-card'))],
        );
    });
  }

  /**
   * Formats a given object into a nice string representation.
   * @param val The object to convert.
   * @returns Its string representation.
   */
  private formatValue(val: unknown): string {
    if (val === null || val === undefined) {
      return '';
    }
    if (typeof val === 'object') {
      return JSON.stringify(val, null, 2);
    }

    return String(val);
  }

  /**
   * Trigger that is called when a card is selected through the table.
   * @param card The selected card.
   */
  private selectCard(card: Card): void {
    this.selected = card;
    this.render();

    // Emit preview event.
    if (this.autoPreviewEnabled) {
      this.preview(card);
    }
  }

  /**
   * Issues a render for the library.
   * @param card The card to render.
   */
  private preview(card: Card): void {
    this.library.render.preview(card);
  }
}

customElements.define('cc-card-table', CardTableElement);
