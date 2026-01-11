import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLineGutter,
  highlightActiveLine,
  drawSelection,
} from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { json } from '@codemirror/lang-json';
import {
  linter,
  lintGutter,
  type Diagnostic,
} from '@codemirror/lint';
import {
  defaultKeymap,
  history,
  historyKeymap,
} from '@codemirror/commands';
import {
  syntaxHighlighting,
  defaultHighlightStyle,
  bracketMatching,
} from '@codemirror/language';
import { CardcreatorHTMLComponent } from '../cardcreator-component';

/**
 * Custom event fired when config content changes
 */
export interface ConfigChangeEvent {
  content: string;
  isValid: boolean;
  errors: string[];
}

/**
 * Dark theme for CodeMirror matching the app's design
 */
const darkTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: 'var(--bg-secondary, #252540)',
      color: 'var(--text, #eee)',
      height: '100%',
    },
    '.cm-content': {
      fontFamily: "'Fira Code', monospace",
      fontSize: '13px',
      padding: '12px 0',
      caretColor: 'var(--accent, #7c3aed)',
    },
    '.cm-cursor': {
      borderLeftColor: 'var(--accent, #7c3aed)',
    },
    '.cm-selectionBackground': {
      backgroundColor: 'rgba(124, 58, 237, 0.3)',
    },
    '::selection': {
      backgroundColor: 'rgba(124, 58, 237, 0.3)',
    },
    '.cm-gutters': {
      backgroundColor: 'var(--bg-tertiary, #353550)',
      color: 'var(--text-muted, #888)',
      border: 'none',
      borderRight: '1px solid var(--border, #404060)',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'rgba(124, 58, 237, 0.15)',
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(124, 58, 237, 0.08)',
    },
    '.cm-scroller': {
      overflow: 'auto',
      fontFamily: "'Fira Code', monospace",
    },
    '.cm-line': {
      padding: '0 12px',
    },
    // Lint gutter styling
    '.cm-lint-marker-error': {
      content: '"●"',
    },
    '.cm-lintRange-error': {
      backgroundImage: 'none',
      borderBottom: '2px wavy #f87171',
    },
    '.cm-lintRange-warning': {
      backgroundImage: 'none',
      borderBottom: '2px wavy #fbbf24',
    },
    // Tooltip styling for lint errors
    '.cm-tooltip': {
      backgroundColor: 'var(--bg-tertiary, #353550)',
      border: '1px solid var(--border, #404060)',
      borderRadius: '4px',
    },
    '.cm-tooltip-lint': {
      backgroundColor: 'var(--bg-tertiary, #353550)',
    },
    '.cm-diagnostic-error': {
      color: '#f87171',
      borderLeft: '3px solid #f87171',
      paddingLeft: '8px',
      margin: '4px 0',
    },
  },
  { dark: true },
);

/**
 * Syntax highlighting colors for JSON
 */
const jsonHighlightStyle = syntaxHighlighting(
  defaultHighlightStyle,
);

type ValidStatus = {
  valid: boolean;
  error?: string;
};

/**
 * Config Web Component with CodeMirror JSON editor
 */
const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      overflow: hidden;
    }
    .status-icon {
      width: 16px;
      height: 16px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: bold;
    }

    .status-icon.valid::before {
      content: "✓";
      color: #22c55e; /* green */
    }

    .status-icon.invalid::before {
      content: "✕";
      color: #ef4444; /* red */
    }

  </style>
  <div class="content">
    <div class="editor-container" id="editor-container"></div>
  </div>
  <div class="footer">
    <div class="status">
      <span class="status-icon valid" id="config-status-icon"></span>
      <span class="status-text" id="config-status-text">Valid JSON</span>
    </div>
  </div>
`;

export class ConfigElement extends CardcreatorHTMLComponent {
  private _content: string = '';

  private shadow: ShadowRoot;
  private container!: HTMLElement;
  private editorView!: EditorView;
  private statusIcon!: HTMLElement;
  private statusText!: HTMLElement;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    this.shadow.appendChild(
      template.content.cloneNode(true),
    );
    this.container = this.shadow.getElementById(
      'editor-container',
    )!;
    this.statusIcon = this.shadow.getElementById(
      'config-status-icon',
    )!;
    this.statusText = this.shadow.getElementById(
      'config-status-text',
    )!;
  }

  /**
   * Init method, called after the library is registered.
   */
  init(): void {
    this.initEditor();

    // Register hooks.
    console.debug(
      `Registering hook for updating editor view on config changes...`,
    );
    this.library.events.on('configChanged', (_) => {
      const text = this._prettify(
        this.library.config.config(),
      );

      console.debug(
        'Setting content on editor:',
        text,
        this.editorView,
      );

      this.editorView.dispatch({
        changes: {
          from: 0,
          to: this.editorView.state.doc.length,
          insert: text,
        },
      });
    });
  }

  /**
   * Returns the current content of the config editor.
   * @returns The current content.
   */
  public content() {
    return this._content;
  }

  /**
   * Initialize CodeMirror editor
   */
  private initEditor(): void {
    const updateListener = EditorView.updateListener.of(
      (update) => {
        if (update.docChanged) {
          this.handleContentChange();
        }
      },
    );

    // Create linter that tracks errors
    const jsonLinter = linter((view): Diagnostic[] => {
      const content = view.state.doc.toString();
      const diagnostics: Diagnostic[] = [];

      if (content.trim() === '') {
        this.updateStatus({
          valid: true,
        });
        return [];
      }

      try {
        JSON.parse(content);
        this.updateStatus({ valid: true });
      } catch (e) {
        if (e instanceof SyntaxError) {
          const message = e.message;
          // Try to extract position from error message
          const posMatch = message.match(/position (\d+)/i);
          const pos = posMatch
            ? parseInt(posMatch[1], 10)
            : 0;

          diagnostics.push({
            from: Math.min(pos, content.length),
            to: Math.min(pos + 1, content.length),
            severity: 'error',
            message: message,
          });
          this.updateStatus({
            valid: false,
            error: message,
          });
        }
      }

      return diagnostics;
    });

    const state = EditorState.create({
      doc: '',
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        drawSelection(),
        bracketMatching(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        json(),
        jsonHighlightStyle,
        jsonLinter,
        lintGutter(),
        darkTheme,
        updateListener,
        EditorView.lineWrapping,
      ],
    });

    this.editorView = new EditorView({
      state,
      parent: this.container,
    });
  }

  /**
   * Handle content changes and emit events
   */
  private handleContentChange(): void {
    const content = this.editorView.state.doc.toString();
    console.debug('Content changed, new content:', content);

    if (content === this._content) {
      console.debug(
        'Content unchanged, no update is issued.',
      );
      return;
    }

    this.set(content);
  }

  /**
   * Update the status indicator in footer
   */
  private updateStatus(status: ValidStatus): void {
    this.statusIcon.classList.remove('valid', 'invalid');
    this.statusText.classList.remove('valid', 'invalid');

    this.statusIcon.classList.add(
      status.valid ? 'valid' : 'invalid',
    );
    this.statusText.classList.add(
      status.valid ? 'valid' : 'invalid',
    );

    this.statusText.textContent = status.valid
      ? 'Valid JSON'
      : `Invalid JSON${
          status.error ? `: ${status.error}` : ''
        }`;
  }

  /**
   * Get current editor content
   */
  get(): string {
    return this.editorView.state.doc.toString() ?? '';
  }

  /**
   * Sets the content of the config editor.
   * @param content The content to set.
   */
  public set(content: string): void {
    console.debug(`Setting content "${content}"...`);

    const valid = ConfigElement.isValid(content);
    console.debug('Content validity:', valid);

    this.updateStatus(valid);

    if (!valid.valid || content.trim().length === 0) {
      this._content = content;
      return;
    }

    if (content.trim().length === 0) {
      this._content = content;
      return;
    }

    const object: any = JSON.parse(content);
    this._content = this._prettify(object);

    console.debug(`Pushing config to library:`, object);
    this.library.config.reset(object);
  }

  private _prettify = (object: any): string => {
    return JSON.stringify(object, null, 2);
  };

  /**
   * Check if current content is valid JSON
   */
  private static isValid(content: string): ValidStatus {
    if (content.trim().length === 0) {
      return { valid: true };
    }

    try {
      const object = JSON.parse(content);
      if (typeof object !== 'object') {
        return { valid: false, error: 'Not a JSON object' };
      }

      return { valid: true };
    } catch (e) {
      return {
        valid: false,
        error:
          e instanceof SyntaxError ? e.message : undefined,
      };
    }
  }

  /**
   * Cleanup on disconnect
   */
  disconnectedCallback(): void {
    this.editorView.destroy();
  }
}

customElements.define('cc-config', ConfigElement);
