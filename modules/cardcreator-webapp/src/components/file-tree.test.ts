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

  test('when a folder workspace is loaded, it appears in the tree', async () => {
    // GIVEN
    const input = element.getElementById(
      'folder-input',
    ) as HTMLInputElement;

    const file1 = new File(['a'], 'a.txt', {
      type: 'text/plain',
    });
    Object.defineProperty(file1, 'webkitRelativePath', {
      value: 'myFolder/a.txt',
    });

    const file2 = new File(['b'], 'b.json', {
      type: 'application/json',
    });
    Object.defineProperty(file2, 'webkitRelativePath', {
      value: 'myFolder/nested/b.json',
    });

    const datatransfer = new DataTransfer();
    datatransfer.items.add(file1);
    datatransfer.items.add(file2);

    // WHEN
    input.files = datatransfer.files;
    input.dispatchEvent(new Event('change'));

    // Wait for browser to settle, until the event is processed.
    await idle();

    // THEN
    // 2 items exist in the tree.
    let item = Array.from(
      element.querySelectorAll(
        'li[data-path="myFolder/a.txt"], li[data-path="myFolder/nested/b.json"]',
      ),
    );

    expect(item.length).toBe(2);

    expect(
      element.querySelector(
        'li[data-path="myFolder/a.txt"]',
      )!.textContent,
    ).toEqual('a.txt');
    expect(
      element.querySelector(
        'li[data-path="myFolder/nested/b.json"]',
      )!.textContent,
    ).toEqual('b.json');

    // There should be a node representing the "myFolder" folder.
    item = Array.from(
      element.querySelectorAll(
        '.folder[data-path="myFolder"] .file[data-path="myFolder/a.txt"]',
      ),
    );
    expect(item.length).toBe(1);
  });

  test('when a nested file in a folder is uploaded, it is hidden. by clicking it, the files in the next nested level are shown', async () => {
    // GIVEN
    const input = element.getElementById(
      'folder-input',
    ) as HTMLInputElement;

    const file1 = new File(['a'], 'a.txt', {
      type: 'text/plain',
    });
    Object.defineProperty(file1, 'webkitRelativePath', {
      value: 'myFolder/a.txt',
    });

    const file2 = new File(['b'], 'b.json', {
      type: 'application/json',
    });
    Object.defineProperty(file2, 'webkitRelativePath', {
      value: 'myFolder/nested/b.json',
    });

    const datatransfer = new DataTransfer();
    datatransfer.items.add(file1);
    datatransfer.items.add(file2);

    // WHEN
    input.files = datatransfer.files;
    input.dispatchEvent(new Event('change'));

    // Wait for browser to settle, until the event is processed.
    await idle();

    // THEN
    // There should only be a single item at the top level (the folder).
    const nestedFolder = Array.from(
      element.querySelectorAll(
        '#workspace > li',
      ) as NodeListOf<HTMLLIElement>,
    );
    expect(nestedFolder).toHaveLength(1);
    expect(
      nestedFolder[0].classList.contains('folder'),
    ).toBeTrue();

    // Initially, all nested items are hidden.
    expect(
      Array.from(
        nestedFolder[0].querySelectorAll('.tree'),
      ).find((li) => li.classList.contains('active')),
    ).toBeUndefined();

    // WHEN clicking the top-level folder node.
    (
      nestedFolder[0].querySelector(
        'span',
      )! as HTMLSpanElement
    ).click();

    // THEN the nested subfolder item is visible.
    expect(
      nestedFolder[0]
        .querySelector('.tree')!
        .classList.contains('active'),
    ).toBe(true);
  });

  test('when a nested folder is collapsed, all its child folders disappear. when clicking the folder again, the child folders reappear', async () => {
    // GIVEN
    const input = element.getElementById(
      'folder-input',
    ) as HTMLInputElement;

    const file1 = new File(['a'], 'a.txt', {
      type: 'text/plain',
    });
    Object.defineProperty(file1, 'webkitRelativePath', {
      value: 'myFolder/a.txt',
    });

    const file2 = new File(['b'], 'b.json', {
      type: 'application/json',
    });
    Object.defineProperty(file2, 'webkitRelativePath', {
      value: 'myFolder/nested/b.json',
    });

    const datatransfer = new DataTransfer();
    datatransfer.items.add(file1);
    datatransfer.items.add(file2);

    // WHEN
    input.files = datatransfer.files;
    input.dispatchEvent(new Event('change'));

    // Wait for browser to settle, until the event is processed.
    await idle();

    // WHEN clicking the top-level folder node.
    const topFolder = element.querySelector(
      '.tree[data-path="myFolder"]',
    ) as HTMLLIElement;
    (
      topFolder.parentElement!.querySelector(
        'span',
      )! as HTMLSpanElement
    ).click();

    // THEN the nested subfolder item is visible.
    const subfolder: HTMLLIElement =
      topFolder.querySelector(
        '.tree[data-path="myFolder/nested"]',
      ) as HTMLLIElement;
    const child: HTMLLIElement = topFolder.querySelector(
      '.file[data-path="myFolder/nested/b.json"]',
    ) as HTMLLIElement;

    expect(subfolder).not.toBeNull();
    expect(child).not.toBeNull();

    expect(topFolder.classList.contains('active')).toBe(
      true,
    );
    expect(topFolder.classList.contains('inactive')).toBe(
      false,
    );
    // ... but the nested file is still hidden.
    expect(subfolder.classList.contains('active')).toBe(
      false,
    );
    expect(subfolder.classList.contains('inactive')).toBe(
      true,
    );

    // WHEN clicking the top-level folder node again to collapse it.
    topFolder.click();
  });
});
