import { Facet } from "@codemirror/state";
import { Decoration } from "@codemirror/view";
import { EditorView } from "codemirror";

export const debounce = (func: (...args: any[]) => any, delay: number = 500) => {
  let timeout: NodeJS.Timeout;

  return function(...args: any[]) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
};

export const highlightMustache = (view: EditorView) => {
  const decorations = [];
  const doc = view.state.doc.toString();
  const regex = /{{(.+?)}}/g;

  let match: RegExpExecArray | null = null;
  
  while ((match = regex.exec(doc)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    /*
    decorations.push({
      startSide: start,
      endSide: end,
      spec: 'cm-mustache'
    });
    */
  }
  
  return decorations;
}

const stepSize = Facet.define<number, number>({
  combine: values => values.length ? Math.min(...values) : 2
})