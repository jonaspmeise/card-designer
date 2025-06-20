import { App, AppActions, AppState, DialogOptions, ToastOptions } from "../types/types.js";
import { compile, initialSvg, kebapify, projectFilePattern } from "../utility/utility.js";
import { compilerEditor, sourceEditor } from "../editor/editor.js";
import { isValidUrl } from '../utility/utility.js';
import Alpine from "alpinejs";
import { loadRemoteData } from '../utility/utility.js';

window['Alpine'] = Alpine;

const app: () => App = () => ({
  init() {

    // This should still happen with "this" referencing the Alpine instance.
    this.actions.registerComputedPropertyWatches.bind(this)();

    // Bind the correct reference for all actions.
    Object.entries(this.actions)
      .forEach(([key, func]) => {
        this.actions[key] = func.bind(this)
      });

    this.editors.source = sourceEditor(this as App);
    this.editors.compiled = compilerEditor(this as App);
  },
  files: {
    fileMap: new Map()
  },
  dialog: {
    show: false,
    title: 'Cardcreator',
    body: 'Found a project file. Load?',
    actions: ['Load', 'Ignore'],
    callback: (pressedButton: string) => console.info('User pressed', pressedButton)
  },
  toasts: [],
  code: {
    source: initialSvg,
    compiled: initialSvg,
    target: initialSvg
  },
  data: {
    cards: [],
    isLoading: false,
    selectedCard: undefined,
    datatype: undefined,
    filetype: undefined
  },
  editors: {
    // Initialized lazily!
    compiled: undefined,
    source: undefined
  },
  project: {
    name: 'My Cardcreator Project',
    loadedFilteredFiles: [],
    settings: {
      fileBlacklist: [],
      datasource: undefined,
      csv: {
        separator: ', '
      },
      json: {},
      xlsx: {
        mainSheet: undefined
      }
    }
  },
  actions: {
    compile(source: string) {
      this.code.compiled = compile(source);
      this.editors.compiled!.dispatch({
        changes: {
          from: 0,
          to: this.editors.compiled!.state.doc.length,
          insert: this.code.compiled
        }
      });
      this.actions.renderPreview();
    },
    registerComputedPropertyWatches() {
      // Register computed property handlers.
      this.$watch('project.datasource', (datasource: string) => {
        if (datasource !== undefined) {
          this.data.datatype = isValidUrl(datasource)
            ? 'URL'
            : this.files.fileMap.has(datasource)
              ? 'File'
              : 'Error';
        }
      });

      this.$watch('code.compiled', (code: string) => {
        this.code.target = compile(code, this.data.selectedCard);
      });
      
      this.$watch('code.target', (code: string) => {
        this.actions.renderPreview();
      });
    },
    async loadRemoteData() {
      this.data.isLoading = true;
      try {
        const cards = await loadRemoteData(
          new URL(this.project.settings.datasource!),
          this.project.settings,
          this as AppState
        );
        this.data.cards = cards;
      } catch (e) {
        console.error(`Error while loading data`, e);
      }

      this.data.isLoading = false;
    },
    select(card: unknown) {
      this.code.compiled = compile(this.code.source, card);
      this.data.selectedCard = card;
    },
    renderPreview() {
      console.log('PREVIEWING', this.data.selectedCard);
    },
    async loadFiles(files: FileList) {
      this.files.fileMap.clear();

      // Check whether a project setting file exists!
      const fileArray = Array.from(files);

      const potentialFiles = fileArray.filter(file => projectFilePattern.test(file.name));

      if(potentialFiles.length > 0) {
        this.actions.showDialog<'Load' | 'Cancel'>({
          body: `Found project file <b>"${potentialFiles[0].name}"</b> among the loaded files.<br><br>Load its settings?`,
          title: 'Project File',
          actions: ['Load', 'Cancel'],
          callback: async (action) => {
            if(action === 'Cancel') {
              return;
            }

            const project = JSON.parse(await potentialFiles[0].text());
            this.project = project;

            // Instantly try and load Data!
            await this.actions.loadRemoteData();

            this.actions.showToast({
              body: `Loaded project settings for ${this.project.name}.`,
              severity: "success"
            });
          }
        })
      }

      let folderName: string | undefined = undefined;

      this.project.loadedFilteredFiles = fileArray.map(f => {
        // Remove first folder, because it's always identical!
        const splits = f.webkitRelativePath.split('/');

        if(folderName === undefined) {
          folderName = splits[0];
        }

        const fileName = splits.slice(1).join('/');

        this.files.fileMap.set(fileName, f);

        return fileName;
      }).filter(name => {
        // Filter out files that match any blacklist entry!
        return this.project.settings.fileBlacklist.find(blacklistEntry => name.indexOf(blacklistEntry) >= 0) === undefined;
      });
      
      // TODO: Popup that from that folder a total of {} files have been loaded!
    },
    downloadSettings() {
      const settings = JSON.stringify(this.project, null, 2);
      const blob = new Blob([settings], {type: 'application/json'});
      const url = URL.createObjectURL(blob);

      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      const filename = `${kebapify(this.project.name)}.cardcreator.json`;
      downloadLink.download = filename;
      document.body.appendChild(downloadLink);

      downloadLink.click();

      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(url);

      this.actions.showToast({
        body: `File <b>${filename}</b> has started to download...`,
        severity: "primary"
      });
    },
    updateFilteredFiles() {
      console.log(this.project.settings.fileBlacklist);

      // Clean up blacklist entries by removing seemingly empty entries!
      const filters = this.project.settings.fileBlacklist.filter(filter => filter.trim().length > 0);
      this.project.settings.fileBlacklist = filters;

      const fileNames: string[] = Array.from(this.files.fileMap.keys()).map(s => s as string);

      if(filters.length === 0) {
        this.project.loadedFilteredFiles = fileNames;
        return;
      }

      this.project.loadedFilteredFiles = fileNames
        .filter(name => this.project.settings.fileBlacklist.find(blacklistEntry => name.indexOf(blacklistEntry) >= 0) === undefined);
    },
    showDialog(options: DialogOptions<any>) {
      this.dialog = {
        ...this.dialog,
        ...options,
        callback: (takenAction: string) => {
          this.dialog.show = false;
          options.callback(takenAction);
        }
      };

      this.dialog.show = true;
    },
    showToast(options: ToastOptions) {
      this.toasts.push(options);
    }
  }
});

Alpine.data('app', app);

Alpine.start();