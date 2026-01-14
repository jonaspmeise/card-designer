/// <reference lib="dom" />

import {
  describe,
  test,
  expect,
  beforeEach,
  beforeAll,
  afterAll,
} from 'bun:test';
import { CardCreatorLibrary } from 'cardcreator-library';
import { CardcreatorHTMLComponent } from '../cardcreator-component';
import { ConfigElement } from './config';
import { idle, timeout } from '../test-utils';

import './file-tree';
import { FileTreeElement } from './file-tree';

describe('FileTreeElement', () => {
  let raw: FileTreeElement;
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
      '<cc-file-tree></cc-file-tree>';
    raw = document.querySelector(
      'cc-file-tree',
    ) as FileTreeElement;

    raw.provide(library);
    element = raw.shadowRoot!;
  });

  test('when a file is uploaded, the library function is called and the according event is issued', (done) => {
    // GIVEN
    const input = element.getElementById(
      'file-input',
    ) as HTMLInputElement;

    const file = new File(
      ['file content'],
      'test-file.txt',
      {
        type: 'text/plain',
      },
    );
    const datatransfer = new DataTransfer();
    datatransfer.items.add(file);

    // THEN
    library.events.on('fileAdded', async (event) => {
      expect(event.data.file.path).toBe('test-file.txt');
      expect(event.data.file.extension).toBe('txt');
      expect(event.data.file.type).toBe('direct');
      const content = await event.data.file.content();

      expect(new TextDecoder().decode(content)).toBe(
        'file content',
      );

      done();
    });

    // WHEN
    input.files = datatransfer.files;

    input.dispatchEvent(new Event('change'));

    timeout(done);
  });

  test('when a single file is uploaded, it appears in the tree', async () => {
    // GIVEN
    const input = element.getElementById(
      'file-input',
    ) as HTMLInputElement;
    const file = new File(
      ['file content'],
      'single-file.txt',
      {
        type: 'text/plain',
      },
    );
    const datatransfer = new DataTransfer();
    datatransfer.items.add(file);

    // WHEN
    input.files = datatransfer.files;
    input.dispatchEvent(new Event('change'));

    // Wait for browser to settle, until the event is processed.
    await idle();

    // THEN
    const item = element.querySelector(
      'li[data-path="single-file.txt"]',
    ) as HTMLDivElement;
    expect(item).not.toBeNull();
    expect(item.textContent).toContain('single-file.txt');
    expect(item.title).toMatch(/\? bytes/i); // The file was not yet loaded, so its size is unknown.
  });

  test.todo(
    'when a folder workspace is loaded, it appears in the tree',
    async () => {},
  );
});
