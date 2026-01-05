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
import { nextTick, timeout } from '../test-utils';
import { PreviewElement } from './preview';
import { CardCreatorLibrary } from 'cardcreator-library';
import { CardcreatorHTMLComponent } from './cardcreator-component';
import { Card } from 'cardcreator-library/render/render-types';

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

    const firstRow =
      element.querySelectorAll('tbody tr')[0];
    expect(firstRow.textContent).toContain('Fireball');
    expect(firstRow.textContent).toContain('3');
    expect(firstRow.textContent).toContain('Spell');

    const secondRow =
      element.querySelectorAll('tbody tr')[1];
    expect(secondRow.textContent).toContain('Ice Bolt');
    expect(secondRow.textContent).toContain('2');
    expect(secondRow.textContent).toContain('Spell');
  });

  test('renders nested card objects correctly.', () => {
    // GIVEN / WHEN
    library.project.loadCards([
      {
        name: 'Fireball',
        cost: 3,
        type: 'Spell',
        details: { damage: 5 },
      },
      {
        name: 'Ice Bolt',
        cost: 2,
        type: 'Spell',
        subtypes: ['frost', 'magic'],
      },
    ]);

    // THEN
    // Headers are loaded.
    expect(
      Array.from(element.querySelectorAll('thead th')).map(
        (c) => c.textContent,
      ),
    ).toContainValues([
      'name',
      'cost',
      'type',
      'subtypes',
      'details',
    ]);

    // Cards are loaded.
    expect(
      element.querySelectorAll('tbody tr'),
    ).toHaveLength(2);

    const firstRowContent = element
      .querySelectorAll('tbody tr')[0]
      .textContent.replaceAll(/\s/g, '');
    expect(firstRowContent).toContain('Fireball');
    expect(firstRowContent).toContain('3');
    expect(firstRowContent).toContain('Spell');
    expect(firstRowContent).toContain('{"damage":5}');

    const secondRowContent = element
      .querySelectorAll('tbody tr')[1]
      .textContent.replaceAll(/\s/g, '');
    expect(secondRowContent).toContain('IceBolt');
    expect(secondRowContent).toContain('2');
    expect(secondRowContent).toContain('Spell');
    expect(secondRowContent).toContain('["frost","magic"]');
  });
  // TODO: Somewhere you should be able to send logs to the console for each card render (like "$info('___')" ...?)

  test('clicking row selects card and highlights it', async () => {
    // GIVEN
    library.project.loadCards([
      {
        name: 'Fireball',
        cost: 3,
        type: 'Spell',
        details: { damage: 5 },
      },
      {
        name: 'Ice Bolt',
        cost: 2,
        type: 'Spell',
        subtypes: ['frost', 'magic'],
      },
    ]);

    // WHEN
    (
      element.querySelectorAll('tbody tr')[0] as HTMLElement
    ).click();

    // THEN
    expect(
      element.querySelectorAll('.selected'),
    ).toHaveLength(1);
    expect(
      element.querySelectorAll('tbody tr')[0]!.classList,
    ).toContain('selected');
  });

  test('clicking a row issues a preview', (done) => {
    // THEN
    library.events.on('previewRenderStarted', (event) => {
      expect(event.data.card).toEqual({
        name: 'Fireball',
        cost: 3,
        type: 'Spell',
      });
      done();
    });

    // GIVEN
    library.project.loadCards([
      {
        name: 'Fireball',
        cost: 3,
        type: 'Spell',
      },
    ]);

    // WHEN
    (
      element.querySelectorAll('tbody tr')[0] as HTMLElement
    ).click();

    // THEN
    expect(
      element.querySelectorAll('.selected'),
    ).toHaveLength(1);
    expect(
      element.querySelectorAll('tbody tr')[0]!.classList,
    ).toContain('selected');

    timeout(done);
  });

  test('clicking card in table with auto-preview disabled triggers preview', (done) => {
    // THEN
    library.events.on('previewRenderStarted', (_) => {
      throw new Error('Should not be called!');
    });

    // GIVEN
    // Disable auto-preview.
    (
      element.querySelector(
        '#auto-preview-toggle',
      )! as HTMLInputElement
    ).checked = false;
    library.project.loadCards([
      {
        name: 'Fireball',
        cost: 3,
        type: 'Spell',
      },
    ]);

    // WHEN
    (
      element.querySelectorAll('tbody tr')[0] as HTMLElement
    ).click();
    // THEN
    // We expect no preview to be triggered.
    library.events.clear();

    // Second: Enable auto-preview again.
    (
      element.querySelector(
        '#auto-preview-toggle',
      )! as HTMLInputElement
    ).checked = true;
    library.events.on('previewRenderStarted', (event) => {
      expect(event.data.card).toEqual({
        name: 'Fireball',
        cost: 3,
        type: 'Spell',
      });
      done();
    });

    // WHEN
    (
      element.querySelectorAll('tbody tr')[0] as HTMLElement
    ).click();

    timeout(done);
  });

  test('when auto-preview is disabled, a render call is issued by clicking the render button', (done) => {
    // GIVEN
    // Loads cards.
    library.project.loadCards([
      {
        name: 'Fireball',
        cost: 3,
        type: 'Spell',
      },
    ]);

    // Disable auto-preview.
    (
      element.querySelector(
        '#auto-preview-toggle',
      )! as HTMLInputElement
    ).checked = false;

    // Select card.
    (
      element.querySelectorAll('tbody tr')[0] as HTMLElement
    ).click();

    // WHEN
    // THEN
    library.events.on('previewRenderStarted', (event) => {
      expect(event.data.card).toEqual({
        name: 'Fireball',
        cost: 3,
        type: 'Spell',
      });
      done();
    });

    const renderButton = element.getElementById(
      'render-preview-button',
    )! as HTMLButtonElement;

    expect(renderButton.disabled).toBe(false);
    renderButton.click();

    timeout(done);
  });

  test('when no card is loaded, the render button can not be clicked.', () => {
    // GIVEN / WHEN
    const renderButton = element.getElementById(
      'render-preview-button',
    ) as HTMLButtonElement;

    // THEN
    expect(renderButton.disabled).toBe(true);
  });
});
