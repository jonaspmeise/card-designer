import Alpine from "alpinejs";
import { EditorView } from "codemirror";

export type DataType = 'URL' | 'File' | 'Error';
export type FileType = 'CSV' | 'JSON' | 'XLSX' | 'Error';

export type App = Alpine.AlpineComponent<AppState>;

export type Project = {
  name: string,
  settings: ProjectSettings,
  jobs: RenderJob[],
  files: {
    loadedFilteredFiles: string[],
  },
  code: {
    source: string
  }
};

export type TemplateFunction = {
  source: string,
  parameters: string[],
  func: (...args: unknown[]) => string
};

export type Size = {
  width: number,
  height: number
};

export type RenderJob = {
  name: string,
  activate: boolean,
  targetSize: Size,
  group: {
    by: string,
    maxElementsPerSheet: number,
    rowsPerSheet: number,
    columnsPerSheet: number
  } | undefined,
  filterCards: RegExp[]
};

export type ProjectSettings = {
  files: {
    blacklist: string[]
  },
  datasource: string | undefined,
  csv: {
    separator: string
  }
  json: {}
  xlsx: {
    mainSheet: string | undefined
  },
  config: Record<string, unknown>,
  ui: {
    automatic: boolean
  }
};

export type AppCache = {
  code: {
    compiled: string,
    target: string,
    templateFunctions: TemplateFunction[]
  },
  files: {
    fileMap: Map<String, File>,
    remoteRawData: ArrayBuffer | undefined
  },
  data: {
    datatype: DataType | undefined,
    filetype: FileType | undefined,
    selectedCard: unknown,
    cards: unknown[],
    isLoading: boolean,
  },
  jobs: {
    currentJob: RenderJob | undefined
  }
};

export type AppUi = {
  dialog: DialogOptions<any> & {
    show: boolean,
    callback: (option: string) => void
  },
  toasts: ToastOptions[],
  // Both Editors are initialized lazily.
  editors: {
    source: EditorView | undefined,
    compiled: EditorView | undefined
  }
}

export type AppState = {
  cache: AppCache
  ui: AppUi,
  project: Project,
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
  render: () => void,
  loadFiles: (files: FileList) => Promise<void>,
  downloadSettings: () => void,
  compile: () => void,
  updateFilteredFiles: () => void,
  showDialog: <OPTIONS extends string>(options: DialogOptions<OPTIONS>) => Promise<OPTIONS>,
  showToast: (options: ToastOptions) => void,
  addRenderJob: () => void,
  reloadDataTable: () => void,
  updatePreview: () => void,
  loadFile: (filename: string) => Promise<void>,
  updateSourceCode: (source: string, refreshUI: boolean) => void
};