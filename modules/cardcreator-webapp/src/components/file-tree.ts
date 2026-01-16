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
  private _uploadFolderButton!: HTMLButtonElement;
  private _fileInput!: HTMLInputElement;
  private _folderInput!: HTMLInputElement;
  private _tree!: HTMLUListElement;

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
    this._uploadFolderButton = this.shadow.getElementById(
      'upload-folder',
    ) as HTMLButtonElement;
    this._folderInput = this.shadow.getElementById(
      'folder-input',
    ) as HTMLInputElement;
    this._tree = this.shadow.getElementById(
      'workspace',
    ) as HTMLUListElement;

    // Add event listeners for DOM -> API events.
    this._fileInput.addEventListener('change', () => {
      console.debug('File input changed.');

      this._processFiles(
        Array.from(this._fileInput.files ?? []),
      );
    });

    this._folderInput.addEventListener('change', () => {
      console.debug('Folder input changed.');

      this._processFiles(
        Array.from(this._folderInput.files ?? []),
      );
    });

    this._uploadFileButton.addEventListener('click', () => {
      this._fileInput.click();
    });

    this._uploadFolderButton.addEventListener(
      'click',
      () => {
        this._folderInput.click();
      },
    );

    // Add event listeners for API -> DOM events.
    this.library.events.on('fileAdded', (event) => {
      console.debug(`File added: ${event.data.file.path}`);

      this._addFile(event.data.file);
    });
  }

  private async _processFiles(
    files: File[],
  ): Promise<void> {
    console.debug(`Uploading ${files.length} files...`);

    files.forEach(async (file) => {
      const buffer = await file.arrayBuffer();

      this.library.files.loadFile({
        type: 'direct',
        path:
          // Since we don't use webkitRelativePath in testing, we make this potentially undefined.
          file.webkitRelativePath?.length > 0
            ? file.webkitRelativePath
            : file.name,
        content: buffer,
        size: buffer.byteLength,
      });
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
      // Potentially add all missing parent folder paths...
      const folders = file.path.split('/').slice(0, -1);

      // The parent, where we will add this file to.
      let parent = this._tree;

      folders.forEach((folder, index) => {
        const path = folders.slice(0, index + 1).join('/');

        let folderItem = parent.querySelector(
          `ul[data-path="${path}"]`,
        ) as HTMLUListElement;

        console.debug(
          `Folder "${folder}" exists? ${
            folderItem !== null
          }`,
        );

        if (folderItem === null) {
          const folderli = document.createElement('li');
          folderli.classList.add('folder');
          folderli.dataset['path'] = path;

          const span = document.createElement('span');
          span.textContent = folder;
          folderli.appendChild(span);

          folderItem = document.createElement('ul');
          folderItem.classList.add('tree', 'inactive');
          folderItem.dataset['path'] = path;
          folderItem.title = 'Folder';
          folderli.appendChild(folderItem);

          span.addEventListener('click', (e) => {
            e.stopPropagation();
            this._toggleFolder(folderItem);
          });

          parent.appendChild(folderli);
          console.debug(`Folder added to tree: ${path}`);
        }

        parent = folderItem;
      });

      const li = document.createElement('li');
      li.classList.add('file');
      li.dataset['path'] = file.path;
      li.textContent = file.path.split('/').pop()!;
      li.title = `Size: ${
        file.loaded() ? file.size() : '?'
      } bytes`;

      parent.appendChild(li);

      console.debug(`File added to tree: ${file.path}`);
    }
  }

  private _toggleFolder(folder: HTMLUListElement): void {
    console.debug(
      `Toggling folder: ${folder.dataset['path']}`,
    );
    const target = folder.parentElement!.querySelector(
      'ul,.tree',
    ) as HTMLUListElement;

    console.debug(
      `Toggling child node ${target!.dataset['path']}`,
    );
    if (target!.classList.contains('active')) {
      target!.classList.remove('active');
      target!.classList.add('inactive');
    } else {
      target!.classList.add('active');
      target!.classList.remove('inactive');
    }
  }

  protected template(): HTMLTemplateElement {
    const template = document.createElement('template');
    template.innerHTML = `
      <style>
        :host { display: flex; flex-direction: column; flex: 1; overflow: hidden; }
        .folder::before {content: "📁";display: inline-block;}
        .file::before {content: "📄";display: inline-block;}
        .folder > span { cursor: pointer; user-select: none; }
        .tree.active {display: block;}
        .tree.inactive {display: none;}
        #workspace { width: max-content; }
        ul, li { list-style: none; }
      </style>
      <div class="header">
        <button id="upload-folder" title="Load local Workspace">📁+</button>
        <button id="upload-file" title="Add File">📄+</button>
      </div>
      <ul id="workspace" class="tree"></ul>
      <input type="file" id="folder-input" webkitdirectory multiple hidden>
      <input type="file" id="file-input" multiple hidden>
    `;

    return template;
  }
}

customElements.define('cc-file-tree', FileTreeElement);
