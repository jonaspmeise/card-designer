/**
 * Editor Web Component - SVG template editor with {{ }} highlighting
 */
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

export class EditorElement extends HTMLElement {
  private shadow: ShadowRoot;
  private currentFile: string | null = null;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    this.shadow.appendChild(
      template.content.cloneNode(true),
    );
  }

  connectedCallback(): void {
    const editor = this.getEditor();
    editor.oninput = () => this.updateHighlight();
    editor.onscroll = () => this.syncScroll();
    editor.onkeydown = (e) => this.handleTab(e);

    window.addEventListener('cc:template-loaded', ((
      e: CustomEvent,
    ) => {
      this.currentFile = e.detail?.filename || null;
      editor.value = e.detail?.content || '';
      this.shadow.getElementById('filename')!.textContent =
        this.currentFile || 'No file';
      this.updateHighlight();
    }) as EventListener);

    window.addEventListener('cc:settings-changed', ((
      e: CustomEvent,
    ) => {
      const fontSize = e.detail?.fontSize || 13;
      editor.style.fontSize = `${fontSize}px`;
      this.shadow.getElementById(
        'highlight',
      )!.style.fontSize = `${fontSize}px`;
      this.shadow.getElementById('lines')!.style.display = e
        .detail?.lineNumbers
        ? 'block'
        : 'none';
    }) as EventListener);
  }

  private updateHighlight(): void {
    const text = this.getEditor().value;
    const highlighted = this.escapeHtml(text).replace(
      /\{\{(.+?)\}\}/g,
      '<span class="expr">{{$1}}</span>',
    );
    this.shadow.getElementById('highlight')!.innerHTML =
      highlighted + '\n';
    this.updateLineNumbers();
  }

  private updateLineNumbers(): void {
    const lines = this.getEditor().value.split('\n').length;
    this.shadow.getElementById('lines')!.innerHTML =
      Array.from({ length: lines }, (_, i) => i + 1).join(
        '<br>',
      );
  }

  private syncScroll(): void {
    const editor = this.getEditor();
    const highlight =
      this.shadow.getElementById('highlight')!;
    const lines = this.shadow.getElementById('lines')!;
    highlight.scrollTop = editor.scrollTop;
    highlight.scrollLeft = editor.scrollLeft;
    lines.scrollTop = editor.scrollTop;
  }

  private handleTab(e: KeyboardEvent): void {
    if (e.key === 'Tab') {
      e.preventDefault();
      const editor = this.getEditor();
      const start = editor.selectionStart;
      editor.value =
        editor.value.slice(0, start) +
        '  ' +
        editor.value.slice(editor.selectionEnd);
      editor.selectionStart = editor.selectionEnd =
        start + 2;
      this.updateHighlight();
    }
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  getValue(): string {
    return this.getEditor().value;
  }

  setValue(content: string): void {
    this.getEditor().value = content;
    this.updateHighlight();
  }

  // For testing
  getEditor(): HTMLTextAreaElement {
    return this.shadow.getElementById(
      'editor',
    ) as HTMLTextAreaElement;
  }

  getHighlight(): HTMLElement {
    return this.shadow.getElementById('highlight')!;
  }

  getLineNumbers(): HTMLElement {
    return this.shadow.getElementById('lines')!;
  }
}

customElements.define('cc-editor', EditorElement);
