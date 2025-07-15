import { App, AppState, DialogOptions, RenderJob, ToastOptions, WorkerRenderJob } from "../types/types.js";
import { applyCardToSvg, byteDecoder, convertToNestedObject, csvToJson, divideArray, extractTemplates, initialSvg, kebapify, loadYaml, openDb, projectFilePattern, saveToSessionDb, simpleHash, templatePattern } from "../utility/utility.js";
import { compiledEditor, sourceEditor } from "../editor/editor.js";
import { isValidUrl } from '../utility/utility.js';
import Alpine from "alpinejs";
import { loadRemoteData } from '../utility/utility.js';
import * as XLSX from 'xlsx';
import { Card } from '../types/types.js';
import { renderJob } from "../functions/render-job.js";
import { render } from "../utility/render.js";

window['Alpine'] = Alpine;

const app: () => App = () => ({
  init() {
    // This should still happen with "this" referencing the Alpine instance.
    this.actions.registerComputedPropertyWatches.bind(this)();

    // Bind the correct reference for all actions.
    Object.entries(this.actions)
      .forEach(([key, func]) => {
        this.actions[key] = (async (...args: any[]) => {
          try {
            return await (func as Function).apply(this, args);
          } catch (e) {
            this.actions.showToast({
              severity: "danger",
              body: `Error occured: ${e}`
            });
          }
        })
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
      templateFunctions: []
    },
    data: {
      cards: Array.from([]),
      isLoading: false,
      selectedCard: undefined,
      datatype: undefined,
      filetype: undefined,
      columns: [] as string[],
      images: new Map(),
      currentShownImage: undefined
    },
    config: {
      editing: {
        index: undefined,
        type: undefined,
        key: '',
        value: ''
      },
      populated: {},
      sorted: []
    },
    jobs: {
      currentJob: undefined,
      rendering: {
        job: undefined,
        elements: []
      }
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
        separator: ', ',
        ignoreRegex: undefined
      },
      json: {},
      xlsx: {
        mainSheet: undefined
      },
      config: {},
      ui: {
        automatic: false
      },
      data: {
        idColumn: undefined
      }
    }
  },
  actions: {
    async compile() {
      const source = this.project.code.source;
      this.cache.code.templateFunctions = extractTemplates(source);

      await this.actions.updatePreview();
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

      // Reload Data automatically whenever this property is manually modified.
      this.$watch('project.settings.csv.separator', (separator: string) => {
        this.actions.reloadDataTable();
      });
      this.$watch('project.settings.csv.ignoreRegex', (separator: string) => {
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
    async updatePreview() {
      // Only inject data of selected card into the code if there are any templates!
      if (this.cache.code.templateFunctions.length > 0) {
        if (this.cache.data.selectedCard === undefined) {
          throw new Error(`You have one or more templates defined that consume a "card".\nPlease select a card for previewing!`);
        }
      }

      let code = await applyCardToSvg(
        this.project.code.source,
        this.cache.code.templateFunctions,
        this.cache.data.selectedCard ?? {},
        this
      );

      this.cache.code.compiled = code;

      this.ui.editors.compiled!.dispatch({
        changes: {
          from: 0,
          to: this.ui.editors.compiled!.state.doc.length,
          insert: this.cache.code.compiled
        }
      });

      const blob = await render(code, this.cache.data.images);

      if (blob.image !== undefined) {
        this.actions.showImageURL(new URL(URL.createObjectURL(blob.image)));
      }
    },
    select(card: Card) {
      this.cache.data.selectedCard = card;

      if (this.project.settings.ui.automatic) {
        this.actions.updatePreview();
      }
    },
    async loadFiles(files: FileList) {
      this.cache.files.fileMap.clear();

      // Check whether a project setting file exists!
      const fileArray = Array.from(files);

      const potentialFiles = fileArray.filter(file => projectFilePattern.test(file.name));

      if (potentialFiles.length > 0) {
        const choice = await this.actions.showDialog<'Load' | 'Cancel'>({
          body: `Found project file <b>"${potentialFiles[0].name}"</b> among the loaded files.<br><br>Load its settings?`,
          title: 'Project File',
          actions: ['Load', 'Cancel']
        });

        if (choice === 'Load') {
          const source = await potentialFiles[0].text();
          const project = JSON.parse(source);

          this.project = Alpine.reactive(project);

          // Init Cache values.
          this.cache.jobs.currentJob = this.project.jobs[0];
          this.actions.updateSourceCode(this.project.code.source, true);
          this.actions.loadConfig(this.project.settings.config);

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

        if (folderName === undefined) {
          folderName = splits[0];
        }

        const fileName = splits.slice(1).join('/');

        this.cache.files.fileMap.set(fileName, f);

        return fileName;
      }).filter(name => {
        // Filter out files that match any blacklist entry!
        return this.project.settings.files.blacklist.find(blacklistEntry => name.indexOf(blacklistEntry) >= 0) === undefined;
      });
    },
    downloadSettings() {
      const settings = JSON.stringify(this.project, null, 2);
      const blob = new Blob([settings], { type: 'application/json' });
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

      if (filters.length === 0) {
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

      // Make non-important toasts disappear after a while.
      if (options.severity !== 'warning' && options.severity !== 'danger') {
        setTimeout(() => this.ui.toasts.splice(
          this.ui.toasts.indexOf(options),
          1
        ), 15000);
      }
    },
    addRenderJob() {
      this.project.jobs.push({
        name: 'New Render Job',
        activate: false,
        filterCards: [], // TODO: Use it!
        group: {
          by: '',
          columnsPerSheet: 10,
          maxElementsPerSheet: 69,
          rowsPerSheet: 7
        },
        targetSize: {
          height: 1050,
          width: 750
        },
        _cardCount: this.cache.data.cards.length // TODO: Make adaptive!
      });
    },
    reloadDataTable() {
      const data = this.cache.files.remoteRawData;

      this.cache.data.cards = (() => {
        if (this.cache.data.filetype === 'JSON') {
          const jsonData: unknown[] = JSON.parse(byteDecoder.decode(data));

          if (!Array.isArray(jsonData)) {
            throw new Error('Loaded JSON is not an array!', jsonData);
          }

          return jsonData;
        } else if (this.cache.data.filetype === 'CSV') {
          const csvData = byteDecoder.decode(data);

          return csvToJson(csvData, this.project.settings.csv);
        } else if (this.cache.data.filetype === 'XLSX') {
          const workbook = XLSX.read(data, { type: 'array' });

          if (this.project.settings.xlsx.mainSheet === undefined && workbook.SheetNames.length > 1) {
            throw new Error(`Found ${workbook.SheetNames.length} Sheets: ${workbook.SheetNames.join(', ')}. Please provide the name of the correct sheet!`);
          }

          const sheetName = this.project.settings.xlsx.mainSheet || workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];

          return XLSX.utils.sheet_to_json(worksheet);
        }

        return [];
      })() as Card[];

      this.cache.data.columns = [...
        this.cache.data.cards.reduce((prev, curr) => {
          Object.keys(curr).forEach(key => prev.add(key));

          return prev;
        }, new Set<string>()).values()
      ];

      if (this.project.settings?.data?.idColumn === undefined) {
        this.project.settings.data.idColumn = this.cache.data.columns[0];
      }
    },
    async loadFile(filename) {
      console.info('Load file', filename);
      const clean = filename.toLowerCase().trim();

      if (clean.endsWith('.yml') || clean.endsWith('.yaml')) {
        const config = loadYaml(await this.cache.files.fileMap.get(filename)!.text());

        // TODO: Handling for overwriting, interacting with strings, etc...
        this.actions.loadConfig({
          ...this.project.settings.config,
          ...config
        });

        this.actions.showToast({
          body: `Loaded a total of ${Object.keys(config).length} entries from "${filename}".`,
          severity: 'success'
        });
      }
    },
    updateSourceCode(source, refreshUI = false) {
      this.project.code.source = source;

      if (refreshUI) {
        this.ui.editors.source!.dispatch({
          changes: {
            from: 0,
            to: this.ui.editors.source!.state.doc.length,
            insert: this.project.code.source
          }
        });
      }

      if (this.project.settings.ui.automatic) {
        this.actions.compile();
      }
    },
    isEditing(index, type) {
      return this.cache.config.editing.index === index && this.cache.config.editing.type === type;
    },

    startEditing(index, type) {
      this.cache.config.editing.index = index;
      this.cache.config.editing.type = type;

      const [key, value] = this.cache.config.sorted[index];

      if (type === 'key') {
        this.cache.config.editing.key = key;
      } else {
        this.cache.config.editing.value = value;
      }
    },

    stopEditing(index, type) {
      let [key, value] = this.cache.config.sorted[index];

      if (type === 'key' && this.cache.config.editing.key !== key) {
        delete this.project.settings.config[key];

        if (!!key && (key as String).length > 0) {
          this.project.settings.config[this.cache.config.editing.key] = value;
        } else {
          console.debug(`Evoking setting "${key}" because it's empty...`)
        }
      } else if (type === 'value') {
        this.project.settings.config[key] = this.cache.config.editing.value;
      }

      this.cache.config.editing.index = undefined;
      this.cache.config.editing.type = undefined;
    },
    async renderJob(job: RenderJob) {
      this.cache.code.templateFunctions = extractTemplates(this.project.code.source);

      renderJob(job, this.cache.data.cards, this.project.code.source, this.cache.code.templateFunctions, this.project.settings.data.idColumn!, this);
    },
    showImageURL(url) {
      const previous = this.cache.data.currentShownImage;

      // Clean up old URL, since we don't need it anymore.
      if (previous !== undefined) {
        URL.revokeObjectURL(previous.toString());
      }

      const img = new Image();
      const canvas = document.getElementById('canvas')! as HTMLCanvasElement;
      const ctx = canvas.getContext('2d')!;

      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.onerror = e => console.error('SVG load error:', e);

      this.cache.data.currentShownImage = url;
      img.src = url.toString();
    },
    loadConfig(config) {
      this.cache.config.populated = convertToNestedObject(config);
      this.cache.config.sorted = Object.entries(config).sort((a, b) => a[0].localeCompare(b[0]));
    }
  }
});

Alpine.data('app', app);

Alpine.start();