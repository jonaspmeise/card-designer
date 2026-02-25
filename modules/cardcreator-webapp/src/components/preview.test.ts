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
import { Card } from 'cardcreator-library/src/render/render-types';
import { timeout, idle } from '../test-utils';

describe('PreviewElement', () => {
  let raw: PreviewElement;
  let element: ShadowRoot;
  let library: CardCreatorLibrary;

  beforeEach(async () => {
    library = new CardCreatorLibrary(
      {
        fileProvider: {
          load: async (_) => new Uint8Array(),
          save: async (_, __) => {},
        },
        renderer: {
          render: async () =>
            new Uint8Array([0x89, 0x50, 0x4e, 0x47]), // PNG header
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

    // Set up document and provide library
    document.body.innerHTML = '<cc-preview></cc-preview>';
    raw = document.querySelector(
      'cc-preview',
    ) as PreviewElement;

    raw.provide(library);
    element = raw.shadowRoot!;
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
});
