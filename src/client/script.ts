import { App, AppActions, AppState, DialogOptions, ToastOptions } from "../types/types.js";
import { byteDecoder, compile, csvToJson, initialSvg, kebapify, projectFilePattern } from "../utility/utility.js";
import { compiledEditor, sourceEditor } from "../editor/editor.js";
import { isValidUrl } from '../utility/utility.js';
import Alpine from "alpinejs";
import { loadRemoteData } from '../utility/utility.js';
import * as XLSX from 'xlsx';

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

      // Reload Data automatically whenever this property is manually modified.
      this.$watch('project.settings.csv.separator', (separator: string) => {
        this.actions.reloadDataTable();
      });
    },
    async loadRemoteData() {
      this.cache.data.isLoading = true;

      await loadRemoteData(
        new URL(this.project.settings.datasource!),
        this as AppState
      );

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

          this.actions.showToast({
            body: `Loaded project settings for ${this.project.name}.`,
            severity: "success"
          });

          // Instantly try and load Data!
          await this.actions.loadRemoteData();
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
        body: `File "${filename}" has started to download...`,
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

      setTimeout(() => this.ui.toasts.slice(
        this.ui.toasts.indexOf(options),
        1
      ), 10000);
    },
    addRenderJob() {
      this.project.jobs.push({
        name: 'New Render Job',
        activate: false,
        filterCards: [],
        group: {
          by: '',
          columnsPerSheet: 10,
          maxElementsPerSheet: 69,
          rowsPerSheet: 7
        },
        targetSize: {
          height: 1050,
          width: 750
        }
      });
    },
    reloadDataTable() {
      const data = this.cache.files.remoteRawData;
      
      this.cache.data.cards = (() => {
        if(this.cache.data.filetype === 'JSON') {
          const jsonData: unknown[] = JSON.parse(byteDecoder.decode(data));

          if(!Array.isArray(jsonData)) {
            throw new Error('Loaded JSON is not an array!', jsonData);
          }

          return jsonData;
        } else if(this.cache.data.filetype === 'CSV') {
          const csvData = byteDecoder.decode(data);

          return csvToJson(csvData, this.project.settings);
        } else if(this.cache.data.filetype === 'XLSX') {
          const workbook = XLSX.read(data, { type: 'array' });
          
          if(this.project.settings.xlsx.mainSheet === undefined && workbook.SheetNames.length > 1) {
            throw new Error(`Found ${workbook.SheetNames.length} Sheets: ${workbook.SheetNames.join(', ')}. Please provide the name of the correct sheet!`);
          }

          const sheetName = this.project.settings.xlsx.mainSheet || workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          return XLSX.utils.sheet_to_json(worksheet);
        }

        return [];
      })();
    }
  }
});

Alpine.data('app', app);

Alpine.start();