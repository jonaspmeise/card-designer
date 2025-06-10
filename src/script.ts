import { AppState } from "./types/types.js";
import { Interaction } from "./client/interaction/interaction.js";
import { EditorView, basicSetup } from "codemirror";
import { xml } from "@codemirror/lang-xml";

let model: AppState = {};
const initialSvg: string = `
  <svg height="40" width="250">
    <text x="5" y="30" fill="red" font-size="35" rotate="30">I love SVG!</text>
  </svg>
`;

document.addEventListener('DOMContentLoaded', () => {
  model = Interaction.register({
    value: 3,
    hello: 'world',
    visible: true,
    nested: {
      property: 123
    }
  });

  window['interaction'] = Interaction;
  window['model'] = model;
  Interaction.start();

  const view = new EditorView({
    parent: document.getElementById('code')!,
    doc: initialSvg,
    extensions: [
      basicSetup,
      xml()
    ]
  });
});

window['toggleSection'] = (button: Element) => {
  const section = button.closest('.view')!;

  section.classList.toggle('collapsible');
};