/**
 * File Tree Web Component
 */
import * as yaml from 'js-yaml';

interface VFile {
  name: string;
  path: string;
  isDir: boolean;
  children?: VFile[];
  content?: ArrayBuffer;
}

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host { display: flex; flex-direction: column; flex: 1; overflow: hidden; }
    .header { display: flex; gap: 4px; padding: 8px; background: var(--bg-tertiary, #353550); border-bottom: 1px solid var(--border, #404060); }
    .tree { flex: 1; overflow: auto; padding: 8px; font-size: 13px; }
    .item { padding: 4px 8px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 4px; }
    .item:hover { background: var(--bg-hover, #404060); }
    .item.selected { background: var(--accent, #7c3aed); }
    .folder > .children { margin-left: 16px; }
    .folder.collapsed > .children { display: none; }
    .icon { width: 16px; text-align: center; }
  </style>
  <div class="header">
    <button id="upload-folder" title="Upload Folder">📁+</button>
    <button id="upload-file" title="Upload File">📄+</button>
  </div>
  <div class="tree" id="tree"></div>
  <input type="file" id="folder-input" webkitdirectory multiple hidden>
  <input type="file" id="file-input" multiple hidden>
`;

export class FileTreeElement extends HTMLElement {
  private files: VFile[] = [];
  private shadow: ShadowRoot;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    this.shadow.appendChild(
      template.content.cloneNode(true),
    );
  }

  connectedCallback(): void {
    this.shadow.getElementById('upload-folder')!.onclick =
      () =>
        this.shadow.getElementById('folder-input')!.click();
    this.shadow.getElementById('upload-file')!.onclick =
      () =>
        this.shadow.getElementById('file-input')!.click();
    this.shadow.getElementById('folder-input')!.onchange = (
      e,
    ) => this.handleUpload(e, true);
    this.shadow.getElementById('file-input')!.onchange = (
      e,
    ) => this.handleUpload(e, false);
  }

  private async handleUpload(
    e: Event,
    isFolder: boolean,
  ): Promise<void> {
    const input = e.target as HTMLInputElement;
    if (!input.files?.length) return;

    const files = await this.processFiles(
      Array.from(input.files),
      isFolder,
    );
    this.files = [...this.files, ...files];
    this.render();
    input.value = '';
  }

  private async processFiles(
    files: File[],
    isFolder: boolean,
  ): Promise<VFile[]> {
    if (!isFolder) {
      return Promise.all(
        files.map(async (f) => ({
          name: f.name,
          path: f.name,
          isDir: false,
          content: await f.arrayBuffer(),
        })),
      );
    }

    const root = new Map<string, VFile>();
    for (const file of files) {
      const parts = file.webkitRelativePath.split('/');
      let parent: VFile | undefined;
      let parentPath = '';

      for (let i = 0; i < parts.length - 1; i++) {
        const dirPath = parentPath
          ? `${parentPath}/${parts[i]}`
          : parts[i];
        if (!root.has(dirPath)) {
          const dir: VFile = {
            name: parts[i],
            path: dirPath,
            isDir: true,
            children: [],
          };
          root.set(dirPath, dir);
          if (parent) parent.children!.push(dir);
        }
        parent = root.get(dirPath);
        parentPath = dirPath;
      }

      const vf: VFile = {
        name: file.name,
        path: file.webkitRelativePath,
        isDir: false,
        content: await file.arrayBuffer(),
      };
      if (parent) parent.children!.push(vf);
      root.set(vf.path, vf);
    }

    return Array.from(root.values()).filter(
      (f) => !f.path.includes('/'),
    );
  }

  private render(): void {
    const tree = this.shadow.getElementById('tree')!;
    tree.innerHTML = '';
    this.files.forEach((f) =>
      tree.appendChild(this.renderItem(f)),
    );
  }

  private renderItem(file: VFile): HTMLElement {
    const div = document.createElement('div');
    div.className = file.isDir ? 'folder' : 'file';

    const item = document.createElement('div');
    item.className = 'item';
    item.innerHTML = `<span class="icon">${
      file.isDir ? '📁' : this.getIcon(file.name)
    }</span><span>${file.name}</span>`;
    div.appendChild(item);

    if (file.isDir && file.children) {
      const children = document.createElement('div');
      children.className = 'children';
      file.children.forEach((c) =>
        children.appendChild(this.renderItem(c)),
      );
      div.appendChild(children);
      item.onclick = () =>
        div.classList.toggle('collapsed');
    } else {
      item.onclick = () => this.handleFileClick(file);
    }

    return div;
  }

  private getIcon(name: string): string {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    return (
      {
        svg: '🎨',
        json: '📋',
        yml: '⚙️',
        yaml: '⚙️',
        csv: '📊',
        xlsx: '📊',
      }[ext] || '📄'
    );
  }

  private async handleFileClick(
    file: VFile,
  ): Promise<void> {
    if (!file.content) return;
    const lib = (window as any).cardCreatorLibrary;
    if (!lib) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    const text = new TextDecoder().decode(file.content);

    if (ext === 'json') {
      const data = JSON.parse(text);
      if (Array.isArray(data)) lib.cards?.load(data);
      else lib.config?.merge(data);
    } else if (ext === 'yml' || ext === 'yaml') {
      lib.config?.merge(yaml.load(text));
    } else if (ext === 'csv') {
      lib.cards?.load(this.parseCsv(text));
    } else if (ext === 'xlsx') {
      const XLSX = await import('xlsx');
      const wb = XLSX.read(file.content, { type: 'array' });
      const data = XLSX.utils.sheet_to_json(
        wb.Sheets[wb.SheetNames[0]],
      );
      lib.cards?.load(data);
    }
  }

  private parseCsv(text: string): any[] {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0]
      .split(',')
      .map((h) => h.trim().replace(/^"|"$/g, ''));
    return lines.slice(1).map((line) => {
      const vals = line
        .split(',')
        .map((v) => v.trim().replace(/^"|"$/g, ''));
      return Object.fromEntries(
        headers.map((h, i) => [h, vals[i] || '']),
      );
    });
  }

  // For testing
  getFiles(): VFile[] {
    return this.files;
  }
  getTreeHtml(): string {
    return this.shadow.getElementById('tree')!.innerHTML;
  }
}

customElements.define('cc-file-tree', FileTreeElement);
