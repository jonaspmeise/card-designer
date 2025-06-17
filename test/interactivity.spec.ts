/// <reference lib="dom" />
import { expect, test, describe, beforeEach, beforeAll } from "bun:test";
import { Interactivity } from '../src/interactivity/interactivity';
import { Window } from 'happy-dom';

const INTERRUPT_EVENT_LOOP = async () => await new Promise((resolve) => setTimeout(resolve, 1));

describe('Interactivity.', () => {
  let model: any;
  let window: Window;
  let document: any;
  
  beforeEach(() => {
    window = new Window();
    document = window.document;

    Interactivity.reset();
    Interactivity.configure({
      document: document
    });
    model = {
      value: 'abc'
    };
  });
  
  test('Mutation Observer works in test.', async () => {
    let mutation: any[] = [];

    const observer = new window.MutationObserver(mutations => {
      mutation.push(...mutations);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    let element = document.createElement('div');
    element.id = 'abc';
    document.body.appendChild(element);
    
    await INTERRUPT_EVENT_LOOP();

    expect(mutation).not.toHaveLength(0);
  });

  test('Alternative implementation for Interactivity.', () => {
    document.body.innerHTML=`<div interactive><div class="{{ model.value }}"></div></div>`

    Interactivity.register(model);
    Interactivity.start();

    expect(document.body.innerHTML).toEqual('<div interactive="" interactivity-registered="1"><div class="abc"></div></div>');
  });

  test('Nested Dom Elements work.', () => {
    // document.body.classList = 
    document.body.innerHTML=`<div interactive><div><div class="{{ model.value }}"></div></div></div>`

    Interactivity.register(model);
    Interactivity.start();

    expect(document.body.innerHTML).toEqual('<div interactive="" interactivity-registered="1"><div><div class="abc"></div></div></div>');
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

    expect(document.body.innerHTML).toEqual(`<div interactive="" interactivity-registered="1">123</div>`);

    model.value = 999;

    expect(document.body.innerHTML).toEqual(`<div interactive="" interactivity-registered="1">999</div>`);
  });

  test('Multi-line bindings are registered correctly.', () => {
    document.body.innerHTML=`<div interactive><div class="{{
      model.value
    }}"></div></div>`

    Interactivity.register(model);
    Interactivity.start();

    expect(document.body.innerHTML).toEqual('<div interactive="" interactivity-registered="1"><div class="abc"></div></div>');
  });  
  test('The symbol ">" is correctly interpreted.', () => {
    model = {
      values: [1, 2, 3]
    }
    document.body.innerHTML=`<div interactive><div class="{{
      model.values.map(i =&gt; i + 1).join('-')
    }}"></div></div>`

    Interactivity.register(model);
    Interactivity.start();

    expect(document.body.innerHTML).toEqual('<div interactive="" interactivity-registered="1"><div class="2-3-4"></div></div>');
  });

  test('Utility methods can be registered and directly called from a bound attribute.', () => {
    document.body.innerHTML=`<div interactive><div class="{{ functions.crazy(model.value) }}"></div></div>`

    Interactivity.register(model);
    Interactivity.registerFunction('crazy', (value: string) => Array.from(value.toUpperCase()).reverse().join(''));
    Interactivity.start();

    expect(document.body.innerHTML).toEqual('<div interactive="" interactivity-registered="1"><div class="CBA"></div></div>');
  });

  test('A custom style for registering event handlers is used.', () => {
    model = {
      value: 0
    };

    document.body.innerHTML=`<div interactive><button id="button" @click="model.value++">{{ model.value }}</button></div>`

    Interactivity.register(model);
    Interactivity.start();

    for(let i = 1; i < 10; i++) {
      document.getElementById('button')!.click();
      expect(document.getElementById('button')!.textContent).toEqual('1');
    }
  });

  test('Nested String templates work.', () => {
    model = {
      values: ['a', 'b', 'c']
    }
    document.body.innerHTML='<div interactive><div class="{{model.values.map((letter, i) => `#${i+1}:${letter}`).join(\' \')}}"></div></div>'

    Interactivity.register(model);
    Interactivity.start();

    expect(document.body.innerHTML).toEqual('<div interactive="" interactivity-registered="1"><div class="#1:a #2:b #3:c"></div></div>');
  });

  test('An initially empty string is handled correctly.', () => {
    model = {
      values: []
    };

    document.body.innerHTML = '<div interactive>{{ model.values.join(\' - \') }}<button id="button" @click="model.values.push(\'x\')">push</button></div>';

    model = Interactivity.register(model);
    Interactivity.start();

    expect(document.body.innerHTML).toEqual(
      '<div interactive="" interactivity-registered="1"><button id="button" @click="model.values.push(\'x\')">push</button></div>'
    );

    document.getElementById('button')!.click();

    expect(document.body.innerHTML).toEqual(
      '<div interactive="" interactivity-registered="1">x<button id="button" @click="model.values.push(\'x\')">push</button></div>'
    );
  });

  test('Spawned elements are automatically registered.', async () => {
    document.body.innerHTML = '<div interactive>{{model.values.map((v, i) => `<button interactive id="value-${i}" @click="model.values[${i}].counter++"></button>`).join(\'\')}}<button interactive id="spawn" @click="model.values.push({counter: 0})">spawn</button></div>';

    model = Interactivity.register({
      values: []
    });
    Interactivity.start();

    expect(document.body.innerHTML).toEqual('<div interactive="" interactivity-registered="1"><button interactive="" id="spawn" @click="model.values.push({counter: 0})">spawn</button></div>');

    document.getElementById('spawn')!.click();
    await INTERRUPT_EVENT_LOOP();

    expect(model.values).toHaveLength(1);

    document.getElementById('value-0')!.click();
    
    expect(model.values[0].counter).toEqual(1);
  });

  test('Bindings that are not evaluated in the first pass are registered once they are passed again.', () => {
    document.body.innerHTML = '<div id="main" interactive>{{model.values.map(v => `${v} (${model.other})`)}}</div>';
    model = Interactivity.register({
      values: [],
      other: 'abc'
    });

    Interactivity.start();
    expect(document.getElementById('main')!.innerHTML).toEqual('');

    model.values = ['test'];
    expect(document.getElementById('main')!.innerHTML).toEqual('test (abc)');

    model.other = 'something else';
    expect(document.getElementById('main')!.innerHTML).toEqual('test (something else)');
  });

  test('Bindings that are dependent on other bindings before they are evaluated the first time eventually work.', () => {
    document.body.innerHTML = '<div id="main" interactive>{{model.values.map(v => `${v} (${model.other ?? \'nothing\'})`)}}</div>';
    model = Interactivity.register({
      values: [],
      other: undefined
    });

    Interactivity.start();
    expect(document.getElementById('main')!.innerHTML).toEqual('');

    model.values = ['test'];
    expect(document.getElementById('main')!.innerHTML).toEqual('test (nothing)');

    model.other = 'something';
    expect(document.getElementById('main')!.innerHTML).toEqual('test (something)');
  });

  test.todo('Handlers can be created and revoked.');

  test.todo('Interaction can be done in the same element it is enabled.', () => {
    model = Interactivity.register({
      value: 'abc'
    });

    document.body.innerHTML = '<div id="main" interactive class="{{model.value}}"></div>';
    Interactivity.start();

    expect(document.body.innerHTML).toEqual(`<div id="main" interactive class="{{model.value}}"></div>`);
  });

  test.todo('Elements are not created new constantly, references on javascript side can be kept.');
  test.todo('Easy Attribute rendering can be done.', () => {
    model = Interactivity.register({
      value: 'abc'
    });

    document.body.innerHTML = '<div id="main" interactive [class]="model.value" [innerHTML]="model.value.toUpperCase()"></div>';
    Interactivity.start();

    expect(document.body.innerHTML).toEqual(`<div id="main" interactive [class]="model.value" class="abc" [innerHTML]="model.value.toUpperCase()">ABC</div>`);
  });

  test('Proxy for Map works.', () => {
    model = Interactivity.register({
      map: new Map()
    });

    document.body.innerHTML = `<div id="main" interactive>{{model.map.has('value') ? model.map.get('value') : 'xd'}}</div>`;

    Interactivity.start();

    expect(document.getElementById('main')!.innerHTML).toEqual('xd');

    model.map.set('value', 'abc');
    expect(document.getElementById('main')!.innerHTML).toEqual('abc');
  });
});