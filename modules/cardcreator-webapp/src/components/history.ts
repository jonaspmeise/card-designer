import { CommandExecutedEvent } from 'cardcreator-library/events/event-types';
import { CardcreatorHTMLComponent } from '../cardcreator-component';

/**
 * History Web Component for undo/redo functionality.
 */
export class HistoryElement extends CardcreatorHTMLComponent {
  private _list: HTMLUListElement;

  constructor() {
    super();

    this._list = this.shadow.getElementById(
      'commands',
    ) as HTMLUListElement;
  }

  protected template(): HTMLTemplateElement {
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
        <ol id="commands"></ol>
      </div>
    `;

    return template;
  }

  protected init(): void {
    this.library.events.on('commandExecuted', (command) => {
      this._addCommand(command);
    });
  }

  /**
   * Renders a new command in the history list.
   * @param event The command executed event to render.
   */
  private _addCommand(event: CommandExecutedEvent): void {
    console.debug(
      `Adding command to history: ${event.data.id}`,
    );

    const item = document.createElement('li');
    item.classList.add('item');
    item.textContent = `${event.data.constructor.name}`;

    this._list.appendChild(item);
  }
}

customElements.define('cc-history', HistoryElement);
