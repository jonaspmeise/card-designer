/// <reference lib="dom" />
import { expect, test, describe, beforeEach } from "bun:test";
import { Interactivity } from "../src/client/interactivity/interactivity.js";

const timeout = (delay: number, done: (err: string) => void) => {
  setTimeout(() => {
    done('Timeout!');
  }, delay);
}
const NO_OP_LOGGER = {
  debug: () => {},
  log: () => {},
  info: () => {},
  warn: () => {},
  error: () => {}
};

describe('Interactivity.', () => {
  let model: any;

  beforeEach(() => {
    Interactivity.reset();
    model = {
      value: 'abc'
    };
    document.body.innerHTML = '';
  });
  
  test('Alternative implementation for Interactivity.', () => {
    // document.body.classList = 
    document.body.innerHTML=`<div interactive><div class="{{ model.value }}"></div></div>`

    Interactivity.register(model);
    Interactivity.start();

    expect(document.body.innerHTML).toEqual('<div interactive=""><div class="abc"></div></div>');
  });

  test('Nested Dom Elements work.', () => {
    // document.body.classList = 
    document.body.innerHTML=`<div interactive><div><div class="{{ model.value }}"></div></div></div>`

    Interactivity.register(model);
    Interactivity.start();

    expect(document.body.innerHTML).toEqual('<div interactive=""><div><div class="abc"></div></div></div>');
  });

  test('Already existing elements should not be re-created, because it messes with hooks set in javascript.', () => {
    let clickCounter = 0;

    document.body.innerHTML=`<div interactive><div class="{{ model.value }}"></div></div><button id="button">click</button>`;
    document.getElementById('button')!.addEventListener('click', () => clickCounter++);
    
    Interactivity.register(model);
    Interactivity.start();

    document.getElementById('button')!.click();

    expect(clickCounter).toEqual(1);
  });

  test('Bindings work on an object.', () => {
    document.body.innerHTML = `<div interactive>{{ model.value }}</div>`;

    let model = Interactivity.register({
      value: 123
    });
    Interactivity.start();

    expect(document.body.innerHTML).toEqual(`<div interactive="">123</div>`);

    model.value = 999;

    expect(document.body.innerHTML).toEqual(`<div interactive="">999</div>`);
  });
});