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

export const compile = (source: string): string => {
  console.error('COMPILING', source);
  return source;
};