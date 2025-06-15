type BindableElement = Element & {
  bindings: Binding[],
  blueprint: string
};
type Binding = {
  source: string,
  query: (model: any, functions: Record<string, Function>) => string,
  value?: string,
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

const cleanHTML = (html: string) => html
  .trim()
  .replaceAll(/&(?:amp;)?gt;/gi, '>')
  .replaceAll(/&(?:amp;)?lt;/gi, '<');

export const Interactivity = (function() {
  let loggerPrefix = '[INTERACTIVITY]';
  const INTERACTIVITY_REGISTERED_ATTRIBUTE = 'interactivity-registered';
  let registeredElementsCounter = 0;
  let doc: Document = document;
  const eventHandlerTag = /^@/;
  let model: any = undefined;
  let logger: Logger = {
    debug: (message: string, ...data: any[]) => console.debug(`${loggerPrefix}: ${message}`, ...data),
    log: (message: string, ...data: any[]) => console.log(`${loggerPrefix}: ${message}`, ...data),
    info: (message: string, ...data: any[]) => console.info(`${loggerPrefix}: ${message}`, ...data),
    warn: (message: string, ...data: any[]) => console.warn(`${loggerPrefix}: ${message}`, ...data),
    error: (message: string, ...data: any[]) => console.error(`${loggerPrefix}: ${message}`, ...data),
  };
  const bindings: Binding[] = [];
  let currentlyEvaluatedBinding: (Binding | ChangeHandler) | undefined;
  const interestMatrix: Map<PropertyPath, Set<(ChangeHandler | Binding)>> = new Map();
  const utilityFunctions: Record<string, Function> = {};

  const update = (binding: Binding) => {
    logger.debug(`Updating binding "${binding.source}"...`);

    const value = binding.query(model, utilityFunctions);

    if(value === binding.value) {
      return;
    }

    binding.value = value;
    let newHtml: string = binding.element.blueprint;

    // Apply all transformations through bindings to the HTML.
    binding.element.bindings.forEach((binding) => {
      newHtml = newHtml.replaceAll(
        binding.source,
        binding.value!
      );
    });

    logger.debug('Inner HTML is set to', newHtml);
    binding.element.innerHTML = newHtml;
  };

  const registerHandler = (handler: (ChangeHandler | Binding), property: string) => {
    if(!interestMatrix.has(property)) {
      interestMatrix.set(property, new Set([handler]));
    } else {
      interestMatrix.get(property)!.add(handler);
    }
  };

  const createReactive = <T extends Record<(string | symbol), unknown>>(obj: T, parents: string[] = []): T => {
    // If the object is already reactive, return it as-is
    if(obj[IS_PROXY]) {
      return obj;
    }
    
    logger.debug(`Registering proxy ${parents.length == 0 ? '' : `with parents "${parents.join('.')}"`}`);

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
          currentlyEvaluatedBinding = binding;
          
          // The Binding can either update a function (handler) or otherwise updates some "binding" attribute.
          if(typeof binding === 'function') {
            (binding as ChangeHandler)(value, propertyPath);
          } else {
            update(binding);
          }
          
          currentlyEvaluatedBinding = undefined;
        });

        return result;
      },
      get: (target, prop, receiver) => {
        logger.debug(`Getting "${prop.toString()}".`);
        if(prop == IS_PROXY) {
          return true;
        }

        // Early return: This value is already tracked by our current binding.

        let value: any = target[prop];
        const p: string = prop.toString();

        if(typeof value === 'object' && value !== null && !value[IS_PROXY]) {
          // Overwrite child value with proxy!
          value = createReactive(value as Record<string, unknown>, [...parents, p]);

          logger.log(`Initialized proxy for property "${prop.toString()}".`);
          Reflect.set(target, prop, value, receiver);
        }

        if(currentlyEvaluatedBinding !== undefined) {
          // Record this dependency for our current binding!
          const propertyPath = [...parents, p].join('.');

          if(interestMatrix.get(propertyPath)?.has(currentlyEvaluatedBinding)) {
            return value;
          }

          registerHandler(currentlyEvaluatedBinding, propertyPath);

          // TODO: A Binding that is a function should have a shared attribute with a normal property/attribute binding!
          logger.log(`Property "${propertyPath}" is interesting for a Binding!`);
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
    if(element.attributes.getNamedItem('interactive') === null) {
      logger.debug(`Skipping tracking element ${element.id ?? element.innerHTML} because it has no "interactive" HTML tag!`);

      return;
    }

    if(element.attributes.getNamedItem(INTERACTIVITY_REGISTERED_ATTRIBUTE) !== null) {
      logger.debug(`Skipping tracking element ${element.id ?? element.innerHTML} because it already was registered!`);
      return;
    }

    const snippets = Array.from(element.innerHTML.matchAll(/{{(.+?)}}/gs));

    if(snippets === null) {
      return [];
    }
    
    // Processing this element is finished - we add the "interactivity-registered" element to it!
    element.setAttribute(INTERACTIVITY_REGISTERED_ATTRIBUTE, '' + (++registeredElementsCounter));
    
    const parsedBindings: Binding[] = snippets.map(snippet => ({
      source: cleanHTML(snippet[0]),
      query: new Function('model', 'functions', `return ${
        cleanHTML(snippet[1])
      }`) as (model: any) => string,
      value: undefined,
      element: (element as BindableElement)
    }));

    (element as BindableElement).bindings = [
      ...bindings
        .filter(binding => binding.element == element),
      ...parsedBindings
    ];
    (element as BindableElement).blueprint = cleanHTML(element.innerHTML);

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

    // Register event listeners!
    const subnodes = Array.from(element.querySelectorAll('*'));
    
    // "This" element might not even exist anymore, because our DOM was overwritten by the above operations.
    if(element.parentElement !== null) {
      subnodes.push(element);
    }

    logger.debug(`${element.outerHTML} -> Checking a total of ${subnodes.length} sub-nodes for attributes...`);

    subnodes
      .flatMap(e => {
        Array.from(e.attributes)
          .filter(a => eventHandlerTag.test(a.name))
          .forEach(a => {
            const eventType = a.name.substring(1);
            logger.debug(`Registering event listener for event "${eventType}" with function "${a.value}".`);
            const func = new Function('model', 'functions', 'event', `return ${cleanHTML(a.value)};`);

            e.addEventListener(eventType, (event: Event) => {
              func.call(e, model, utilityFunctions, event);
            });
          });
      });
  };

  return { 
    start: () => {
      // Track changes to dom!
      // TODO: Evaluating a {{ }} creates many new elements each iteration. Find a smart way to only update the old nodes!
      const observer = new MutationObserver(mutations => {
        mutations.forEach(record => {
          const newElements: Element[] = Array.from(record.addedNodes)
            .filter(node => node.nodeType === Node.ELEMENT_NODE)
            .map(node => node as Element);
            
          if(newElements.length === 0) {
            return;
          }

          logger.debug(`${newElements.length} new elements were created in the DOM!`);

          newElements.forEach(track);
        });
      });

      observer.observe(doc, {
        childList: true,
        subtree: true
      });
      
      // Find all bindings in the document.
      Array.from(doc.querySelectorAll('[interactive]:not([interactivity-registered])'))
        .forEach(track);
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
      registeredElementsCounter = 0;
      doc = document;
    },
    configure: (config: Partial<InteractivityConfiguration>) => {
      doc = config.document ?? doc;
      logger = config.logger ?? logger;
    },
    registerFunction: (name: string, func: Function) => {
      // TODO: Log Warning if value would be overwritten!
      utilityFunctions[name] = func;
    },
    interestMatrix: interestMatrix
  };
})();