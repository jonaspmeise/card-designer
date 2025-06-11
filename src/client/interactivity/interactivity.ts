type BindingType = 'attribute' | 'property';

type Binding<T, MODEL> = {
  target: string,
  element: Element,
  type: BindingType,
  query: (model: MODEL) => T,
  cache?: T
};
type PropertyPath = string;

const IS_PROXY = Symbol("is-proxy");

export const Interactivity = (function() {
  let model: any = undefined;
  const bindings: Binding<any, any>[] = [];
  const tag = /^\[[^\]]+\]$/;
  let currentlyEvaluatedBinding: Binding<any, any> | undefined;
  const interestMatrix: Map<PropertyPath, Binding<any, any>[]> = new Map();

  const update = (binding: Binding<any, any>) => {
    if(model === undefined) {
      throw Error('No Data has been registered so far. Did you call register() before start()?');
    }

    const value = binding.query(model);

    if(value === binding.cache) {
      return;
    }

    // If the target is an HTML 5 attribute, we set it.
    // Otherwise, it is a property of the element, only available in the browser.
    // We register it by accessing the element directly.
    if(binding.type === 'property') {
      console.debug(`Setting "${binding.target}" as a property to "${value}" on`, binding.element);
      binding.element[binding.target] = value;
    } else {
      console.debug(`Setting "${binding.target}" as an attribute to "${value}" on`, binding.element);
      binding.element.setAttribute(
        binding.target,
        value      
      );
    }

    binding.cache = value;
  };

  const createReactive = <T extends Record<(string | symbol), unknown>>(obj: T, parents: string[] = []): T => {
    console.debug(`Registering proxy ${parents.length == 0 ? '' : `with parents "${parents.join('.')}"`} for `, obj);

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
        console.log(`Property "${prop.toString()}" was set to`, value);

        // Inform all Bindings that are interested in this change to update.
        (interestMatrix.get(propertyPath) ?? []).forEach(binding => {
          console.debug(`Updated binding for attribute "${binding.target}" on Element`, binding.element);
          update(binding);
        });

        return result;
      },
      get: (target, prop, receiver) => {
        if(prop === IS_PROXY) {
          return target[prop];
        }

        let value: any = Reflect.get(target, prop, receiver);
        const p: string = prop.toString();

        if(typeof value === 'object' && value !== null && !value.IS_PROXY) {
          // Overwrite child value with proxy!
          value = createReactive(value as Record<string, unknown>, [...parents, p]);

          console.log('Initialized reflection for property ', prop.toString());
          Reflect.set(target, prop, value, receiver);
        }

        if(currentlyEvaluatedBinding !== undefined) {
          // Record this dependency for our current binding!
          const propertyPath = [...parents, p].join('.');

          if(!interestMatrix.has(propertyPath)) {
            interestMatrix.set(propertyPath, [currentlyEvaluatedBinding]);
          } else {
            interestMatrix.get(propertyPath)!.push(currentlyEvaluatedBinding);
          }

          console.log(`Property "${propertyPath}" is interesting for Binding`, currentlyEvaluatedBinding);
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

  return { 
    start: () => {
      // Find all bindings in the document.
      bindings.push(...Array.from(document.querySelectorAll('*'))
        .flatMap(e => {
          // Mapping "lower-case attributes" to the normal attributes...
          const elementProperties: Map<string, string> = new Map();
          for(let prop in e) {
            elementProperties.set(prop.toLowerCase(), prop);
          }

          return Array.from(e.attributes)
            .filter(a => tag.test(a.name))
            .map(a => {
              // This name is always lowercase!
              const target = a.name.substring(1, a.name.length - 1);

                // This binding targets a property and not an attribute, if:
                // - there exists a property on the element (JS) with that attribute, ignoring lower/upper-case logic
              const bindingType: BindingType = (elementProperties.has(target.toLowerCase())
              ? 'property'
              : 'attribute') as BindingType;

              const resolvedTarget = bindingType === 'attribute' ? target : elementProperties.get(target)!;
              console.debug(`Registering binding of type "${bindingType}" for "${resolvedTarget}" on Element`, e);

              return {
                element: e,
                // If the binding is a property, we only know about it in lower-case.
                // It has to be resolved back to the correct way (e.g. "innerhtml" -> "innerHTML")
                target: resolvedTarget,
                type: bindingType,
                // https://github.com/microsoft/TypeScript/issues/34540
                query: new Function('$', `return ${a.value};`) as ((m: Exclude<typeof model, undefined>) => any),
                interestedIn: new Set<string>()
              };
            });
          }
        ));

      // Evaluate all bindings.
      bindings.forEach(binding => {
        // Set current binding to track the relation between DOM-Element <-> Model.
        currentlyEvaluatedBinding = binding;

        // Initialize Binding to update!
        update(binding);

        // Reset binding.
        currentlyEvaluatedBinding = undefined;
      });
    },
    register: <T extends Record<string, unknown>> (data: T): T => {
      model = createReactive(data);

      return model;
    }
  };
})();