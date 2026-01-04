/**
 * File Tree Component Tests
 */
import {
  describe,
  test,
  expect,
  beforeEach,
} from 'bun:test';
import './file-tree';
import { FileTreeElement } from './file-tree';
import {
  nextTick,
  createMockFile,
  createMockFileList,
} from '../test-utils';

describe('FileTreeElement', () => {
  let element: FileTreeElement;

  beforeEach(() => {
    document.body.innerHTML =
      '<cc-file-tree></cc-file-tree>';
    element = document.querySelector(
      'cc-file-tree',
    ) as FileTreeElement;
  });

  test('renders empty tree initially', () => {
    expect(element.getFiles()).toEqual([]);
    expect(element.getTreeHtml()).toBe('');
  });

  test('uploads single file and renders it', async () => {
    const file = createMockFile('test.json', '[]');
    const input = element.shadowRoot!.getElementById(
      'file-input',
    ) as HTMLInputElement;

    Object.defineProperty(input, 'files', {
      value: createMockFileList([file]),
    });
    input.dispatchEvent(new Event('change'));
    await nextTick();

    const files = element.getFiles();
    expect(files.length).toBe(1);
    expect(files[0].name).toBe('test.json');
    expect(element.getTreeHtml()).toContain('test.json');
  });

  test('uploads folder with nested files and renders tree structure', async () => {
    const file1 = Object.assign(
      createMockFile('data.json', '{}'),
      { webkitRelativePath: 'project/data.json' },
    );
    const file2 = Object.assign(
      createMockFile('cards.csv', 'name,cost\nFireball,3'),
      { webkitRelativePath: 'project/assets/cards.csv' },
    );

    const input = element.shadowRoot!.getElementById(
      'folder-input',
    ) as HTMLInputElement;
    Object.defineProperty(input, 'files', {
      value: createMockFileList([file1, file2]),
    });
    input.dispatchEvent(new Event('change'));
    await nextTick();

    const files = element.getFiles();
    expect(files.length).toBe(1);
    expect(files[0].name).toBe('project');
    expect(files[0].isDir).toBe(true);
    expect(files[0].children?.length).toBe(2);

    const html = element.getTreeHtml();
    expect(html).toContain('project');
    expect(html).toContain('data.json');
    expect(html).toContain('assets');
    expect(html).toContain('cards.csv');
  });

  test('folder can be collapsed', async () => {
    const file = Object.assign(
      createMockFile('file.txt', 'test'),
      { webkitRelativePath: 'folder/file.txt' },
    );

    const input = element.shadowRoot!.getElementById(
      'folder-input',
    ) as HTMLInputElement;
    Object.defineProperty(input, 'files', {
      value: createMockFileList([file]),
    });
    input.dispatchEvent(new Event('change'));
    await nextTick();

    const folder = element.shadowRoot!.querySelector(
      '.folder',
    ) as HTMLElement;
    expect(folder.classList.contains('collapsed')).toBe(
      false,
    );

    folder
      .querySelector('.item')!
      .dispatchEvent(new Event('click'));
    expect(folder.classList.contains('collapsed')).toBe(
      true,
    );
  });
});
