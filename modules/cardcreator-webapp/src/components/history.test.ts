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

    raw.provide(library);
    element = raw.shadowRoot!;
  });

  test('is empty initially', () => {
    // GIVEN
    const list = element.querySelectorAll('li')!;

    // THEN
    expect(list.length).toBe(0);
  });

  test('when a command is executed, an entry is added to the history', () => {
    // GIVEN / WHEN
    // This issues a command.
    library.config.reset({
      value: 123,
    });

    // THEN
    const list = element.querySelectorAll('li')!;
    expect(list.length).toBe(1);
    const entry = list[0];

    expect(entry.textContent).toMatch(/config modified/i);
  });

  test('when a command is executed, it can be undone via the UI', () => {
    // GIVEN / WHEN
    // This issues a command.
    library.config.reset({
      value: 123,
    });

    // WHEN
    // Clicking on the UI element to undo it.
    const undoButton: HTMLButtonElement = element
      .querySelectorAll('li')[0]
      .querySelector('.undo-button')!;

    undoButton.click();

    // THEN
    expect(library.config.config()).toEqual({});
  });

  test('when a command is executed and undone, it can be redone via the UI', () => {
    // GIVEN / WHEN
    // This issues a command.
    library.config.reset({
      value: 123,
    });

    // Click the undo button.
    const undoButton: HTMLButtonElement = element
      .querySelectorAll('li')[0]
      .querySelector('.undo-button')!;
    undoButton.click();

    // WHEN
    // Clicking on the UI element to redo it.
    const doButton: HTMLButtonElement = element
      .querySelectorAll('li')[0]
      .querySelector('.do-button')!;
    doButton.click();

    // THEN
    expect(library.config.config()).toEqual({
      value: 123,
    });
  });

  test('when the same command is executed multiple times, no additional entries are added to the history', () => {
    // GIVEN / WHEN
    // This issues a command.
    library.config.reset({
      value: 123,
    });

    for (let i = 0; i < 3; i++) {
      library.history.do(library.history.history()[0].id);
    }

    // THEN
    const list = element.querySelectorAll('li')!;
    expect(list.length).toBe(1);
  });

  test('when a command is undone, the UI is updated accordingly.', () => {
    // GIVEN
    library.config.reset({
      value: 123,
    });
    // The component should have "do" be disabled, "undo" enabled.
    const doButton: HTMLButtonElement = element
      .querySelectorAll('li')[0]
      .querySelector('.do-button')!;
    const undoButton: HTMLButtonElement = element
      .querySelectorAll('li')[0]
      .querySelector('.undo-button')!;

    expect(doButton.disabled).toBe(true);
    expect(undoButton.disabled).toBe(false);

    // WHEN
    // Undoing the command...
    undoButton.click();

    // THEN
    // The component should have "do" be enabled, "undo" disabled.
    expect(doButton.disabled).toBe(false);
    expect(undoButton.disabled).toBe(true);
  });
});
