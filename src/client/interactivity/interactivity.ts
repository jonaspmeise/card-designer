import { simpleHash } from "../utility.js";

type BindingType = 'attribute' | 'property';

type BindableElement = Element & {
  bindings: Binding[],
  blueprint: string
};
type Binding = {
  source: string,
  query: (model: any) => string,
  value: string,
  element: BindableElement
};
type PropertyPath = string;
type ChangeHandler = (value: any, prop: string) => void;
type Logger = {
  log: (...data: any[]) => void,
  info: (...data: any[]) => void,
  debug: (...data: any[]) => void,
  warn: (...data: any[]) => void,
  error: (...data: any[]) => void,
}
type InteractivityConfiguration = {
  document: Document,
  logger: Logger
};

const IS_PROXY = Symbol("is-proxy");

export const Interactivity = (function() {
  let loggerPrefix = '[INTERACTIVITY]'
  let doc: Document = document;
  let model: any = undefined;
  let logger: Logger = {
    debug: (message: string, ...data: any[]) => console.debug(`${loggerPrefix}: ${message}`, ...data),
    log: (message: string, ...data: any[]) => console.log(`${loggerPrefix}: ${message}`, ...data),
    info: (message: string, ...data: any[]) => console.info(`${loggerPrefix}: ${message}`, ...data),
    warn: (message: string, ...data: any[]) => console.warn(`${loggerPrefix}: ${message}`, ...data),
    error: (message: string, ...data: any[]) => console.error(`${loggerPrefix}: ${message}`, ...data),
  };
  const bindings: Binding[] = [];
  let currentlyEvaluatedBinding: Binding | undefined;
  const interestMatrix: Map<PropertyPath, (ChangeHandler | Binding)[]> = new Map();

  const update = (binding: Binding) => {
    logger.debug(`Updating binding ${binding}...`);
    const value = binding.query(model);

    if(value === binding.value) {
      return;
    }

    binding.value = value;
    let newHtml: string = binding.element.blueprint;

    binding.element.bindings.forEach((binding) => {
      newHtml = newHtml.replaceAll(
        binding.source,
        binding.value
      );
    });

    logger.debug('Inner HTML is set to', newHtml);
    binding.element.innerHTML = newHtml;
  };

  const registerHandler = (handler: (ChangeHandler | Binding), property: string) => {
    if(!interestMatrix.has(property)) {
      interestMatrix.set(property, [handler]);
    } else {
      interestMatrix.get(property)!.push(handler);
    }
  };

  const createReactive = <T extends Record<(string | symbol), unknown>>(obj: T, parents: string[] = []): T => {
    logger.debug(`Registering proxy ${parents.length == 0 ? '' : `with parents "${parents.join('.')}"`}`);

    // If the object is already reactive, return it as-is
    if(obj[IS_PROXY]) {
      return obj;
    }

    const handler: ProxyHandler<T> = {
      set: (target, prop, value, receiver) => {
        const propertyPath = [...parents, prop.toString()].join('.');

        // If the value is an object and not already reactive, recursively make it reactive
        if(typeof target[prop] === 'object' && value !== null && !value.IS_PROXY) {
          value = createReactive(value, [...parents, prop.toString()]);
        }

        // Set the property value
        const result = Reflect.set(target, prop, value, receiver);

        // Log or handle the change as needed
        logger.log(`Property "${prop.toString()}" was set to`, value);

        // Inform all Bindings that are interested in this change to update.
        (interestMatrix.get(propertyPath) ?? []).forEach(binding => {
          // The Binding can either update a function (handler) or otherwise updates some "binding" attribute.
          if(typeof binding === 'function') {
            (binding as ChangeHandler)(value, propertyPath);
          } else {
            update(binding);
          }
        });

        return result;
      },
      get: (target, prop, receiver) => {
        logger.debug(`Getting "${prop.toString()}".`);
        if(prop == IS_PROXY) {
          return true;
        }

        let value: any = target[prop];
        const p: string = prop.toString();

        if(typeof value === 'object' && value !== null && !value.IS_PROXY) {
          // Overwrite child value with proxy!
          value = createReactive(value as Record<string, unknown>, [...parents, p]);

          logger.log(`Initialized reflection for property "${prop.toString()}".`);
          Reflect.set(target, prop, value, receiver);
        }

        if(currentlyEvaluatedBinding !== undefined) {
          // Record this dependency for our current binding!
          const propertyPath = [...parents, p].join('.');

          registerHandler(currentlyEvaluatedBinding, propertyPath);

          logger.log(`Property "${propertyPath}" is interesting for Binding`, currentlyEvaluatedBinding.source);
        }

        return value;
      }
    };

    // Set secret symbol to mark this as a proxy!
    Object.defineProperty(obj, IS_PROXY, {
      configurable: false,
      enumerable: false,
      value: true
    });
    return new Proxy(obj, handler);
  };

  // Tracks a single element.
  const track = (element: Element) => {
    const snippets = Array.from(element.innerHTML.matchAll(/{{(.+?)}}/g));

    if(snippets === null) {
      return [];
    }
    
    const parsedBindings: Binding[] = snippets.map(snippet => ({
      source: snippet[0],
      query: new Function('model', `return ${snippet[1].trim()}`) as (model: any) => string,
      value: '',
      element: (element as BindableElement)
    }));

    (element as BindableElement).bindings = [
      ...bindings
        .filter(binding => binding.element == element),
      ...parsedBindings
    ];
    (element as BindableElement).blueprint = element.innerHTML;

    logger.info(`Found a total of ${parsedBindings.length} new bindings!`);

    bindings.push(...parsedBindings);

    // Evaluate all new bindings.
    parsedBindings.forEach(binding => {
      // Set current binding to track the relation between DOM-Element <-> Model.
      currentlyEvaluatedBinding = binding;

      // Initialize Binding to update!
      update(binding);

      // Reset binding.
      currentlyEvaluatedBinding = undefined;
    });
  };

  return { 
    start: () => {
      // Find all bindings in the document.
      Array.from(doc.querySelectorAll('*'))
        // TODO: Allow multiple interactive nodes!
        .filter(e => e.attributes.getNamedItem('interactive') !== null)
        .forEach(e => track(e));
    },
    register: <T extends Record<string, unknown>> (data: T): T => {
      if(model !== undefined && model !== data) {
        logger.warn('By registering a new model, the old model will be overwritten!');
      }
      model = createReactive(data);

      return model;
    },
    registerHandler: registerHandler as (handler: ChangeHandler, property: string) => void,
    reset: () => {
      model = undefined;
      interestMatrix.clear();
      bindings.splice(0);
      doc = document;
    },
    configure: (config: Partial<InteractivityConfiguration>) => {
      doc = config.document ?? doc;
      logger = config.logger ?? logger;
    }
  };
})();