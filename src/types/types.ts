import Alpine from "alpinejs";
import { EditorView } from "codemirror";

export type DataType = 'URL' | 'File' | 'Error';
export type FileType = 'CSV' | 'JSON' | 'XLSX' | 'Error';

export type App = Alpine.AlpineComponent<AppState & AppFunctions>;

export type Project = {
  settings: ProjectSettings,
  loadedFiles: string[],
  datasource: string | undefined,
};

export type ProjectSettings = {
  csv: {
    csvSeparator: string
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
    fileMap: Map<String, File>,
    files: FileList | undefined,
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
  }
};

export type AppFunctions = {
  registerComputedPropertyWatches: () => void,
  select: (card: unknown) => void,
  preview: (card: unknown) => void,
  update: (property: string, value: unknown) => void
};