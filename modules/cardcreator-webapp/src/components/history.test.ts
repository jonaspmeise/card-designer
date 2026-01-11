/// <reference lib="dom" />

import {
  describe,
  test,
  expect,
  beforeEach,
  beforeAll,
} from 'bun:test';
import './history';
import { CardCreatorLibrary } from 'cardcreator-library';
import { HistoryElement } from './history';

describe('HistoryElement', () => {
  let raw: HistoryElement;
  let element: ShadowRoot;
  let library: CardCreatorLibrary;

  beforeAll(() => {
    console.debug = () => {};
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

    library.events.clear();
    library.project.reset(true);

    // Set up document and provide library.
    document.body.innerHTML = '<cc-history></cc-history>';
    raw = document.querySelector(
      'cc-history',
    ) as HistoryElement;

    element = raw.shadowRoot!;
  });

  test('is empty initially', () => {
    // GIVEN
    const list = element.querySelectorAll('li')!;

    // THEN
    expect(list.length).toBe(0);
  });

  test('when an command is executed, an entry is added to the history', () => {
    // GIVEN / WHEN
    // This issues a command.
    library.config.reset({
      value: 123,
    });

    // THEN
    const list = element.querySelectorAll('li')!;
    expect(list.length).toBe(1);
    const entry = list[0];

    expect(entry.textContent).toMatch(/config reset/i);
  });
});
