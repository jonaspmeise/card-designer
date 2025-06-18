import { EditorView, basicSetup } from "codemirror";
import { oneDark } from "@codemirror/theme-one-dark";
import { svgjsLanguage } from "../utility/svgjs.js";
import { initialSvg } from "../utility/utility.js";
import { App } from "../types/types.js";

// SOURCE EDITOR
export const sourceEditor = (app: App) => new EditorView({
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
      
      app.update('source', e.state.doc.toString());
    })
  ]
});

// COMPILE EDITOR
export const compilerEditor = (app: App) => new EditorView({
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
      
      app.update('compiled', e.state.doc.toString());
    })
  ]
});