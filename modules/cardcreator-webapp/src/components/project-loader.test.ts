/// <reference lib="dom" />

import {
  describe,
  test,
  expect,
  beforeEach,
} from 'bun:test';
import { CardCreatorLibrary } from 'cardcreator-library';
import { idle, timeout } from '../test-utils';

import './modal';
import './project-loader';
import { ProjectLoaderElement } from './project-loader';
import { ModalElement } from './modal';
import { ProjectData } from 'cardcreator-library/src/project/project-types';

/**
 * Helper to create an ArrayBuffer from a string.
 */
const toBuffer = (content: string): ArrayBuffer => {
  return new TextEncoder().encode(content)
    .buffer as ArrayBuffer;
};

describe('ProjectLoaderElement', () => {
  let raw: ProjectLoaderElement;
  let element: ShadowRoot;
  let library: CardCreatorLibrary;
  let modal: ModalElement;

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

    library.events.clear();
    library.project.reset(true);
    library.files.clear();

    // Set up document and provide library.
    document.body.innerHTML =
      '<cc-project-loader></cc-project-loader>';
    raw = document.querySelector(
      'cc-project-loader',
    ) as ProjectLoaderElement;

    raw.provide(library);
    element = raw.shadowRoot!;
    modal = element.querySelector(
      'cc-modal',
    ) as ModalElement;
  });

  test('component initializes with a modal element', () => {
    // GIVEN / THEN
    expect(modal).not.toBeNull();
    expect(modal).toBeInstanceOf(ModalElement);
  });

  test('modal is initially hidden', () => {
    // GIVEN / THEN
    expect(modal.isOpen()).toBe(false);
  });

  test('when a regular file is loaded, no modal is shown', async () => {
    // GIVEN
    const regularFileContent = 'just some text content';

    // WHEN
    library.files.loadFile({
      type: 'direct',
      path: 'some-file.txt',
      content: toBuffer(regularFileContent),
      size: regularFileContent.length,
    });

    await idle();

    // THEN
    expect(modal.isOpen()).toBe(false);
  });

  test.each([
    'myproject.cardcreator.json',
    'MYPROJECT.CARDCREATOR.JSON',
    'MyProject.CardCreator.json',
    'project.CARDCREATOR.JSON',
  ])(
    'when a %s file is loaded, the modal is shown',
    async (filename) => {
      // GIVEN
      const projectData: ProjectData = {
        name: 'Test Project',
        template: '<svg></svg>',
        _functions: new Map(),
      };
      const projectContent = JSON.stringify(projectData);

      // WHEN
      library.files.loadFile({
        type: 'direct',
        path: filename,
        content: toBuffer(projectContent),
        size: projectContent.length,
      });

      await idle();

      // THEN
      expect(modal.isOpen()).toBe(true);
    },
  );

  test('modal shows correct title and message for project file', async () => {
    // GIVEN
    const projectData: ProjectData = {
      name: 'Test Project',
      template: '<svg></svg>',
      _functions: new Map(),
    };
    const projectContent = JSON.stringify(projectData);

    // WHEN
    library.files.loadFile({
      type: 'direct',
      path: 'myproject.cardcreator.json',
      content: toBuffer(projectContent),
      size: projectContent.length,
    });

    await idle();

    // THEN
    const modalShadow = modal.shadowRoot!;
    const title = modalShadow.getElementById('modal-title');
    const body = modalShadow.getElementById('modal-body');

    expect(title?.textContent).toBe('Load Project?');
    expect(body?.textContent).toContain(
      'myproject.cardcreator.json',
    );
    expect(body?.textContent).toContain(
      'Do you want to load it?',
    );
  });

  test('when user confirms, the project is loaded', (done) => {
    // GIVEN
    const projectData: ProjectData = {
      name: 'Confirmed Project',
      template: '<svg>confirmed</svg>',
      _functions: new Map(),
    };
    const projectContent = JSON.stringify(projectData);

    // THEN: Event is fired when project is loaded.
    library.events.on('projectLoaded', (event) => {
      expect(event.data.name).toBe('Confirmed Project');
      expect(event.data.template).toBe(
        '<svg>confirmed</svg>',
      );
      done();
    });

    // WHEN
    library.files.loadFile({
      type: 'direct',
      path: 'confirmed.cardcreator.json',
      content: toBuffer(projectContent),
      size: projectContent.length,
    });

    // Wait for modal to appear, then click confirm
    setTimeout(async () => {
      const modalShadow = modal.shadowRoot!;
      const confirmButton = modalShadow.getElementById(
        'confirm-button',
      ) as HTMLButtonElement;
      confirmButton.click();
    }, 10);

    timeout(done, 200);
  });

  test('when user cancels, the project is not loaded', async () => {
    // GIVEN
    const projectData: ProjectData = {
      name: 'Cancelled Project',
      template: '<svg>cancelled</svg>',
      _functions: new Map(),
    };
    const projectContent = JSON.stringify(projectData);
    let projectLoaded = false;

    library.events.on('projectLoaded', () => {
      projectLoaded = true;
    });

    // WHEN
    library.files.loadFile({
      type: 'direct',
      path: 'cancelled.cardcreator.json',
      content: toBuffer(projectContent),
      size: projectContent.length,
    });

    await idle();

    // Click cancel
    const modalShadow = modal.shadowRoot!;
    const cancelButton = modalShadow.getElementById(
      'cancel-button',
    ) as HTMLButtonElement;
    cancelButton.click();

    await idle();

    // THEN
    expect(modal.isOpen()).toBe(false);
    expect(projectLoaded).toBe(false);
  });

  test('modal closes when clicking the X button', async () => {
    // GIVEN
    const projectData: ProjectData = {
      name: 'Test Project',
      template: '<svg></svg>',
      _functions: new Map(),
    };
    const projectContent = JSON.stringify(projectData);

    library.files.loadFile({
      type: 'direct',
      path: 'test.cardcreator.json',
      content: toBuffer(projectContent),
      size: projectContent.length,
    });

    await idle();
    expect(modal.isOpen()).toBe(true);

    // WHEN
    const modalShadow = modal.shadowRoot!;
    const closeButton = modalShadow.getElementById(
      'close-button',
    ) as HTMLButtonElement;
    closeButton.click();

    await idle();

    // THEN
    expect(modal.isOpen()).toBe(false);
  });

  test('project file in nested folder is detected', async () => {
    // GIVEN
    const projectData: ProjectData = {
      name: 'Nested Project',
      template: '<svg></svg>',
      _functions: new Map(),
    };
    const projectContent = JSON.stringify(projectData);

    // WHEN
    library.files.loadFile({
      type: 'direct',
      path: 'some/nested/folder/project.cardcreator.json',
      content: toBuffer(projectContent),
      size: projectContent.length,
    });

    await idle();

    // THEN
    expect(modal.isOpen()).toBe(true);
    const modalShadow = modal.shadowRoot!;
    const body = modalShadow.getElementById('modal-body');
    expect(body?.textContent).toContain(
      'project.cardcreator.json',
    );
  });

  test('invalid JSON shows error modal', async () => {
    // GIVEN
    const invalidContent = 'this is not valid JSON {{{';

    // WHEN
    library.files.loadFile({
      type: 'direct',
      path: 'invalid.cardcreator.json',
      content: toBuffer(invalidContent),
      size: invalidContent.length,
    });

    await idle();

    // Click confirm to try loading
    const modalShadow = modal.shadowRoot!;
    const confirmButton = modalShadow.getElementById(
      'confirm-button',
    ) as HTMLButtonElement;
    confirmButton.click();

    await idle();

    // THEN - error modal should be shown
    expect(modal.isOpen()).toBe(true);
    const title = modalShadow.getElementById('modal-title');
    expect(title?.textContent).toBe(
      'Error Loading Project',
    );
  });

  test('project file missing name field shows error', async () => {
    // GIVEN
    const invalidProject = {
      template: '<svg></svg>',
      // name is missing
    };
    const projectContent = JSON.stringify(invalidProject);

    // WHEN
    library.files.loadFile({
      type: 'direct',
      path: 'missing-name.cardcreator.json',
      content: toBuffer(projectContent),
      size: projectContent.length,
    });

    await idle();

    // Click confirm
    const modalShadow = modal.shadowRoot!;
    const confirmButton = modalShadow.getElementById(
      'confirm-button',
    ) as HTMLButtonElement;
    confirmButton.click();

    await idle();

    // THEN
    expect(modal.isOpen()).toBe(true);
    const title = modalShadow.getElementById('modal-title');
    const body = modalShadow.getElementById('modal-body');
    expect(title?.textContent).toBe(
      'Error Loading Project',
    );
    expect(body?.textContent).toContain(
      'missing "name" field',
    );
  });

  test('when clicking backdrop, modal closes', async () => {
    // GIVEN
    const projectData: ProjectData = {
      name: 'Test Project',
      template: '<svg></svg>',
      _functions: new Map(),
    };
    const projectContent = JSON.stringify(projectData);

    library.files.loadFile({
      type: 'direct',
      path: 'test.cardcreator.json',
      content: toBuffer(projectContent),
      size: projectContent.length,
    });

    await idle();
    expect(modal.isOpen()).toBe(true);

    // WHEN
    const modalShadow = modal.shadowRoot!;
    const backdrop = modalShadow.getElementById(
      'backdrop',
    ) as HTMLDivElement;
    backdrop.click();

    await idle();

    // THEN
    expect(modal.isOpen()).toBe(false);
  });
});

describe('ModalElement', () => {
  let modal: ModalElement;

  beforeEach(() => {
    document.body.innerHTML = '<cc-modal></cc-modal>';
    modal = document.querySelector(
      'cc-modal',
    ) as ModalElement;
  });

  test('modal initializes closed', () => {
    // GIVEN / THEN
    expect(modal.isOpen()).toBe(false);
  });

  test('confirm opens modal and returns promise', async () => {
    // GIVEN / WHEN
    const promise = modal.confirm(
      'Test Title',
      'Test Message',
      'OK',
      'Cancel',
    );

    // THEN
    expect(modal.isOpen()).toBe(true);
    expect(promise).toBeInstanceOf(Promise);

    // Clean up
    modal.close(false);
  });

  test('confirm sets title and message correctly', async () => {
    // GIVEN / WHEN
    modal.confirm(
      'Custom Title',
      'Custom Message',
      'Yes',
      'No',
    );

    // THEN
    const shadow = modal.shadowRoot!;
    const title = shadow.getElementById('modal-title');
    const body = shadow.getElementById('modal-body');

    expect(title?.textContent).toBe('Custom Title');
    expect(body?.textContent).toBe('Custom Message');

    // Clean up
    modal.close(false);
  });

  test('clicking confirm button resolves promise with true', async () => {
    // GIVEN
    const promise = modal.confirm('Title', 'Message');

    // WHEN
    const shadow = modal.shadowRoot!;
    const confirmButton = shadow.getElementById(
      'confirm-button',
    ) as HTMLButtonElement;
    confirmButton.click();

    // THEN
    const result = await promise;
    expect(result).toBe(true);
    expect(modal.isOpen()).toBe(false);
  });

  test('clicking cancel button resolves promise with false', async () => {
    // GIVEN
    const promise = modal.confirm('Title', 'Message');

    // WHEN
    const shadow = modal.shadowRoot!;
    const cancelButton = shadow.getElementById(
      'cancel-button',
    ) as HTMLButtonElement;
    cancelButton.click();

    // THEN
    const result = await promise;
    expect(result).toBe(false);
    expect(modal.isOpen()).toBe(false);
  });

  test('close method hides modal and resolves promise', async () => {
    // GIVEN
    const promise = modal.confirm('Title', 'Message');
    expect(modal.isOpen()).toBe(true);

    // WHEN
    modal.close(true);

    // THEN
    expect(modal.isOpen()).toBe(false);
    const result = await promise;
    expect(result).toBe(true);
  });

  test('custom button labels are displayed', async () => {
    // GIVEN / WHEN
    modal.confirm('Title', 'Message', 'Proceed', 'Go Back');

    // THEN
    const shadow = modal.shadowRoot!;
    const confirmButton = shadow.getElementById(
      'confirm-button',
    ) as HTMLButtonElement;
    const cancelButton = shadow.getElementById(
      'cancel-button',
    ) as HTMLButtonElement;

    expect(confirmButton.textContent).toBe('Proceed');
    expect(cancelButton.textContent).toBe('Go Back');

    // Clean up
    modal.close(false);
  });
});
