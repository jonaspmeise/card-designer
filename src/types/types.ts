import Alpine from "alpinejs";
import { EditorView } from "codemirror";

export type DataType = 'URL' | 'File' | 'Error';
export type FileType = 'CSV' | 'JSON' | 'XLSX' | 'Error';

export type App = Alpine.AlpineComponent<AppState>;

export type Project = {
  name: string,
  settings: ProjectSettings,
  loadedFilteredFiles: string[]
};

export type ProjectSettings = {
  fileBlacklist: string[],
  datasource: string | undefined,
  csv: {
    separator: string
  }
  json: {}
  xlsx: {
    mainSheet: string | undefined
  }
};

export type AppState = {
  code: {
    source: string,
    compiled: string,
    target: string,
  },
  project: Project,
  files: {
    fileMap: Map<String, File>
  },
  data: {
    datatype: DataType | undefined,
    filetype: FileType | undefined,
    selectedCard: unknown,
    cards: unknown[],
    isLoading: boolean,
  }
  // Both Editors are initialized lazily.
  editors: {
    source: EditorView | undefined,
    compiled: EditorView | undefined
  },
  actions: AppActions
};

export type AppActions = {
  registerComputedPropertyWatches: () => void,
  loadRemoteData: () => Promise<void>,
  select: (card: unknown) => void,
  renderPreview: () => void,
  loadFiles: (files: FileList) => Promise<void>,
  downloadSettings: () => void,
  compile: (source: string) => void,
  updateFilteredFiles: () => void
};