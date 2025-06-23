import { App, AppActions, AppState, DialogOptions, ToastOptions } from "../types/types.js";
import { compile, initialSvg, kebapify, projectFilePattern } from "../utility/utility.js";
import { compiledEditor, sourceEditor } from "../editor/editor.js";
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

    this.ui.editors.source = sourceEditor(this as App);
    this.ui.editors.compiled = compiledEditor(this as App);

    window['Model'] = this;
  },
  cache: {
    files: {
      fileMap: new Map(),
      remoteRawData: undefined
    },
    code: {
      compiled: initialSvg,
      target: initialSvg
    },
    data: {
      cards: Array.from([]),
      isLoading: false,
      selectedCard: undefined,
      datatype: undefined,
      filetype: undefined
    }
  },
  ui: {
    dialog: {
      show: false,
      title: 'Cardcreator',
      body: 'Found a project file. Load?',
      actions: ['Load', 'Ignore'],
      callback: (pressedButton: string) => console.info('User pressed', pressedButton)
    },
    toasts: [],
    editors: {
      // Initialized lazily!
      compiled: undefined,
      source: undefined
    },
  },
  project: {
    name: 'My Cardcreator Project',
    files: {
      loadedFilteredFiles: []
    },
    jobs: [],
    code: {
      source: initialSvg
    },
    settings: {
      files: {
        blacklist: [],
      },
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
      this.cache.code.compiled = compile(source);
      this.ui.editors.compiled!.dispatch({
        changes: {
          from: 0,
          to: this.ui.editors.compiled!.state.doc.length,
          insert: this.cache.code.compiled
        }
      });
      this.actions.renderPreview();
    },
    registerComputedPropertyWatches() {
      // Register computed property handlers.
      this.$watch('project.settings.datasource', (datasource: string) => {
        if (datasource !== undefined) {
          this.cache.data.datatype = isValidUrl(datasource)
            ? 'URL'
            : this.cache.files.fileMap.has(datasource)
              ? 'File'
              : 'Error';
        }
      });

      this.$watch('project.code.source', (code: string) => {
        this.cache.code.compiled = compile(code, this.cache.data.selectedCard);
      });

      this.$watch('cache.code.compiled', (code: string) => {
        this.cache.code.target = code;
      });
      
      this.$watch('cache.code.target', (code: string) => {
        this.actions.renderPreview();
      });
    },
    async loadRemoteData() {
      this.cache.data.isLoading = true;
      try {
        const cards = await loadRemoteData(
          new URL(this.project.settings.datasource!),
          this.project.settings,
          this as AppState
        );
        this.cache.data.cards = cards;
      } catch (e) {
        console.error(`Error while loading data`, e);
      }

      this.cache.data.isLoading = false;
    },
    select(card: unknown) {
      this.cache.code.compiled = compile(this.project.code.source, card);
      this.cache.data.selectedCard = card;
    },
    renderPreview() {
      console.log('PREVIEWING', this.cache.data.selectedCard);
    },
    async loadFiles(files: FileList) {
      this.cache.files.fileMap.clear();

      // Check whether a project setting file exists!
      const fileArray = Array.from(files);

      const potentialFiles = fileArray.filter(file => projectFilePattern.test(file.name));

      if(potentialFiles.length > 0) {
        const choice = await this.actions.showDialog<'Load' | 'Cancel'>({
          body: `Found project file <b>"${potentialFiles[0].name}"</b> among the loaded files.<br><br>Load its settings?`,
          title: 'Project File',
          actions: ['Load', 'Cancel']
        });

        if(choice === 'Load') {
          const project = JSON.parse(await potentialFiles[0].text());
          this.project = project;

          // Instantly try and load Data!
          await this.actions.loadRemoteData();

          this.actions.showToast({
            body: `Loaded project settings for ${this.project.name}.`,
            severity: "success"
          });
        }
      }

      let folderName: string | undefined = undefined;

      this.project.files.loadedFilteredFiles = fileArray.map(f => {
        // Remove first folder, because it's always identical!
        const splits = f.webkitRelativePath.split('/');

        if(folderName === undefined) {
          folderName = splits[0];
        }

        const fileName = splits.slice(1).join('/');

        this.cache.files.fileMap.set(fileName, f);

        return fileName;
      }).filter(name => {
        // Filter out files that match any blacklist entry!
        return this.project.settings.files.blacklist.find(blacklistEntry => name.indexOf(blacklistEntry) >= 0) === undefined;
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
      console.log(this.project.settings.files.blacklist);

      // Clean up blacklist entries by removing seemingly empty entries!
      const filters = this.project.settings.files.blacklist.filter(filter => filter.trim().length > 0);
      this.project.settings.files.blacklist = filters;

      const fileNames: string[] = Array.from(this.cache.files.fileMap.keys()).map(s => s as string);

      if(filters.length === 0) {
        this.project.files.loadedFilteredFiles = fileNames;
        return;
      }

      this.project.files.loadedFilteredFiles = fileNames
        .filter(name => this.project.settings.files.blacklist.find(blacklistEntry => name.indexOf(blacklistEntry) >= 0) === undefined);
    },
    showDialog(options: DialogOptions<any>) {
      return new Promise((resolve) => {
        const callback = (takenAction: string) => {
          this.ui.dialog.show = false;

          // @ts-expect-error
          resolve(takenAction);
        };

        this.ui.dialog = {
          ...this.ui.dialog,
          ...options,
          callback: callback
        };

        this.ui.dialog.show = true;
    });
    },
    showToast(options: ToastOptions) {
      this.ui.toasts.push(options);
    },
    addRenderJob() {
      this.project.jobs.push({
        name: 'New Render Job',
        activate: false,
        filterCards: [],
        group: undefined,
        targetSize: {
          height: 1050,
          width: 750
        }
      });
    },
  }
});

Alpine.data('app', app);

Alpine.start();