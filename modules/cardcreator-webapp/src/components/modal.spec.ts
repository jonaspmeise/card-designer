/// <reference lib="dom" />

import {
  describe,
  test,
  expect,
  beforeEach,
} from 'bun:test';
import { CardCreatorLibrary } from 'cardcreator-library';
import { CardcreatorHTMLComponent } from '../cardcreator-component';
import { idle, timeout } from '../test-utils';

/**
 * Minimal test component to exercise the modal functionality.
 * Exposes protected modal methods for testing.
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

  /**
   * Public wrapper to test showModal.
   */
  public testShowModal(
    title: string,
    message: string,
    level: 'info' | 'warning' | 'error' | 'question',
    buttons: Array<{
      label: string;
      callback: () => void;
      style?: 'primary' | 'secondary' | 'danger';
    }>,
    forced = false,
  ): void {
    this.showModal({
      title,
      message,
      level,
      buttons,
      forced,
    });
  }

  /**
   * Public wrapper to test closeModal.
   */
  public testCloseModal(): void {
    this.closeModal();
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

  test('showModal opens the modal', () => {
    // GIVEN / WHEN
    component.testShowModal(
      'Test Title',
      'Test Message',
      'info',
      [
        {
          label: 'OK',
          callback: () => {},
          style: 'primary',
        },
      ],
    );

    // THEN
    const backdrop = shadow.querySelector(
      '[data-modal-open="true"]',
    );
    expect(backdrop).not.toBeNull();
  });

  test('showModal sets title correctly', () => {
    // GIVEN / WHEN
    component.testShowModal(
      'Custom Title',
      'Test Message',
      'info',
      [{ label: 'OK', callback: () => {} }],
    );

    // THEN
    const title = shadow.getElementById('modal-title');
    expect(title?.textContent).toBe('Custom Title');
  });

  test('showModal sets message correctly', () => {
    // GIVEN / WHEN
    component.testShowModal(
      'Title',
      'Custom Message Content',
      'info',
      [{ label: 'OK', callback: () => {} }],
    );

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
    'showModal with level "%s" shows icon "%s"',
    (level, expectedIcon) => {
      // GIVEN / WHEN
      component.testShowModal('Title', 'Message', level, [
        { label: 'OK', callback: () => {} },
      ]);

      // THEN
      const icon = shadow.getElementById('modal-icon');
      expect(icon?.textContent).toBe(expectedIcon);
    },
  );

  test('buttons are created properly', () => {
    // GIVEN / WHEN
    component.testShowModal(
      'Title',
      'Message',
      'question',
      [
        {
          label: 'Cancel',
          callback: () => {},
          style: 'secondary',
        },
        {
          label: 'Confirm',
          callback: () => {},
          style: 'primary',
        },
      ],
    );

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

  test('clicking a button triggers its callback', (done) => {
    // GIVEN / THEN
    component.testShowModal('Title', 'Message', 'info', [
      {
        label: 'Action',
        callback: () => {
          done();
        },
      },
    ]);

    // WHEN
    const button = shadow.querySelector(
      '[data-modal-button="Action"]',
    ) as HTMLButtonElement;
    button.click();

    timeout(done);
  });

  test('clicking a button closes the modal', async () => {
    // GIVEN
    component.testShowModal('Title', 'Message', 'info', [
      { label: 'Close Me', callback: () => {} },
    ]);

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

  test('non-forced modal can be closed via closeModal()', async () => {
    // GIVEN
    component.testShowModal(
      'Title',
      'Message',
      'info',
      [{ label: 'OK', callback: () => {} }],
      false, // not forced
    );

    expect(
      shadow.querySelector('[data-modal-open="true"]'),
    ).not.toBeNull();

    // WHEN
    component.testCloseModal();

    await idle();

    // THEN
    expect(
      shadow.querySelector('[data-modal-open="true"]'),
    ).toBeNull();
  });

  test('forced modal cannot be closed via closeModal()', async () => {
    // GIVEN
    component.testShowModal(
      'Title',
      'Message',
      'error',
      [{ label: 'OK', callback: () => {} }],
      true, // forced!
    );

    expect(
      shadow.querySelector('[data-modal-open="true"]'),
    ).not.toBeNull();

    // WHEN
    component.testCloseModal();

    await idle();

    // THEN - still open
    expect(
      shadow.querySelector('[data-modal-open="true"]'),
    ).not.toBeNull();
  });

  test('forced modal hides the close button', () => {
    // GIVEN / WHEN
    component.testShowModal(
      'Title',
      'Message',
      'error',
      [{ label: 'OK', callback: () => {} }],
      true, // forced
    );

    // THEN
    const closeButton = shadow.getElementById(
      'modal-close-button',
    ) as HTMLButtonElement;
    expect(closeButton.style.display).toBe('none');
  });

  test('non-forced modal shows the close button', () => {
    // GIVEN / WHEN
    component.testShowModal(
      'Title',
      'Message',
      'info',
      [{ label: 'OK', callback: () => {} }],
      false,
    );

    // THEN
    const closeButton = shadow.getElementById(
      'modal-close-button',
    ) as HTMLButtonElement;
    expect(closeButton.style.display).toBe('');
  });

  test('non-forced modal closes when clicking the close button', async () => {
    // GIVEN
    component.testShowModal(
      'Title',
      'Message',
      'info',
      [{ label: 'OK', callback: () => {} }],
      false,
    );

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
    component.testShowModal(
      'Title',
      'Message',
      'error',
      [{ label: 'OK', callback: () => {} }],
      true, // forced
    );

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
    component.testShowModal(
      'Title',
      'Message',
      'info',
      [{ label: 'OK', callback: () => {} }],
      false,
    );

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
    component.testShowModal(
      'Title',
      'Message',
      'error',
      [{ label: 'OK', callback: () => {} }],
      true, // forced
    );

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

  test('multiple buttons render in correct order', () => {
    // GIVEN / WHEN
    component.testShowModal(
      'Title',
      'Message',
      'question',
      [
        { label: 'First', callback: () => {} },
        { label: 'Second', callback: () => {} },
        { label: 'Third', callback: () => {} },
      ],
    );

    // THEN
    const footer = shadow.getElementById('modal-footer');
    const buttons = footer?.querySelectorAll('button');
    expect(buttons?.length).toBe(3);
    expect(buttons?.[0].textContent).toBe('First');
    expect(buttons?.[1].textContent).toBe('Second');
    expect(buttons?.[2].textContent).toBe('Third');
  });

  test('button styles are applied correctly', () => {
    // GIVEN / WHEN
    component.testShowModal(
      'Title',
      'Message',
      'question',
      [
        {
          label: 'Primary',
          callback: () => {},
          style: 'primary',
        },
        {
          label: 'Secondary',
          callback: () => {},
          style: 'secondary',
        },
        {
          label: 'Danger',
          callback: () => {},
          style: 'danger',
        },
      ],
    );

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
    component.testShowModal(
      'First',
      'First message',
      'info',
      [
        { label: 'A', callback: () => {} },
        { label: 'B', callback: () => {} },
        { label: 'C', callback: () => {} },
      ],
    );

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
    component.testShowModal(
      'Second',
      'Second message',
      'info',
      [{ label: 'Only', callback: () => {} }],
    );

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
