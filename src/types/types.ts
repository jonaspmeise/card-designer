export type DataType = 'URL' | 'File';

export type AppState = {
  code: string,
  loadedFiles: string[],
  datasource: string | undefined,
  _datatype: DataType | undefined,
  _compiled: string,
  _target: string,
  _fileMap: Map<String, File>,
  _files: File[] | undefined,
  _selectedFile: File | undefined,
  _cards: []
};