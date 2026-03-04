/// <reference lib="dom" />

import {
  describe,
  test,
  expect,
  beforeEach,
} from 'bun:test';
import './preview';
import { CardCreatorLibrary } from 'cardcreator-library';
import { PreviewElement } from './preview';
import { CardRenderer } from 'cardcreator-library/src/render/render-types';
import { BrowserRenderer } from '../lib/browser-renderer';
import { idle, timeout } from '../test-utils';

describe('PreviewElement', () => {
  let raw: PreviewElement;
  let element: ShadowRoot;
  let library: CardCreatorLibrary;
  let renderer: CardRenderer = new BrowserRenderer();

  beforeEach(async () => {
    library = new CardCreatorLibrary(
      {
        fileProvider: {
          load: async (_) => new Uint8Array(),
          save: async (_, __) => {},
        },
        renderer,
      },
      {
        logger: console,
      },
    );

    library.events.clear();
    library.project.reset(true);

    renderer.render = async (svg: string) =>
      new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    renderer.supports = (_) => true;
    renderer.parallelity = () => 1;

    // Set up document and provide library
    document.body.innerHTML = '<cc-preview></cc-preview>';
    raw = document.querySelector(
      'cc-preview',
    ) as PreviewElement;

    raw.provide(library);
    element = raw.shadowRoot!;
  });

  test('the image is initially empty', () => {
    // GIVEN / THEN
    const previewImage = element.getElementById(
      'preview-image',
    ) as HTMLImageElement;
    expect(previewImage.src).toBe('');

    expect(raw.image()).toBeNull();
  });

  test('initially shows empty state', () => {
    // GIVEN / THEN
    const container = element.getElementById('container')!;
    expect(container.textContent).toContain(
      'Select a card to preview',
    );
  });

  test('auto-preview checkbox is checked by default', () => {
    // GIVEN / THEN
    const checkbox = element.getElementById(
      'auto-preview',
    ) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  test('the refresh button is clickable as long as auto-preview is enabled', async () => {
    // GIVEN
    const checkbox = element.getElementById(
      'auto-preview',
    ) as HTMLInputElement;
    const refreshButton = element.getElementById(
      'refresh',
    ) as HTMLButtonElement;
    checkbox.checked = true;

    // THEN
    expect(refreshButton.disabled).toBe(true);

    // WHEN
    checkbox.click();

    // THEN
    expect(refreshButton.disabled).toBe(false);
  });

  test('if auto-preview is disabled, template change does not trigger a preview render.', () => {
    // GIVEN
    const checkbox = element.getElementById(
      'auto-preview',
    ) as HTMLInputElement;
    checkbox.click();

    // THEN
    renderer.render = async (_: string) => {
      throw new Error(
        'should not render because auto-preview is disabled!',
      );
    };

    // WHEN
    library.template.loadTemplate('<svg>test</svg>');
  });

  test('the help text disappears if something is previewed', async () => {
    // GIVEN
    const container = element.getElementById(
      'preview-help-text',
    )!;
    expect(container.hidden).toBe(false);

    // WHEN
    library.template.loadTemplate('<svg>test</svg>');

    await idle();

    // THEN
    expect(container.hidden).toBe(true);
  });

  test('when a card is previewed, it is loaded into the preview image.', async () => {
    // GIVEN
    // Initial image is empty.
    const previewImage = element.getElementById(
      'preview-image',
    ) as HTMLImageElement;
    expect(previewImage.src).toBe('');

    // WHEN
    library.render.preview({
      name: 'my dummy card',
    });

    library.template.loadTemplate(
      '<svg>{{ $card.name }}</svg>',
    );

    await idle();

    // THEN
    expect(previewImage.src).toContain('blob:');
  });

  test('when the refresh button is clicked, the preview is updated.', (done) => {
    // GIVEN
    const refreshButton = element.getElementById(
      'refresh',
    ) as HTMLButtonElement;
    refreshButton.disabled = false;

    // THEN
    renderer.render = async (svg: string) => {
      done();
      return new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    };

    // WHEN
    refreshButton.click();

    timeout(done);
  });

  test('a simple svg is correctly rendered.', async () => {
    // GIVEN / WHEN
    library.template.loadTemplate(
      `<svg height="3" width="3" xmlns="http://www.w3.org/2000/svg">
        <rect width="3" height="3" fill="red"/>
      </svg>`,
    );
    library.render.preview({});

    await idle();

    // THEN
    expect(raw.image()?.arrayBuffer()).resolves.toEqual(
      new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer,
    );
  });
});
