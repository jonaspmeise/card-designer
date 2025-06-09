import Alpine from "alpinejs";
import { AppState } from "./types/types.js";
import gsap from "gsap";
import { Interaction } from "./client/interaction/interaction.js";

let model: AppState = {};

document.addEventListener('DOMContentLoaded', () => {
  const interaction = new Interaction();

  model = interaction.register({
    value: 3,
    hello: 'world',
    visible: true,
    nested: {
      property: 123
    }
  });

  window['interaction'] = interaction;
  window['model'] = model;
  interaction.start();
});