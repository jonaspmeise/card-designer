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

export type Size = {
  width: number,
  height: number
};

export type RenderJob = {
  name: string,
  targetSize: Size,
  group: {
    by: RegExp,
    maxElementsPerSheet: number,
    rowsPerSheet: number,
    columnsPerSheet: number
  }
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
  dialog: DialogOptions<any> & {
    show: boolean,
    callback: (option: string) => Promise<string>
  },
  project: Project,
  files: {
    fileMap: Map<String, File>
  },
  toasts: ToastOptions[],
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

export type DialogOptions<OPTIONS extends string> = {
  title: string,
  body: string,
  actions: OPTIONS[]
};

export type ToastSeverity = 'primary' | 'success' | 'danger' | 'warning';
export type ToastOptions = {
  body: string,
  severity: ToastSeverity
};

export type AppActions = {
  registerComputedPropertyWatches: () => void,
  loadRemoteData: () => Promise<void>,
  select: (card: unknown) => void,
  renderPreview: () => void,
  loadFiles: (files: FileList) => Promise<void>,
  downloadSettings: () => void,
  compile: (source: string) => void,
  updateFilteredFiles: () => void,
  showDialog: <OPTIONS extends string>(options: DialogOptions<OPTIONS>) => Promise<OPTIONS>,
  showToast: (options: ToastOptions) => void
};