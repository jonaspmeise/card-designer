import { App, AppState, DialogOptions, ToastOptions } from "../types/types.js";
import { byteDecoder, convertToNestedObject, csvToJson, initialSvg, kebapify, loadYaml, projectFilePattern, templatePattern } from "../utility/utility.js";
import { compiledEditor, sourceEditor } from "../editor/editor.js";
import { isValidUrl } from '../utility/utility.js';
import Alpine from "alpinejs";
import { loadRemoteData } from '../utility/utility.js';
import * as XLSX from 'xlsx';
import { Card } from '../types/types.js';

window['Alpine'] = Alpine;

const app: () => App = () => ({
  init() {
    // This should still happen with "this" referencing the Alpine instance.
    this.actions.registerComputedPropertyWatches.bind(this)();

    // Bind the correct reference for all actions.
    Object.entries(this.actions)
      .forEach(([key, func]) => {
        this.actions[key] = ((...args: any[]) => {
          try {
            return (func as Function).apply(this, args);
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
      target: initialSvg,
      templateFunctions: []
    },
    data: {
      cards: Array.from([]),
      isLoading: false,
      selectedCard: undefined,
      datatype: undefined,
      filetype: undefined,
      populatedConfig: {}
    },
    jobs: {
      currentJob: undefined
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
      },
      config: {},
      ui: {
        automatic: false
      }
    }
  },
  actions: {
    compile() {
      const source = this.project.code.source;
      const templates = Array.from(source.matchAll(templatePattern));

      if(templates.length > 0) {
        // Save all template function references for easier future calculation.
        this.cache.code.templateFunctions = templates.map(match => {
          const parameters: string[] = match.groups!.parameters.split(',').map(parameter => parameter.trim());

          const isLambda = match.groups!.lambda === undefined;
          const body = isLambda
            ? `return ${match.groups!.body}`
            : match.groups!.body;

          console.log('Function body (' + isLambda + '):' + match.groups!.parameters + '->' + match.groups!.body);

          try {
            const func = new Function(
              ...parameters,
              body
            ) as (...parameters: unknown[]) => string;

            return {
              parameters: parameters,
              func: func,
              source: match[0]
            };
          } catch (e) {
            throw new Error(`Encountered error "${e}" while parsing "${match[0]}"!`);
          }
        });
      }

      this.actions.updatePreview();
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

      this.$watch('cache.code.compiled', (code: string) => {
        this.cache.code.target = code;
      });
      
      this.$watch('cache.code.target', (_: string) => {
        this.actions.render();
      });

      this.$watch('project.settings.config', (config) => {
        this.cache.data.populatedConfig = convertToNestedObject(config);
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
    updatePreview() {
      // Only inject data of selected card into the code if there are any templates!
      if(this.cache.code.templateFunctions.length > 0) {
        let code = this.project.code.source;

        if(this.cache.data.selectedCard === undefined) {
          throw new Error(`You have one or more templates defined that consume a "card".\nPlease select a card for previewing!`);
        }

        // Provide a copy of the Card, because this might be modified for a single render step!
        const card = {
          ...this.cache.data.selectedCard
        };

        this.cache.code.templateFunctions.forEach(func => {
          const parameters: unknown[] = func.parameters.map(parameter => {
            if(parameter === 'project') {
              return this.project;
            } else if(parameter === 'card') {
              return card;
            } else if(parameter === 'job') {
              return this.cache.jobs.currentJob;
            } else if(parameter === 'files') {
              return this.cache.files.fileMap
            } else if(parameter === 'config') {
              return this.cache.data.populatedConfig;
            } else {
              throw new Error(`Parameter "${parameter}" could not be resolved!
                
              Expected either: "project", "card" or "job".
              `);
            }
          });

          try {
            code = code.replaceAll(func.source, func.func(...parameters));
          } catch (e) {
            throw new Error(`Error on function "${func.source}": ${e}`);
          }
        });

        this.cache.code.compiled = code;
      } else {
        this.cache.code.compiled = this.project.code.source;
      }
    },
    select(card: Card) {
      this.cache.data.selectedCard = card;
      
      if(this.project.settings.ui.automatic) {
        this.actions.updatePreview();
      }
    },
    render() {
      console.log('RENDERING', this.cache.data.selectedCard);
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
          const source = await potentialFiles[0].text();
          const project = JSON.parse(source);

          this.project = Alpine.reactive(project);

          // Init Cache values.
          this.cache.jobs.currentJob = this.project.jobs[0];
          this.actions.updateSourceCode(this.project.code.source, true);

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

      // Make non-important toasts disappear after a while.
      if(options.severity !== 'warning' && options.severity !== 'danger') {
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
    },
    async loadFile(filename) {
      console.info('Load file', filename);
      const clean = filename.toLowerCase().trim();

      if(clean.endsWith('.yml') || clean.endsWith('.yaml')) {
        const config = loadYaml(await this.cache.files.fileMap.get(filename)!.text());
        
        // TODO: Handling for overwriting, interacting with strings, etc...
        this.project.settings.config = {
          ...this.project.settings.config,
          ...config
        };

        this.actions.showToast({
          body: `Loaded a total of ${Object.keys(config).length} entries from "${filename}".`,
          severity: 'success'
        });
      }
    },
    updateSourceCode(source, refreshUI = false) {
      this.project.code.source = source;

      if(refreshUI) {
        this.ui.editors.source!.dispatch({
          changes: {
            from: 0,
            to: this.ui.editors.source!.state.doc.length,
            insert: this.project.code.source
          }
        });
      }

      if(this.project.settings.ui.automatic) {
        this.actions.compile();
      }
    },
  }
});

Alpine.data('app', app);

Alpine.start();