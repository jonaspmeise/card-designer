/// <reference lib="dom" />
import { expect, test, describe, beforeEach } from "bun:test";
import { Interactivity } from "../src/client/interactivity/interactivity.js";

const NO_OP_LOGGER = {
  debug: () => {},
  log: () => {},
  info: () => {},
  warn: () => {},
  error: () => {}
};

describe('Interactivity.', () => {
  let model = {
    value: 'abc'
  };

  beforeEach(() => {
    Interactivity.reset();
    model = {
      value: 'abc'
    };
  });

  test('Model can be registered. On reset, data is no longer tracked.', () => {
    model = Interactivity.register(model);

    Interactivity.registerHandler((prop) => {
      throw new Error('Handled was called even though data is no longer tracked!')
    }, 'value');

    Interactivity.reset();

    model.value = 'bcd';
  });

  test('When a model is registered, changes to the DOM given that model are immediately executed.', () => {
    document.body.innerHTML = `<div id="test" [innerHTML]="model.value.toUpperCase()"></div>`;

    Interactivity.configure({
      document: document,
      logger: NO_OP_LOGGER
    });
    Interactivity.register(model);
    Interactivity.start();

    expect(document.getElementById('test')?.innerHTML).toEqual('ABC');
  });
});