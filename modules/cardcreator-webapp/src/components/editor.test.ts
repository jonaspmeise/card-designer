/**
 * Editor Component Tests
 */
import {
  describe,
  test,
  expect,
  beforeEach,
} from 'bun:test';
import './editor';
import { EditorElement } from './editor';
import { nextTick } from '../test-utils';

describe('EditorElement', () => {
  let element: EditorElement;

  beforeEach(() => {
    document.body.innerHTML = '<cc-editor></cc-editor>';
    element = document.querySelector(
      'cc-editor',
    ) as EditorElement;
  });

  test('renders empty editor initially', () => {
    expect(element.getValue()).toBe('');
    expect(element.getLineNumbers().textContent).toBe('1');
  });

  test('loads template from event', async () => {
    window.dispatchEvent(
      new CustomEvent('cc:template-loaded', {
        detail: {
          filename: 'card.svg',
          content: '<svg>test</svg>',
        },
      }),
    );
    await nextTick();

    expect(element.getValue()).toBe('<svg>test</svg>');
    expect(
      element.shadowRoot!.getElementById('filename')!
        .textContent,
    ).toBe('card.svg');
  });

  test('highlights {{ }} expressions', async () => {
    element.setValue('<text>{{ name }}</text>');
    await nextTick();

    const highlight = element.getHighlight().innerHTML;
    expect(highlight).toContain('<span class="expr">');
    expect(highlight).toContain('{{ name }}');
  });

  test('escapes HTML in content', async () => {
    element.setValue('<tag attr="value">');
    await nextTick();

    const highlight = element.getHighlight().innerHTML;
    expect(highlight).toContain('&lt;tag');
    expect(highlight).not.toContain('<tag');
  });

  test('updates line numbers', async () => {
    element.setValue('line1\nline2\nline3');
    await nextTick();

    const lines = element.getLineNumbers().innerHTML;
    expect(lines).toContain('1');
    expect(lines).toContain('2');
    expect(lines).toContain('3');
  });

  test('tab key inserts spaces', async () => {
    const editor = element.getEditor();
    editor.focus();
    editor.value = 'test';
    editor.selectionStart = editor.selectionEnd = 4;

    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
    });
    editor.dispatchEvent(event);
    await nextTick();

    expect(element.getValue()).toBe('test  ');
  });

  test('responds to settings-changed for font size', async () => {
    window.dispatchEvent(
      new CustomEvent('cc:settings-changed', {
        detail: { fontSize: 16, lineNumbers: true },
      }),
    );
    await nextTick();

    expect(element.getEditor().style.fontSize).toBe('16px');
  });

  test('hides line numbers when disabled in settings', async () => {
    window.dispatchEvent(
      new CustomEvent('cc:settings-changed', {
        detail: { lineNumbers: false },
      }),
    );
    await nextTick();

    expect(element.getLineNumbers().style.display).toBe(
      'none',
    );
  });
});
