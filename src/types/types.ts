import Alpine from "alpinejs";
import { EditorView } from "codemirror";

export type DataType = 'URL' | 'File' | 'Error';
export type FileType = 'CSV' | 'JSON' | 'XLSX' | 'Error';

export type App = Alpine.AlpineComponent<AppState & AppFunctions>;

export type AppState = {
  source: string,
  compiled: string,
  target: string,
  loadedFiles: string[],
  csvSeparator: string,
  datasource: string | undefined,
  datatype: DataType | undefined,
  filetype: FileType | undefined,
  fileMap: Map<String, File>,
  files: FileList | undefined,
  mainSheet: string | undefined,
  selectedCard: unknown,
  cards: unknown[],
  isLoading: boolean,
  // Both Editors are initialized lazily.
  sourceEditor: EditorView | undefined,
  compiledEditor: EditorView | undefined
};

export type AppFunctions = {
  registerComputedPropertyWatches: () => void,
  select: (card: unknown) => void,
  preview: (card: unknown) => void,
  update: (property: string, value: unknown) => void
};