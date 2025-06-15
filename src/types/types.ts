export type AppState = {
  code: string,
  loadedFiles: string[],
  url: string | undefined,
  _compiled: string,
  _target: string,
  _files: File[],
  _selectedFile: File | undefined,
  _cards: []
};