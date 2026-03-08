/// <reference lib="dom" />

import {
  describe,
  test,
  expect,
  beforeEach,
  beforeAll,
} from 'bun:test';
import { CardCreatorLibrary } from 'cardcreator-library';
import { CardcreatorHTMLComponent } from '../cardcreator-component';
import { idle, timeout } from '../test-utils';
import type { DialogChoice } from './modal';

/**
 * Minimal test component to exercise the modal functionality.
 * The modal now responds to dialogOpened events from the library.
 */
class ModalTestComponent extends CardcreatorHTMLComponent {
  constructor() {
    super();
  }

  protected init(): void {
    // No-op for test component.
  }

  protected template(): HTMLTemplateElement {
    const template = document.createElement('template');
    template.innerHTML = `<div id="test-content">Test Component</div>`;
    return template;
  }
}

// Register test component.
if (!customElements.get('cc-modal-test')) {
  customElements.define(
    'cc-modal-test',
    ModalTestComponent,
  );
}

describe('Modal', () => {
  let component: ModalTestComponent;
  let shadow: ShadowRoot;
  let library: CardCreatorLibrary;

  /**
   * Helper to show a modal via library.showDialog().
   * @returns Promise that resolves to the choice label or null if dismissed.
   */
  const showModal = (
    title: string,
    message: string,
    level: 'info' | 'warning' | 'error' | 'question',
    choices: DialogChoice[],
    forced = false,
  ): void => {
    library.showDialog({
      title,
      message,
      level,
      choices,
      forced,
    });
  };

  beforeEach(() => {
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

    document.body.innerHTML =
      '<cc-modal-test></cc-modal-test>';
    component = document.querySelector(
      'cc-modal-test',
    ) as ModalTestComponent;

    component.provide(library);
    shadow = component.shadowRoot!;
  });

  test('modal is initially closed', () => {
    // GIVEN / THEN
    const backdrop = shadow.querySelector(
      '[data-modal-open="true"]',
    );
    expect(backdrop).toBeNull();
  });

  test('modal backdrop has data-modal-open="false" initially', () => {
    // GIVEN / THEN
    const backdrop = shadow.querySelector(
      '[data-modal-open="false"]',
    );
    expect(backdrop).not.toBeNull();
  });

  test('showDialog opens the modal', async () => {
    // GIVEN / WHEN
    showModal('Test Title', 'Test Message', 'info', [
      { label: 'OK', style: 'primary' },
    ]);

    await idle();

    // THEN
    const backdrop = shadow.querySelector(
      '[data-modal-open="true"]',
    );
    expect(backdrop).not.toBeNull();
  });

  test('showDialog sets title correctly', async () => {
    // GIVEN / WHEN
    showModal('Custom Title', 'Test Message', 'info', [
      { label: 'OK', style: 'primary' },
    ]);

    await idle();

    // THEN
    const title = shadow.getElementById('modal-title');
    expect(title?.textContent).toBe('Custom Title');
  });

  test('showDialog sets message correctly', async () => {
    // GIVEN / WHEN
    showModal('Title', 'Custom Message Content', 'info', [
      { label: 'OK', style: 'primary' },
    ]);

    await idle();

    // THEN
    const body = shadow.getElementById('modal-body');
    expect(body?.textContent).toBe(
      'Custom Message Content',
    );
  });

  test.each([
    ['info', 'ℹ️'],
    ['warning', '⚠️'],
    ['error', '❌'],
    ['question', '❓'],
  ] as const)(
    'showDialog with level "%s" shows icon "%s"',
    async (level, expectedIcon) => {
      // GIVEN / WHEN
      showModal('Title', 'Message', level, [
        { label: 'OK', style: 'primary' },
      ]);

      await idle();

      // THEN
      const icon = shadow.getElementById('modal-icon');
      expect(icon?.textContent).toBe(expectedIcon);
    },
  );

  test('buttons are created properly', async () => {
    // GIVEN / WHEN
    showModal('Title', 'Message', 'question', [
      { label: 'Cancel', style: 'secondary' },
      { label: 'Confirm', style: 'primary' },
    ]);

    await idle();

    // THEN
    const cancelBtn = shadow.querySelector(
      '[data-modal-button="Cancel"]',
    );
    const confirmBtn = shadow.querySelector(
      '[data-modal-button="Confirm"]',
    );
    expect(cancelBtn).not.toBeNull();
    expect(confirmBtn).not.toBeNull();
  });

  test('clicking a button closes the modal', async () => {
    // GIVEN
    showModal('Title', 'Message', 'info', [
      { label: 'Close Me', style: 'primary' },
    ]);

    await idle();

    expect(
      shadow.querySelector('[data-modal-open="true"]'),
    ).not.toBeNull();

    // WHEN
    const button = shadow.querySelector(
      '[data-modal-button="Close Me"]',
    ) as HTMLButtonElement;
    button.click();

    await idle();

    // THEN
    expect(
      shadow.querySelector('[data-modal-open="true"]'),
    ).toBeNull();
  });

  test('forced modal hides the close button', async () => {
    // GIVEN / WHEN
    showModal(
      'Title',
      'Message',
      'error',
      [{ label: 'OK', style: 'primary' }],
      true, // forced
    );

    await idle();

    // THEN
    const closeButton = shadow.getElementById(
      'modal-close-button',
    ) as HTMLButtonElement;
    expect(closeButton.style.display).toBe('none');
  });

  test('non-forced modal shows the close button', async () => {
    // GIVEN / WHEN
    showModal(
      'Title',
      'Message',
      'info',
      [{ label: 'OK', style: 'primary' }],
      false,
    );

    await idle();

    // THEN
    const closeButton = shadow.getElementById(
      'modal-close-button',
    ) as HTMLButtonElement;
    expect(closeButton.style.display).toBe('');
  });

  test('non-forced modal closes when clicking the close button', async () => {
    // GIVEN
    showModal(
      'Title',
      'Message',
      'info',
      [{ label: 'OK', style: 'primary' }],
      false,
    );

    await idle();

    expect(
      shadow.querySelector('[data-modal-open="true"]'),
    ).not.toBeNull();

    // WHEN
    const closeButton = shadow.getElementById(
      'modal-close-button',
    ) as HTMLButtonElement;
    closeButton.click();

    await idle();

    // THEN
    expect(
      shadow.querySelector('[data-modal-open="true"]'),
    ).toBeNull();
  });

  test('forced modal does not close when clicking the close button', async () => {
    // GIVEN
    showModal(
      'Title',
      'Message',
      'error',
      [{ label: 'OK', style: 'primary' }],
      true, // forced
    );

    await idle();

    expect(
      shadow.querySelector('[data-modal-open="true"]'),
    ).not.toBeNull();

    // WHEN
    const closeButton = shadow.getElementById(
      'modal-close-button',
    ) as HTMLButtonElement;
    closeButton.click();

    await idle();

    // THEN - still open
    expect(
      shadow.querySelector('[data-modal-open="true"]'),
    ).not.toBeNull();
  });

  test('non-forced modal closes when clicking the backdrop', async () => {
    // GIVEN
    showModal(
      'Title',
      'Message',
      'info',
      [{ label: 'OK', style: 'primary' }],
      false,
    );

    await idle();

    expect(
      shadow.querySelector('[data-modal-open="true"]'),
    ).not.toBeNull();

    // WHEN
    const backdrop = shadow.getElementById(
      'modal-backdrop',
    ) as HTMLDivElement;
    backdrop.click();

    await idle();

    // THEN
    expect(
      shadow.querySelector('[data-modal-open="true"]'),
    ).toBeNull();
  });

  test('forced modal does not close when clicking the backdrop', async () => {
    // GIVEN
    showModal(
      'Title',
      'Message',
      'error',
      [{ label: 'OK', style: 'primary' }],
      true, // forced
    );

    await idle();

    expect(
      shadow.querySelector('[data-modal-open="true"]'),
    ).not.toBeNull();

    // WHEN
    const backdrop = shadow.getElementById(
      'modal-backdrop',
    ) as HTMLDivElement;
    backdrop.click();

    await idle();

    // THEN - still open
    expect(
      shadow.querySelector('[data-modal-open="true"]'),
    ).not.toBeNull();
  });

  test('multiple buttons render in correct order', async () => {
    // GIVEN / WHEN
    showModal('Title', 'Message', 'question', [
      { label: 'First', style: 'secondary' },
      { label: 'Second', style: 'secondary' },
      { label: 'Third', style: 'primary' },
    ]);

    await idle();

    // THEN
    const footer = shadow.getElementById('modal-footer');
    const buttons = footer?.querySelectorAll('button');
    expect(buttons?.length).toBe(3);
    expect(buttons?.[0].textContent).toBe('First');
    expect(buttons?.[1].textContent).toBe('Second');
    expect(buttons?.[2].textContent).toBe('Third');
  });

  test('button styles are applied correctly', async () => {
    // GIVEN / WHEN
    showModal('Title', 'Message', 'question', [
      { label: 'Primary', style: 'primary' },
      { label: 'Secondary', style: 'secondary' },
      { label: 'Danger', style: 'danger' },
    ]);

    await idle();

    // THEN
    const primaryBtn = shadow.querySelector(
      '[data-modal-button="Primary"]',
    ) as HTMLButtonElement;
    const secondaryBtn = shadow.querySelector(
      '[data-modal-button="Secondary"]',
    ) as HTMLButtonElement;
    const dangerBtn = shadow.querySelector(
      '[data-modal-button="Danger"]',
    ) as HTMLButtonElement;

    expect(
      primaryBtn.classList.contains('modal-btn-primary'),
    ).toBe(true);
    expect(
      secondaryBtn.classList.contains(
        'modal-btn-secondary',
      ),
    ).toBe(true);
    expect(
      dangerBtn.classList.contains('modal-btn-danger'),
    ).toBe(true);
  });

  test('reopening modal clears previous buttons', async () => {
    // GIVEN - first modal with 3 buttons
    showModal('First', 'First message', 'info', [
      { label: 'A', style: 'secondary' },
      { label: 'B', style: 'secondary' },
      { label: 'C', style: 'primary' },
    ]);

    await idle();

    let footer = shadow.getElementById('modal-footer');
    expect(footer?.querySelectorAll('button').length).toBe(
      3,
    );

    // Close first modal
    const closeBtn = shadow.getElementById(
      'modal-close-button',
    ) as HTMLButtonElement;
    closeBtn.click();

    await idle();

    // WHEN - open second modal with 1 button
    showModal('Second', 'Second message', 'info', [
      { label: 'Only', style: 'primary' },
    ]);

    await idle();

    // THEN - only 1 button
    footer = shadow.getElementById('modal-footer');
    expect(footer?.querySelectorAll('button').length).toBe(
      1,
    );
    expect(
      shadow.querySelector('[data-modal-button="Only"]'),
    ).not.toBeNull();
    expect(
      shadow.querySelector('[data-modal-button="A"]'),
    ).toBeNull();
  });
});
