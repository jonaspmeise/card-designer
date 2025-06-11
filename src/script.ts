import { AppState } from "./types/types.js";
import { Interactivity } from "./client/interactivity/interactivity.js";
import { EditorView, basicSetup } from "codemirror";
import { compile, debounce } from "./client/utility.js";
import { oneDark } from "@codemirror/theme-one-dark";
import { svgjsLanguage } from "./client/svgjs.js";

const initialSvg: string = `<svg width="320" height="130" xmlns="http://www.w3.org/2000/svg">
  <rect width="300" height="100" x="10" y="10" style="fill:rgb(0,0,255);stroke-width:3;stroke:red" />
</svg>
`;

let model: AppState = {
  code: initialSvg,
  compiled: initialSvg,
  files: undefined
};

document.addEventListener('DOMContentLoaded', () => {
  model = Interactivity.register(model);

  window['interactivity'] = Interactivity;
  window['model'] = model;
  Interactivity.registerHandler((code: string) => model.compiled = compile(code), 'code');
  Interactivity.start();

  const update = debounce((code: string, prop: string = 'code') => {
    model[prop] = code;
  }, 100);

  // SOURCE EDITOR
  const sourceEditor = new EditorView({
    parent: document.getElementById('source-editor')!,
    doc: initialSvg,
    extensions: [
      basicSetup,
      svgjsLanguage,
      oneDark,
      EditorView.theme({
        "&": {
          height: "100%"
        },
        ".cm-scroller": {
          overflow: "auto",
          fontFamily: "monospace"
        }
      }),
      EditorView.updateListener.of((e) => {
        if(!e.docChanged) {
          return;
        }
        
        update(e.state.doc.toString(), 'code');
      })
    ]
  });

  // COMPILE EDITOR
  const compilerEditor = new EditorView({
    parent: document.getElementById('compile-editor')!,
    doc: initialSvg,
    extensions: [
      basicSetup,
      svgjsLanguage,
      oneDark,
      EditorView.theme({
        "&": {
          height: "100%"
        },
        ".cm-scroller": {
          overflow: "auto",
          fontFamily: "monospace"
        }
      }),
      EditorView.updateListener.of((e) => {
        if(!e.docChanged) {
          return;
        }
        
        update(e.state.doc.toString(), 'compiler');
      })
    ]
  });
  Interactivity.registerHandler((code: string) => compilerEditor.dispatch({
    changes: {
      from: 0,
      to: compilerEditor.state.doc.length,
      insert: code
    }
  }), 'compiled');

});

window['toggleSection'] = (button: Element) => {
  const section = button.closest('.view')!;

  section.classList.toggle('collapsible');
};