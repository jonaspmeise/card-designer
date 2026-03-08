/// <reference lib="dom" />

import {
  describe,
  test,
  expect,
  beforeEach,
} from 'bun:test';
import { CardCreatorLibrary } from 'cardcreator-library';
import { idle, timeout } from '../test-utils';

import './project-loader';
import { ProjectLoaderElement } from './project-loader';
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
  });

  test('component initializes with a modal backdrop element', () => {
    // GIVEN / THEN
    const backdrop = element.getElementById(
      'modal-backdrop',
    );
    expect(backdrop).not.toBeNull();
  });

  test('modal is initially hidden', () => {
    // GIVEN / THEN
    const backdrop = element.querySelector(
      '[data-modal-open="true"]',
    );
    expect(backdrop).toBeNull();
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
    const backdrop = element.querySelector(
      '[data-modal-open="true"]',
    );
    expect(backdrop).toBeNull();
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
      const backdrop = element.querySelector(
        '[data-modal-open="true"]',
      );
      expect(backdrop).not.toBeNull();
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
    const title = element.getElementById('modal-title');
    const body = element.getElementById('modal-body');

    expect(title?.textContent).toBe('Load Project?');
    expect(body?.textContent).toContain(
      'myproject.cardcreator.json',
    );
    expect(body?.textContent).toContain(
      'Do you want to load it?',
    );
  });

  test('when user confirms, the project is loaded', async (done) => {
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

    await idle();

    const loadButton = element.querySelector(
      '[data-modal-button="Load Project"]',
    ) as HTMLButtonElement;
    loadButton.click();

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
    const cancelButton = element.querySelector(
      '[data-modal-button="Cancel"]',
    ) as HTMLButtonElement;
    cancelButton?.click();

    await idle();

    // THEN
    const backdrop = element.querySelector(
      '[data-modal-open="true"]',
    );
    expect(backdrop).toBeNull();
    expect(projectLoaded).toBe(false);
  });

  test('modal closes when clicking the close button (non-forced modal)', async () => {
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
    expect(
      element.querySelector('[data-modal-open="true"]'),
    ).not.toBeNull();

    // WHEN
    const closeButton = element.getElementById(
      'modal-close-button',
    ) as HTMLButtonElement;
    closeButton.click();

    await idle();

    // THEN
    expect(
      element.querySelector('[data-modal-open="true"]'),
    ).toBeNull();
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
    expect(
      element.querySelector('[data-modal-open="true"]'),
    ).not.toBeNull();
    const body = element.getElementById('modal-body');
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

    // Click Load Project to try loading
    const loadButton = element.querySelector(
      '[data-modal-button="Load Project"]',
    ) as HTMLButtonElement;
    loadButton?.click();

    await idle(20);

    // THEN - error modal should be shown
    expect(
      element.querySelector('[data-modal-open="true"]'),
    ).not.toBeNull();
    const title = element.getElementById('modal-title');
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

    // Click Load Project
    const loadButton = element.querySelector(
      '[data-modal-button="Load Project"]',
    ) as HTMLButtonElement;
    loadButton?.click();

    await idle(20);

    // THEN
    expect(
      element.querySelector('[data-modal-open="true"]'),
    ).not.toBeNull();
    const title = element.getElementById('modal-title');
    const body = element.getElementById('modal-body');
    expect(title?.textContent).toBe(
      'Error Loading Project',
    );
    expect(body?.textContent).toContain(
      'missing "name" field',
    );
  });

  test('when clicking backdrop, non-forced modal closes', async () => {
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
    expect(
      element.querySelector('[data-modal-open="true"]'),
    ).not.toBeNull();

    // WHEN
    const backdrop = element.getElementById(
      'modal-backdrop',
    ) as HTMLDivElement;
    backdrop.click();

    await idle();

    // THEN
    expect(
      element.querySelector('[data-modal-open="true"]'),
    ).toBeNull();
  });

  test('forced error modal cannot be closed via backdrop click', async () => {
    // GIVEN - trigger an error modal (which is forced)
    const invalidContent = 'not valid JSON';

    library.files.loadFile({
      type: 'direct',
      path: 'bad.cardcreator.json',
      content: toBuffer(invalidContent),
      size: invalidContent.length,
    });

    await idle();

    // Click Load Project to trigger the error
    const loadButton = element.querySelector(
      '[data-modal-button="Load Project"]',
    ) as HTMLButtonElement;
    loadButton?.click();

    await idle(20);
    expect(
      element.querySelector('[data-modal-open="true"]'),
    ).not.toBeNull();

    // WHEN - try to close via backdrop
    const backdrop = element.getElementById(
      'modal-backdrop',
    ) as HTMLDivElement;
    backdrop.click();

    await idle();

    // THEN - modal should still be open
    expect(
      element.querySelector('[data-modal-open="true"]'),
    ).not.toBeNull();

    // Clean up - close via the OK button
    const okButton = element.querySelector(
      '[data-modal-button="OK"]',
    ) as HTMLButtonElement;
    okButton?.click();

    await idle();
    expect(
      element.querySelector('[data-modal-open="true"]'),
    ).toBeNull();
  });

  test('forced error modal hides the close button', async () => {
    // GIVEN - trigger an error modal (which is forced)
    const invalidContent = 'not valid JSON';

    library.files.loadFile({
      type: 'direct',
      path: 'bad2.cardcreator.json',
      content: toBuffer(invalidContent),
      size: invalidContent.length,
    });

    await idle();

    // Click Load Project to trigger the error
    const loadButton = element.querySelector(
      '[data-modal-button="Load Project"]',
    ) as HTMLButtonElement;
    loadButton?.click();

    await idle(20);

    // THEN - close button should be hidden
    const closeButton = element.getElementById(
      'modal-close-button',
    ) as HTMLButtonElement;
    expect(closeButton.style.display).toBe('none');

    // Clean up
    const okButton = element.querySelector(
      '[data-modal-button="OK"]',
    ) as HTMLButtonElement;
    okButton?.click();
  });

  test('modal displays the correct level icon', async () => {
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
      path: 'icon-test.cardcreator.json',
      content: toBuffer(projectContent),
      size: projectContent.length,
    });

    await idle();

    // THEN - question modal should show question icon
    const icon = element.getElementById('modal-icon');
    expect(icon?.textContent).toBe('❓');

    // Clean up
    const cancelButton = element.querySelector(
      '[data-modal-button="Cancel"]',
    ) as HTMLButtonElement;
    cancelButton?.click();
  });
});
