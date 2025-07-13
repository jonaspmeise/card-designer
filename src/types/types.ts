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

export type CsvSettings = {
  separator: string,
  ignoreRegex?: string
};

export type WorkerRenderJob = {
  canvas: OffscreenCanvas,
  data: {
    image: ImageBitmap,
    index: number,
    key: string
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

export type Card = Record<string, unknown>;
export type Config = Record<string, unknown>;

export type ProjectSettings = {
  files: {
    blacklist: string[]
  },
  datasource: string | undefined,
  csv: CsvSettings,
  json: {}
  xlsx: {
    mainSheet: string | undefined
  },
  config: Config,
  ui: {
    automatic: boolean
  },
  data: {
    idColumn: string | undefined
  }
};

export type KeyValue = 'key' | 'value';

export type AppCache = {
  code: {
    compiled: string,
    templateFunctions: TemplateFunction[]
  },
  files: {
    fileMap: Map<String, File>,
    remoteRawData: ArrayBuffer | undefined
  },
  data: {
    datatype: DataType | undefined,
    filetype: FileType | undefined,
    selectedCard: Card | undefined,
    cards: Card[],
    isLoading: boolean,
    columns: string[],
    // Map of external image-URLs, which are translated to local data URLs 
    // to circumvent render-errors when external images are referenced
    // "null" is used here as a pseudo-cache entry, that signals that this value was already requested.
    // We only want to cache the values that are used atleast 2 times!
    images: Map<string, string | null>,
    // The blob-url of the current image, which is shown in the preview window. Is empty initially.
    currentShownImage: URL | undefined
  },
  config: {
    populated: Config,
    editing: {
      index: number | undefined,
      type: KeyValue | undefined,
      key: string,
      value: unknown
    },
    sorted: [string, unknown][]
  },
  jobs: {
    currentJob: RenderJob | undefined,
    rendering: {
      job: RenderJob | undefined,
      elements: RenderCardInfo[]
    }
  }
};

/**
 * Represents a information about a single render instance.
 */
export type RenderCardInfo = {
  card: Card,
  warnings: string[],
  errors: string[]
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
  select: (card: Card) => void,
  loadFiles: (files: FileList) => Promise<void>,
  downloadSettings: () => void,
  compile: () => void,
  updateFilteredFiles: () => void,
  showDialog: <OPTIONS extends string>(options: DialogOptions<OPTIONS>) => Promise<OPTIONS>,
  showToast: (options: ToastOptions) => void,
  addRenderJob: () => void,
  reloadDataTable: () => void,
  updatePreview: () => Promise<void>,
  loadFile: (filename: string) => Promise<void>,
  updateSourceCode: (source: string, refreshUI: boolean) => void,
  isEditing: (index: number, type: KeyValue) => boolean,
  startEditing: (index: number, type: KeyValue) => void,
  stopEditing: (index: number, type: KeyValue) => void,
  renderJob: (job: RenderJob) => Promise<void>,
  showImageURL: (url: URL) => void
};