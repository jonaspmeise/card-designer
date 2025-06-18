import { App } from "../types/types.js";
import { compile, initialSvg } from "../utility/utility.js";
import { compilerEditor, sourceEditor } from "../editor/editor.js";
import { isValidUrl } from '../utility/utility.js';
import Alpine from "alpinejs";
import { loadRemoteData } from '../utility/utility.js';

window['Alpine'] = Alpine;

const app: () => App = () => ({
  source: initialSvg,
  compiled: initialSvg,
  target: initialSvg,

  selectedCard: undefined,
  cards: [],
  isLoading: false,

  mainSheet: undefined,
  datasource: undefined,
  datatype: undefined,
  fileMap: new Map(),
  loadedFiles: [],
  sourceEditor: undefined,
  compiledEditor: undefined,
  files: undefined,

  update(property: string, value: unknown) {
    console.log('Updating', property, value);
    this[property] = value;
  },

  init() {
    console.log('IS LOADING', this.isLoading);
    this.registerComputedPropertyWatches();
    this.sourceEditor = sourceEditor(this as App);
    this.compiledEditor = compilerEditor(this as App);
  },

  registerComputedPropertyWatches() {
    // Register computed property handlers.
    this.$watch('source', (source: string) => {
      console.log('WATCH SOURCE');
      this.compiled = compile(source);
    });

    this.$watch('files', (files: FileList) => {
      console.log('WATCH FILES');
      this.fileMap.clear();

      this.loadedFiles = Array.from(files).map(f => {
        this.fileMap.set(f.name, f);
        return f.name;
      });
    });
    
    this.$watch('compiled', (compiled: string) => {
      console.log('WATCH COMPILED');
      this.compiledEditor!.dispatch({
        changes: {
          from: 0,
          to: this.compiledEditor!.state.doc.length,
          insert: compiled
        }
      });
      // TODO: Inject Card data here!
      this.target = compiled;
    });

    this.$watch('datasource', (datasource: string) => {
      console.log('WATCH DATASOURCE', datasource);
      if (datasource !== undefined) {
        this.datatype = isValidUrl(datasource)
          ? 'URL'
          : this.fileMap.has(datasource)
            ? 'File'
            : 'Error';
      }
      console.log(this.datatype);
    });
  },
  async loadRemoteData() {
    this.isLoading = true;
    const cards = await loadRemoteData(new URL(this.datasource!), this.mainSheet);

    this.cards = cards;
    this.isLoading = false;
  },
  select(card: unknown) {
    this.selectedCard = card;
    this.preview(card);
  },
  preview(card: unknown) {
    console.log('PREVIEWING', card);
  }
});

Alpine.data('app', app);

Alpine.start();

// TODO: Allow blacklist pattern so certain files are ignored when uploaded and dont show! (regex[])