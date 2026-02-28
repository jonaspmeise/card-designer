/// <reference lib="dom" />

import {
  describe,
  test,
  expect,
  beforeEach,
} from 'bun:test';
import './editor';
import { CardCreatorLibrary } from 'cardcreator-library';
import { EditorElement } from './editor';
import { timeout, idle } from '../test-utils';
import { RenderService } from 'cardcreator-library/render/render-service';
import { Card } from 'cardcreator-library/render/render-types';

describe('EditorElement', () => {
  let raw: EditorElement;
  let element: ShadowRoot;
  let library: CardCreatorLibrary;
  let editor: HTMLTextAreaElement;

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

    library.events.clear();
    library.project.reset(true);

    // Set up document and provide library.
    document.body.innerHTML = '<cc-editor></cc-editor>';
    raw = document.querySelector(
      'cc-editor',
    ) as EditorElement;

    raw.provide(library);
    element = raw.shadowRoot!;
    editor = element.getElementById(
      'editor',
    ) as HTMLTextAreaElement;
  });

  test('modifying the editor content triggers a library event', (done) => {
    // GIVEN
    const testContent = '<svg>my-custom-svg</svg>';

    // THEN
    library.events.on('templateLoaded', (event) => {
      expect(event.data.template).toBe(testContent);
      done();
    });

    // WHEN
    editor.value = testContent;
    editor.dispatchEvent(new Event('input'));

    timeout(done, 500);
  });

  test('modifying the template code triggers a preview event', (done) => {
    // GIVEN
    const testContent = '<svg>my-custom-svg</svg>';

    // THEN
    library.events.on('previewRenderStarted', (event) => {
      expect(event.data.card).toBeUndefined(); // No card is selected!
      done();
    });

    // WHEN
    editor.value = testContent;
    editor.dispatchEvent(new Event('input'));

    timeout(done, 100);
  });

  test.todo(
    'highlighting of code is applied correctly',
    async () => {
      // GIVEN
      const testContent =
        '<svg>\n  {{ $card.name }}\n  {{ $config.value }}\n</svg>';

      // WHEN
      editor.value = testContent;
      editor.dispatchEvent(new Event('input'));
      await idle();

      // THEN
      const highlight =
        element.getElementById('highlight')!;
      const highlightHTML = highlight.innerHTML;

      // Check that {{ }} expressions are wrapped in span with class "expr"
      expect(highlightHTML).toContain(
        '<span class="expr">',
      );
      expect(highlightHTML).toContain('{{ $card.name }}');
      expect(highlightHTML).toContain(
        '{{ $config.value }}',
      );

      // Check that the number of highlighted expressions matches
      const exprCount = (
        highlightHTML.match(/<span class="expr">/g) || []
      ).length;
      expect(exprCount).toBe(2);

      // Check that HTML is escaped properly
      expect(highlightHTML).toContain('&lt;svg&gt;');
      expect(highlightHTML).toContain('&lt;/svg&gt;');
    },
  );

  test.todo(
    'tab key inserts two spaces instead of changing focus',
    async () => {
      // GIVEN
      editor.value = 'line1';
      editor.selectionStart = 5;
      editor.selectionEnd = 5;

      // WHEN
      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      });
      editor.dispatchEvent(tabEvent);
      await idle();

      // THEN
      expect(editor.value).toBe('line1  ');
      expect(editor.selectionStart).toBe(7);
      expect(editor.selectionEnd).toBe(7);
    },
  );

  test('when library loads a template, editor content is updated', async () => {
    // GIVEN
    const templateSource = '<svg>awesome</svg>';

    // WHEN
    library.template.loadTemplate(templateSource);
    await idle();

    // THEN
    expect(editor.value).toBe(templateSource);
  });
});
