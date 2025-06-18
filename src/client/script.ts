import { App } from "../types/types.js";
import { compile, initialSvg } from "../utility/utility.js";
import { compilerEditor, sourceEditor } from "../editor/editor.js";
import { isValidUrl } from '../utility/utility.js';
import Alpine from "alpinejs";
import { loadRemoteData } from '../utility/utility.js';

window['Alpine'] = Alpine;

const app: () => App = () => ({
  files: {
    fileMap: new Map(),
    files: undefined
  },
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
    datasource: undefined,
    loadedFiles: [],
    settings: {
      csv: {
        csvSeparator: ', '
      },
      json: {},
      xlsx: {
        mainSheet: undefined
      }
    }
  },
  update(property: string, value: unknown) {
    console.log('Updating', property, value);
    this[property] = value;
  },

  init() {
    this.registerComputedPropertyWatches();
    this.editors.source = sourceEditor(this as App);
    this.editors.compiled = compilerEditor(this as App);
  },

  registerComputedPropertyWatches() {
    // Register computed property handlers.
    this.$watch('code.source', (source: string) => {
      this.code.compiled = compile(source);
    });

    this.$watch('files.files', (files: FileList) => {
      this.files.fileMap.clear();

      this.project.loadedFiles = Array.from(files).map(f => {
        this.files.fileMap.set(f.name, f);
        return f.name;
      });
    });
    
    this.$watch('code.compiled', (compiled: string) => {
      console.log('WATCH COMPILED');
      this.editors.compiled!.dispatch({
        changes: {
          from: 0,
          to: this.editors.compiled!.state.doc.length,
          insert: compiled
        }
      });
      // TODO: Inject Card data here!
      this.code.target = compiled;
    });

    this.$watch('data.datasource', (datasource: string) => {
      if (datasource !== undefined) {
        this.data.datatype = isValidUrl(datasource)
          ? 'URL'
          : this.files.fileMap.has(datasource)
            ? 'File'
            : 'Error';
      }
    });
  },
  async loadRemoteData() {
    this.data.isLoading = true;
    const cards = await loadRemoteData(new URL(this.project.datasource!), this.project.settings);

    this.data.cards = cards;
    this.data.isLoading = false;
  },
  select(card: unknown) {
    this.data.selectedCard = card;
    this.preview(card);
  },
  preview(card: unknown) {
    console.log('PREVIEWING', card);
  }
});

Alpine.data('app', app);

Alpine.start();

// TODO: Allow blacklist pattern so certain files are ignored when uploaded and dont show! (regex[])