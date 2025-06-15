export type AppState = {
  code: string,
  loadedFiles: string[],
  _compiled: string,
  _target: string,
  _files: FileList | undefined,
  _selectedFile: File | undefined,
  _cards: []
};