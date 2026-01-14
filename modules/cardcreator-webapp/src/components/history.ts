import {
  CommandExecutedEvent,
  CommandUndoneEvent,
} from 'cardcreator-library/events/event-types';
import { CardcreatorHTMLComponent } from '../cardcreator-component';

/**
 * History Web Component for undo/redo functionality.
 */
export class HistoryElement extends CardcreatorHTMLComponent {
  private _list: HTMLUListElement;
  private _items: HTMLElement[] = [];

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
      this._toggle(command, 'do');
    });

    this.library.events.on('commandUndone', (command) => {
      this._toggle(command, 'undo');
    });
  }

  private _toggle(
    command: CommandExecutedEvent | CommandUndoneEvent,
    type: 'do' | 'undo',
  ): void {
    console.debug(
      `Toggling ${command.data.id} to: ${type}`,
    );

    const item = this._items.find(
      (i) => i.id === command.data.id,
    );

    console.debug(
      `Command undone event received: ${
        command.data.id
      }. Component item exists: ${item !== undefined}`,
    );

    if (item === undefined) {
      if (type === 'do') {
        // Item doesn't exist yet, we add it in this case.
        this._addCommand(command as CommandExecutedEvent);
        return;
      } else {
        // We can't really receive an undo event for an unknown command...
        console.warn(
          `Received commandUndone event for unknown command ID: ${command.data.id}`,
        );
        return;
      }
    }

    item.classList.remove(type === 'do' ? 'undo' : 'do');
    item.classList.add(type);
    (
      item.querySelector(
        `.${type === 'do' ? 'undo' : 'do'}-button`,
      )! as HTMLButtonElement
    ).disabled = false;
    (
      item.querySelector(
        `.${type}-button`,
      )! as HTMLButtonElement
    ).disabled = true;
  }

  /**
   * Renders a new command in the history list.
   * @param event The command executed event to render.
   */
  private _addCommand(event: CommandExecutedEvent): void {
    console.debug(
      `Adding command to history component: ${event.data.id}`,
    );

    const item = document.createElement('li');
    item.id = event.data.id;
    item.classList.add('item');
    item.innerHTML = `
      <div>
        ${event.data.message()}
        <div class="actions" data-command-id="${
          event.data.id
        }">
          <button class="undo-button">Undo</button>
          <button class="do-button" disabled>Do</button>
        </div>
      </div>
    `;

    // Register handlers.
    (
      item.querySelector(
        '.undo-button',
      )! as HTMLButtonElement
    ).onclick = () => {
      this.undo(event.data.id);
    };
    (
      item.querySelector('.do-button')! as HTMLButtonElement
    ).onclick = () => {
      this.do(event.data.id);
    };

    this._items.push(item);
    this._list.appendChild(item);
  }

  /**
   * Undoes a command by its ID.
   * @param commandId The ID of the command to undo.
   */
  private undo(commandId: string): void {
    console.debug(`Undoing command: ${commandId}`);

    this.library.history.undo(commandId);
  }

  /**
   * Executes a command by its ID.
   * @param commandId The ID of the command to execute.
   */
  private do(commandId: string): void {
    console.debug(`Executing command: ${commandId}`);
    this.library.history.do(commandId);
  }
}

customElements.define('cc-history', HistoryElement);
