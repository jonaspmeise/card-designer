import Alpine from "alpinejs";
import { AppState } from "./types/types.js";
import gsap from "gsap";

document.addEventListener('DOMContentLoaded', () => {
  init();
  Alpine.start();
});

export const init = () => {
  Alpine.store('state', {
    hello: 'world',
    
    increment() {
      console.log('A', this.counter);
        this.counter++;
    },
    decrement() {
      console.log('B', this.counter);
        this.counter--;
    },
    counter: 0
  } as AppState);
};

export const toggleSection = (sectionId: string) => {
  const section = document.querySelector(`.${sectionId}`);
  if(section === null) {
    return;
  }

  if (section.classList.contains('collapsed')) {
    gsap.to(section, { height: 'auto', duration: 0.5 });
    section.classList.remove('collapsed');
  } else {
    gsap.to(section, { height: 0, duration: 0.5, onComplete: () => section.classList.add('collapsed') });
  }
}