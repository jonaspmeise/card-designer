/**
 * File Tree Web Component
 */
import { CardcreatorHTMLComponent } from '../cardcreator-component';
import {
  FileInformation,
  ResolvedFile,
} from '../../../cardcreator-library/src/file/file-types';

export class FileTreeElement extends CardcreatorHTMLComponent {
  private _uploadFileButton!: HTMLButtonElement;
  private _fileInput!: HTMLInputElement;
  private _tree!: HTMLDivElement;

  constructor() {
    super();
  }

  protected init(): void {
    this._uploadFileButton = this.shadow.getElementById(
      'upload-file',
    ) as HTMLButtonElement;
    this._fileInput = this.shadow.getElementById(
      'file-input',
    ) as HTMLInputElement;
    this._tree = this.shadow.getElementById(
      'workspace-tree',
    ) as HTMLDivElement;

    // Add event listeners for DOM -> API events.
    this._fileInput.addEventListener('change', () => {
      console.debug('File input changed.');

      const files = this._fileInput.files;
      if (files != null) {
        console.debug(`Uploading ${files.length} files...`);

        // TODO: When I add a file, do I add it as 'direct' or 'virtual'?
        Array.from(files).forEach(async (file) => {
          const buffer = await file.arrayBuffer();

          this.library.files.loadFile({
            type: 'direct',
            path: file.name,
            content: buffer,
            size: buffer.byteLength,
          });
          console.debug(
            `Added file "${file.name}" to workspace tree.`,
          );
        });
      }
    });

    this._uploadFileButton.addEventListener('click', () => {
      const input = this.shadow.getElementById(
        'file-input',
      ) as HTMLInputElement;
      input.click();
    });

    // Add event listeners for API -> DOM events.
    this.library.events.on('fileAdded', (event) => {
      console.debug(`File added: ${event.data.file.path}`);

      this._addFile(event.data.file);
    });
  }

  /**
   * Adds a file to the tree.
   * If the file already exists, its entry is updated.
   * @param file The file to add.
   */
  private _addFile(
    file: ResolvedFile<FileInformation>,
  ): void {
    console.debug(`Adding file to tree: ${file.path}`);

    const item = this._tree.querySelector(
      `li[data-path="${file.path}"]`,
    );

    if (item !== null) {
      console.debug(
        `File already exists in tree: ${file.path}`,
      );
      // TODO: Update entry!
      return;
    } else {
      const li = document.createElement('li');
      li.dataset['path'] = file.path;
      li.textContent = file.path;
      li.title = `Size: ${
        file.loaded() ? file.size() : '?'
      } bytes`;

      this._tree.appendChild(li);
    }
  }

  protected template(): HTMLTemplateElement {
    const template = document.createElement('template');
    template.innerHTML = `
      <style>
        :host { display: flex; flex-direction: column; flex: 1; overflow: hidden; }
        .header { display: flex; gap: 4px; padding: 8px; background: var(--bg-tertiary, #353550); border-bottom: 1px solid var(--border, #404060); }
        .item { padding: 4px 8px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 4px; }
        .item:hover { background: var(--bg-hover, #404060); }
        .item.selected { background: var(--accent, #7c3aed); }
        .folder > .children { margin-left: 16px; }
        .folder.collapsed > .children { display: none; }
        .icon { width: 16px; text-align: center; }
      </style>
      <div class="header">
        <button id="upload-folder" title="Load local Workspace">📁+</button>
        <button id="upload-file" title="Add File">📄+</button>
      </div>
      <ul id="workspace-tree"></div>
      <input type="file" id="folder-input" webkitdirectory multiple hidden>
      <input type="file" id="file-input" multiple hidden>
    `;

    return template;
  }
}

customElements.define('cc-file-tree', FileTreeElement);
