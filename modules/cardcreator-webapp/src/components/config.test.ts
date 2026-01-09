/// <reference lib="dom" />

import {
  describe,
  test,
  expect,
  beforeEach,
  beforeAll,
  afterAll,
} from 'bun:test';
import './config';
import { CardCreatorLibrary } from 'cardcreator-library';
import { CardcreatorHTMLComponent } from './cardcreator-component';
import { ConfigElement } from './config';

describe('ConfigElement', () => {
  let raw: ConfigElement;
  let element: ShadowRoot;
  let library: CardCreatorLibrary;

  const _orig = CSSStyleSheet.prototype.insertRule;
  const _debug = console.debug;

  beforeAll(() => {
    // Monkey-patch CSS issue.
    console.debug = () => {};

    CSSStyleSheet.prototype.insertRule = function (
      rule: string,
      index?: number,
    ) {
      try {
        return _orig.call(this, rule, index);
      } catch {
        // ignore unsupported CSS in happy-dom
        return 0;
      }
    };

    // Set up filler for library dependency.
    window.addEventListener(
      CardcreatorHTMLComponent.REQUEST_LIB,
      (event: Event) => {
        const customEvent = event as CustomEvent;
        customEvent.detail.provide(library);
      },
    );
  });

  afterAll(() => {
    // Restore monkey-patch.
    CSSStyleSheet.prototype.insertRule = _orig;
    console.debug = _debug;
  });

  beforeEach(async () => {
    library = new CardCreatorLibrary(
      {
        fileProvider: {
          load: async (_) => new Uint8Array(),
          save: async (_, __) => {},
        },
        renderer: {
          render: async () => new Uint8Array(),
          supports: (_) => true,
          parallelity: () => 1,
        },
      },
      {
        logger: console,
      },
    );

    // Set up document and provide library.
    document.body.innerHTML = '<cc-config></cc-config>';
    raw = document.querySelector(
      'cc-config',
    ) as ConfigElement;
    raw.provide(library);

    element =
      document.querySelector('cc-config')!.shadowRoot!;
  });

  test('is empty initially', () => {
    // GIVEN / THEN
    expect(raw.content()).toBeDefined();
    expect(raw.content()).toEqual('');
  });

  test('when a non-JSON is passed, the error label is shown', () => {
    // GIVEN
    const invalidJson = '{ invalid json }';

    // WHEN
    raw.set(invalidJson);

    // THEN
    const status = element.getElementById(
      'config-status-text',
    )!;
    expect(status.textContent).toMatch(/invalid/i);
    expect(Array.from(status.classList)).toContain(
      'invalid',
    );
  });

  test('when a valid JSON is passed, no error is shown.', () => {
    // GIVEN
    const validJson = '{ "valid": true }';

    // WHEN
    raw.set(validJson);

    // THEN
    const status = element.getElementById(
      'config-status-text',
    )!;
    expect(status.textContent).toMatch(/valid/i);
    expect(Array.from(status.classList)).toContain('valid');
  });

  test('when a valid JSON is passed, it is formatted correctly.', () => {
    // GIVEN
    const validJson = '{ "valid":true }';
    const expectedFormattedJson = `{
  "valid": true
}`;

    // WHEN
    raw.set(validJson);

    // THEN
    expect(raw.content()).toBe(expectedFormattedJson);
  });

  test('when a pure linebreak JSON is passed, no error is shown.', () => {
    // GIVEN
    const validJson = '\n\n\n\n';

    // WHEN
    raw.set(validJson);

    // THEN
    const status = element.getElementById(
      'config-status-text',
    )!;
    expect(status.textContent).toMatch(/valid/i);
    expect(Array.from(status.classList)).toContain('valid');
  });

  test.todo(
    'when entering content in the texteditor, the content state of the component is updated.',
    () => {
      /*
      // GIVEN
      const editor = element.querySelector(
        '.cm-content',
      ) as HTMLElement;
      editor.focus();

      // WHEN
      editor.dispatchEvent(
        new InputEvent('input', {
          bubbles: true,
          inputType: 'insertText',
          data: 'abc 123',
        }),
      );

      // THEN
      expect(raw.content()).toBe('abc 123');
      */
    },
  );

  test('when entering no text, the status shows as valid.', () => {
    // GIVEN / WHEN
    raw.set('');

    // THEN
    const status = element.getElementById(
      'config-status-text',
    )!;
    expect(status.textContent).toMatch(/valid/i);
    expect(Array.from(status.classList)).toContain('valid');
  });

  test.todo(
    'when a valid JSON is entered, the caret stays in place.',
    () => {
      /*
    // GIVEN
    const initialJson = '{ "valid":true }';
    raw.set(initialJson);

    const editor = element.querySelector(
      '.cm-content',
    ) as HTMLElement;
    editor.focus();
    const selection = window.getSelection()!;
    const range = document.createRange();
    range.setStart(editor.firstChild!, 10);
    range.setEnd(editor.firstChild!, 10);
    selection.removeAllRanges();
    selection.addRange(range);

    // WHEN
    const newJson = '{ "valid": false }';
    raw.set(newJson);

    // THEN
    const newSelection = window.getSelection()!;
    expect(newSelection.rangeCount).toBe(1);
    const newRange = newSelection.getRangeAt(0);
    expect(newRange.startOffset).toBe(10);
    expect(newRange.endOffset).toBe(10);
    */
    },
  );

  test('when the config is to a valid JSON set, the library config is updated.', () => {
    // GIVEN
    const validJson = '{ "valid": true }';

    // WHEN
    raw.set(validJson);

    // THEN
    expect(library.config.config()).toEqual({
      valid: true,
    });
  });

  test('when the config is set to a non-JSON, the library config is not updated.', () => {
    // GIVEN
    const invalidJson = '{ invalid json }';

    // WHEN
    raw.set(invalidJson);

    // THEN
    expect(library.config.config()).toEqual({});
  });
});
