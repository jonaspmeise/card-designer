import { parser as xmlParser } from "@lezer/xml";
import { parser as jsParser } from "@lezer/javascript";
import { LRLanguage } from "@codemirror/language";
import { parseMixed } from '@lezer/common';

const svgjs: RegExp = /{{([\s\S]+?)}}/;

export const svgjsLanguage = LRLanguage.define({
  parser: xmlParser.configure({
    wrap: parseMixed((node, input) => {

      if(node.name !== 'Text') {
        return null;
      }

      const value = input.read(node.from, node.to);
      if(value.trim().length === 0) {
        return null;
      }

      const match = svgjs.exec(value);

      if(match === null || match.length === 0) {
        return null;
      }

      return {
        parser: jsParser,
        overlay: [
          {
            from: node.from + match.index,
            to: node.from + match.index + match[1].length
          }
        ]
      };
    })
  })
});