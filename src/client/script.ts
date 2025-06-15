import { AppState } from "../types/types.js";
import { compile, debounce, initialSvg } from "../utility/utility.js";
import * as XLSX from 'xlsx';
import { Interactivity } from "../interactivity/interactivity.js";
import { compilerEditor } from "../editor/editor.js";

let model: AppState = {
  code: initialSvg,
  url: undefined,
  loadedFiles: [],
  _compiled: initialSvg,
  _target: initialSvg,
  _files: undefined,
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
  Interactivity.registerHandler((files: FileList) => model.loadedFiles = Array.from(files).map(f => f.name), '_files');

  Interactivity.registerHandler((compiled: string) => compilerEditor.dispatch({
    changes: {
      from: 0,
      to: compilerEditor.state.doc.length,
      insert: compiled
    }
  }), '_compiled');

  Interactivity.start();
});