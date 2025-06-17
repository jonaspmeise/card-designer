import { AppState } from "../types/types.js";
import { compile, debounce, initialSvg } from "../utility/utility.js";
import * as XLSX from 'xlsx';
import { Interactivity } from "../interactivity/interactivity.js";
import { compilerEditor } from "../editor/editor.js";
import { isValidUrl } from '../utility/utility.js';

let model: AppState = {
  code: initialSvg,
  datasource: undefined,
  loadedFiles: [],
  _datatype: undefined,
  _compiled: initialSvg,
  _target: initialSvg,
  _files: [],
  _fileMap: new Map(),
  _selectedFile: undefined,
  _cards: []
};

export const update = debounce((value: string, prop: string = 'code') => {
  console.log('Updating', prop, value);
  model[prop] = value;
}, 100);

document.addEventListener('DOMContentLoaded', () => {
  model = Interactivity.register(model);

  window['interactivity'] = Interactivity;
  window['model'] = model;

  Interactivity.registerHandler((code: string) => model._compiled = compile(code), 'code');
  Interactivity.registerHandler((files: AppState['_files']) => {
    model._fileMap.clear();
    
    model.loadedFiles = files!.map(f => {
        model._fileMap.set(f.name, f);

        return f;
      })
      .map(f => f.name)
  }, '_files');
  Interactivity.registerHandler((compiled: AppState['_compiled']) => compilerEditor.dispatch({
    changes: {
      from: 0,
      to: compilerEditor.state.doc.length,
      insert: compiled
    }
  }), '_compiled');
  Interactivity.registerHandler((datasource: Exclude<AppState['datasource'], undefined>) => model._datatype = isValidUrl(model.datasource!)
    ? 'URL'
    : model._fileMap.has(datasource)
      ? 'File'
      : undefined,
  'datasource');

  Interactivity.start();
});