/// <reference lib="dom" />
import {
  describe,
  test,
  expect,
  beforeEach,
  mock,
  beforeAll,
} from 'bun:test';
import './card-table';
import { CardTableElement } from './card-table';
import { nextTick } from '../test-utils';
import { PreviewElement } from './preview';
import { CardCreatorLibrary } from 'cardcreator-library';
import { CardcreatorHTMLComponent } from './cardcreator-component';

describe('CardTableElement', () => {
  let element: ShadowRoot;
  let library: CardCreatorLibrary;

  beforeAll(() => {
    // Set up filler for library dependency.
    window.addEventListener(
      CardcreatorHTMLComponent.REQUEST_LIB,
      (event: Event) => {
        const customEvent = event as CustomEvent;
        customEvent.detail.provide(library);
      },
    );
  });

  beforeEach(() => {
    library = new CardCreatorLibrary({
      fileProvider: {
        load: async (_) => new Uint8Array(),
        save: async (_, __) => {},
      },
      renderer: {
        render: async () => new Uint8Array(),
        supports: (_) => true,
        parallelity: () => 1,
      },
    });

    // Set up document and provide library.
    document.body.innerHTML =
      '<cc-card-table></cc-card-table>';
    (
      document.querySelector(
        'cc-card-table',
      ) as CardTableElement
    ).provide(library);

    element =
      document.querySelector('cc-card-table')!.shadowRoot!;
  });

  test('renders empty state initially', () => {
    // THEN
    expect(
      element.querySelectorAll('tbody tr').length,
    ).toBe(0);
    expect(
      element.querySelector('#card-table-card-count')!
        .textContent,
    ).toEqual('No cards loaded.');
  });

  test('renders cards and columns correctly from event', async () => {
    // GIVEN / WHEN
    library.project.loadCards([
      { name: 'Fireball', cost: 3, type: 'Spell' },
      { name: 'Ice Bolt', cost: 2, type: 'Spell' },
    ]);
    await nextTick();

    // THEN
    // Headers are loaded.
    expect(
      Array.from(element.querySelectorAll('thead th')).map(
        (c) => c.textContent,
      ),
    ).toContainValues(['name', 'cost', 'type']);

    // Cards are loaded.
    expect(
      element.querySelectorAll('tbody tr'),
    ).toHaveLength(2);
    expect(
      element.querySelectorAll('tbody tr')[0].textContent,
    ).toContain('Fireball');
    expect(
      element.querySelectorAll('tbody tr')[1].textContent,
    ).toContain('Ice Bolt');
  });

  test.todo('renders nested card objects correctly.');

  test('clicking row selects card and highlights it', async () => {
    window.dispatchEvent(
      new CustomEvent('cc:cards-loaded', {
        detail: [{ id: 'card-1', name: 'Test Card' }],
      }),
    );
    await nextTick();

    element.clickRow(0);
    await nextTick();

    expect(element.getSelectedId()).toBe('card-1');
    expect(
      element.getTbody().querySelector('.selected'),
    ).not.toBeNull();
  });

  test('clicking row dispatches cc:card-selected event', async () => {
    let receivedEvent: CustomEvent | null = null;
    window.addEventListener('cc:card-selected', ((
      e: CustomEvent,
    ) => {
      receivedEvent = e;
    }) as EventListener);

    window.dispatchEvent(
      new CustomEvent('cc:cards-loaded', {
        detail: [{ id: 'card-xyz', name: 'Magic Card' }],
      }),
    );
    await nextTick();

    element.clickRow(0);
    await nextTick();

    expect(receivedEvent).not.toBeNull();
    expect(receivedEvent!.detail.cardId).toBe('card-xyz');
    expect(receivedEvent!.detail.card.name).toBe(
      'Magic Card',
    );
  });

  test('generates ids for cards without id', async () => {
    window.dispatchEvent(
      new CustomEvent('cc:cards-loaded', {
        detail: [{ name: 'No ID Card' }],
      }),
    );
    await nextTick();

    expect(element.getCards()[0].id).toBe('card-0');
  });

  test('limits displayed columns to 6', async () => {
    window.dispatchEvent(
      new CustomEvent('cc:cards-loaded', {
        detail: [
          {
            col1: 'a',
            col2: 'b',
            col3: 'c',
            col4: 'd',
            col5: 'e',
            col6: 'f',
            col7: 'g',
            col8: 'h',
          },
        ],
      }),
    );
    await nextTick();

    const headerCells =
      element.shadowRoot!.querySelectorAll('th');
    expect(headerCells.length).toBe(6);
  });

  test('(integration) clicking card in table with auto-preview triggers preview', async () => {
    // GIVEN
    const mockRender = mock(() => {});
    (window as any).cardCreatorLibrary = {
      preview: { render: mockRender },
    };

    // Clear body and add both components fresh
    document.body.innerHTML =
      '<cc-card-table></cc-card-table><cc-preview></cc-preview>';
    element = document.querySelector(
      'cc-card-table',
    ) as CardTableElement;
    await nextTick();

    window.dispatchEvent(
      new CustomEvent('cc:cards-loaded', {
        detail: [{ id: 'integration-card', name: 'Test' }],
      }),
    );
    await nextTick();

    // WHEN
    element.clickRow(0);
    await nextTick();

    // THEN
    expect(mockRender).toHaveBeenCalledWith(
      'integration-card',
    );
  });

  test('clicking card with auto-preview disabled does not call preview', async () => {
    // GIVEN
    const mockRender = mock(() => {});
    (window as any).cardCreatorLibrary = {
      preview: { render: mockRender },
    };

    // Clear body and add both components fresh
    document.body.innerHTML =
      '<cc-card-table></cc-card-table><cc-preview></cc-preview>';
    element = document.querySelector(
      'cc-card-table',
    ) as CardTableElement;
    const preview = document.querySelector(
      'cc-preview',
    ) as PreviewElement;
    await nextTick();

    // WHEN
    (
      preview.querySelector(
        'auto-preview',
      )! as HTMLInputElement
    ).checked = false;

    window.dispatchEvent(
      new CustomEvent('cc:cards-loaded', {
        detail: [{ id: 'no-preview-card', name: 'Test' }],
      }),
    );
    await nextTick();

    (
      element.querySelector('tbody tr')! as HTMLElement
    ).click();
    await nextTick();

    // THEN
    expect(
      element
        .querySelector('tbody tr')!
        .classList.contains('selected'),
    ).toBe(true);
    expect(mockRender).not.toHaveBeenCalled();
  });
});
