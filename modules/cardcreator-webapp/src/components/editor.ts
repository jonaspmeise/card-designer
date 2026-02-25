/**
 * Editor Web Component - SVG template editor with {{ }} highlighting
 */
import { CardcreatorHTMLComponent } from '../cardcreator-component';

export class EditorElement extends CardcreatorHTMLComponent {
  private editorElement!: HTMLTextAreaElement;

  constructor() {
    super();
  }

  protected template(): HTMLTemplateElement {
    const template = document.createElement('template');
    template.innerHTML = `
      <style>
        :host { display: flex; flex-direction: column; flex: 1; overflow: hidden; }
        .header { padding: 8px; background: var(--bg-tertiary, #353550); border-bottom: 1px solid var(--border, #404060); font-weight: 600; display: flex; justify-content: space-between; }
        .filename { font-size: 12px; color: #888; }
        .container { flex: 1; display: flex; overflow: hidden; position: relative; }
        .line-numbers { padding: 12px 8px; background: var(--bg-tertiary, #353550); color: #666; font-family: 'Fira Code', monospace; font-size: 13px; line-height: 1.5; text-align: right; user-select: none; overflow: hidden; }
        .editor-wrap { flex: 1; position: relative; overflow: auto; }
        .highlight { position: absolute; top: 0; left: 0; right: 0; padding: 12px; font-family: 'Fira Code', monospace; font-size: 13px; line-height: 1.5; white-space: pre-wrap; word-wrap: break-word; pointer-events: none; color: transparent; }
        .highlight .expr { background: rgba(124, 58, 237, 0.3); color: #c4b5fd; border-radius: 2px; }
        textarea { position: absolute; top: 0; left: 0; width: 100%; height: 100%; padding: 12px; font-family: 'Fira Code', monospace; font-size: 13px; line-height: 1.5; background: transparent; color: var(--text, #eee); border: none; resize: none; white-space: pre-wrap; word-wrap: break-word; caret-color: white; box-sizing: border-box; }
        textarea:focus { outline: none; }
      </style>
      <div class="header">
        <span>Editor</span>
        <span class="filename" id="filename">No file</span>
      </div>
      <div class="container">
        <div class="line-numbers" id="lines">1</div>
        <div class="editor-wrap">
          <div class="highlight" id="highlight"></div>
          <textarea id="editor" spellcheck="false" placeholder="Load an SVG template..."></textarea>
        </div>
      </div>
    `;
    return template;
  }

  protected init(): void {
    this.editorElement = this.shadow.getElementById(
      'editor',
    ) as HTMLTextAreaElement;
    this.editorElement.addEventListener('input', () => {
      this.library.template.loadTemplate(
        this.editorElement.value,
      );
    });

    // Register hooks.
    this.library.events.on('templateLoaded', (event) => {
      const template = event.data.template;
      this.editorElement.value = template.source;
    });
  }
}

customElements.define('cc-editor', EditorElement);
