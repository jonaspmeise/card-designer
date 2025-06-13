type BindingType = 'attribute' | 'property';

type Binding<T, MODEL> = {
  target: string,
  element: Element,
  type: BindingType,
  query: (model: MODEL) => T,
  cache?: T
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
    debug: (data: any[]) => console.debug(`${loggerPrefix}: ${data[0]}`, ...data.splice(1)),
    log: (data: any[]) => console.log(`${loggerPrefix}: ${data[0]}`, ...data.splice(1)),
    info: (data: any[]) => console.info(`${loggerPrefix}: ${data[0]}`, ...data.splice(1)),
    warn: (data: any[]) => console.warn(`${loggerPrefix}: ${data[0]}`, ...data.splice(1)),
    error: (data: any[]) => console.error(`${loggerPrefix}: ${data[0]}`, ...data.splice(1)),
  };
  const bindings: Binding<any, any>[] = [];
  const consumingTag = /^\[[^\]]+\]$/;
  const generatingTag = /^@/;
  let currentlyEvaluatedBinding: Binding<any, any> | undefined;
  const interestMatrix: Map<PropertyPath, (ChangeHandler | Binding<any, any>)[]> = new Map();

  const update = (binding: Binding<any, any>) => {
    if(model === undefined) {
      throw Error('No Data has been registered so far. Did you call register() before start()?');
    }

    const value = binding.query.call(binding.element, model);

    if(value === binding.cache) {
      return;
    }

    // If the target is an HTML 5 attribute, we set it.
    // Otherwise, it is a property of the element, only available in the browser.
    // We register it by accessing the element directly.
    if(binding.type === 'property') {
      logger.debug(`Setting "${binding.target}" as a property to "${value}" on`, binding.element);
      binding.element[binding.target] = value;
    } else {
      logger.debug(`Setting "${binding.target}" as an attribute to "${value}" on`, binding.element);
      binding.element.setAttribute(
        binding.target,
        value      
      );
    }

    binding.cache = value;
  };

  const registerHandler = (handler: (ChangeHandler | Binding<any, any>), property: string) => {
    if(!interestMatrix.has(property)) {
      interestMatrix.set(property, [handler]);
    } else {
      interestMatrix.get(property)!.push(handler);
    }
  };

  const createReactive = <T extends Record<(string | symbol), unknown>>(obj: T, parents: string[] = []): T => {
    logger.debug(`Registering proxy ${parents.length == 0 ? '' : `with parents "${parents.join('.')}"`} for `, obj);

    // If the object is already reactive, return it as-is
    if(obj.IS_PROXY) {
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
            logger.debug(`Updated binding for attribute "${binding.target}" on Element`, binding.element);
            update(binding);
          }
        });

        return result;
      },
      get: (target, prop, receiver) => {
        logger.debug(`Getting "${prop.toString()}" on target:`, target);
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

          logger.log(`Property "${propertyPath}" is interesting for Binding`, currentlyEvaluatedBinding);
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

  const trackElements = (elements: Element[]) => {
    const newBindings: Binding<any, any>[] = elements
      .flatMap(element => {
        const elementProperties = new Map<string, string>();

        let obj = element;
        do {
          // Get all properties of the current object in the prototype chain
          Object.getOwnPropertyNames(obj).forEach(prop => elementProperties.set(prop.toLowerCase(), prop));
        } while (obj = Object.getPrototypeOf(obj));
          
        // Mapping "lower-case attributes" to the normal attributes...
        for(let prop in element) {
          elementProperties.set(prop.toLowerCase(), prop);
        }

        return Array.from(element.attributes)
          .filter(a => consumingTag.test(a.name))
          .map(a => {
            // This name is always lowercase!
            const target = a.name.substring(1, a.name.length - 1);

              // This binding targets a property and not an attribute, if:
              // - there exists a property on the element (JS) with that attribute, ignoring lower/upper-case logic
            const bindingType: BindingType = (elementProperties.has(target.toLowerCase())
            ? 'property'
            : 'attribute') as BindingType;

            console.error(elementProperties, target.toLowerCase());

            const resolvedTarget = bindingType === 'attribute' ? target : elementProperties.get(target)!;
            logger.debug(`Registering binding of type "${bindingType}" for "${resolvedTarget}" on Element`, element);

            const self = element.attributes.getNamedItem('$');
            let func: ((m: Exclude<typeof model, undefined>) => any);

            if(self !== null) {
              // Register all subtypes.
              func = () => {};
            } else {
              func = new Function('model', `return ${a.value};`) as typeof func;
            }

            return {
              element: element,
              // If the binding is a property, we only know about it in lower-case.
              // It has to be resolved back to the correct way (e.g. "innerhtml" -> "innerHTML")
              target: resolvedTarget,
              type: bindingType,
              // https://github.com/microsoft/TypeScript/issues/34540
              query: func,
              interestedIn: new Set<string>()
            };
          });
      });

    bindings.push(...newBindings);

    // Evaluate all new bindings.
    newBindings.forEach(binding => {
      // Set current binding to track the relation between DOM-Element <-> Model.
      currentlyEvaluatedBinding = binding;

      // Initialize Binding to update!
      update(binding);

      // Reset binding.
      currentlyEvaluatedBinding = undefined;
    });

    // Register event listeners!
    elements
      .flatMap(e => {
        Array.from(e.attributes)
          .filter(a => generatingTag.test(a.name))
          .forEach(a => {
            const eventType = a.name.substring(1);
            const func = new Function('model', 'e', a.value);
            logger.debug(`Registering event listener for event "${eventType}" on element:`, e);

            e.addEventListener(eventType, (event: Event) => {
              func.call(e, model, event);
            });
          });
      });
  };

  return { 
    start: () => {
      // Find all bindings in the document.
      trackElements(Array.from(doc.querySelectorAll('*')));

      const observer = new MutationObserver(mutations => {
        mutations.forEach(record => {
          const newElements: Element[] = Array.from(record.addedNodes)
            .filter(node => node.nodeType === Node.ELEMENT_NODE)
            .map(node => node as Element);
            
          if(newElements.length === 0) {
            return;
          }

          logger.debug(`Checking, whether ${newElements.length} elements need to be tracked:`, ...newElements);

          trackElements(newElements);
        });
      });

      observer.observe(doc.body, {
        childList: true,
        subtree: true
      });
    },
    register: <T extends Record<string, unknown>> (data: T): T => {
      // TODO: Issue Warning if data is not undefined, since it will be overwritten!
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
    configure: (config: InteractivityConfiguration) => {
      doc = config.document ?? doc;
      logger = config.logger ?? console;
    }
  };
})();