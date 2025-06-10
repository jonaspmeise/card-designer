type Binding<T, MODEL> = {
  target: string,
  element: Element,
  query: (model: MODEL) => T,
  cache?: T
};
type PropertyPath = string;

const IS_PROXY = Symbol("is-proxy");


export const Interaction = (function() {
  let data: any = undefined;
  let bindings: Binding<any, any>[] = [];
  let prefix = 'i-';
  let currentlyEvaluatedBinding: Binding<any, any> | undefined;
  let interestMatrix: Map<PropertyPath, Binding<any, any>[]> = new Map();

  const update = (binding: Binding<any, any>) => {
    const value = binding.query(data);

    if(value === binding.cache) {
      return;
    }

    binding.element.setAttribute(
      binding.target,
      value      
    );
    binding.cache = value;
  };

  const createReactive = <T extends Record<(string | symbol), unknown>>(obj: T, parents: string[] = []): T => {
    // If the object is already reactive, return it as-is
    if(obj[IS_PROXY]) {
      return obj;
    }

    const handler: ProxyHandler<T> = {
      set: (target, prop, value, receiver) => {
        const propertyPath = [...parents, prop.toString()].join('.');

        // If the value is an object and not already reactive, recursively make it reactive
        if(typeof value === 'object' && value !== null && !value[IS_PROXY]) {
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

        if(typeof value === 'object' && value !== null && !value[IS_PROXY]) {
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
        .flatMap(e => Array.from(e.attributes)
          .filter(a => a.name.startsWith(prefix))
          .map(a => {
            const target = a.name.substring(2);

            return {
              element: e,
              target: target,
              // https://github.com/microsoft/TypeScript/issues/34540
              query: new Function('$', `return ${a.value};`) as ((model: Exclude<typeof data, undefined>) => any),
              interestedIn: new Set<string>()
            };
          })
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
      data = createReactive(data);

      return data;
    }
  };
})();