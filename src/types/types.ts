export type AppState = {
  code: string,
  _compiled: string,
  _target: string,
  _files: FileList | undefined,
  _selectedFile: File | undefined
};