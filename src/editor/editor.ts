import { EditorView, basicSetup } from "codemirror";
import { oneDark } from "@codemirror/theme-one-dark";
import { svgjsLanguage } from "../utility/svgjs.js";
import { update } from "../client/script.js";
import { initialSvg } from "../utility/utility.js";

// SOURCE EDITOR
export const sourceEditor = new EditorView({
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
export const compilerEditor = new EditorView({
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
      
      update(e.state.doc.toString(), '_target');
    })
  ]
});