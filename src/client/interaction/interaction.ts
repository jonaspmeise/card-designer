type Binding = {
  target: string,
  element: Element,
  query: Function
};

const IS_PROXY = Symbol("is-proxy");

export class Interaction {
  private data?: any = undefined;
  private bindings: Binding[] = [];
  private prefix = 'i-';

  start = () => {
    // Find all bindings in the document.
    this.bindings = Array.from(document.querySelectorAll('*'))
      .flatMap(e => Array.from(e.attributes)
        .filter(a => a.name.startsWith(this.prefix))
        .map(a => {
          const target = a.name.substring(2);

          return {
            element: e,
            target: target,
            query: new Function('$', `return ${a.value};`)
          };
        })
      );

    // Evaluate all bindings.
    this.bindings.forEach(binding => {
      binding.element.setAttribute(
        binding.target,
        binding.query(this.data)
      );
    });
  };

  public register = <T extends Record<string, unknown>> (data: T): T => {
    this.data = this.createReactive(data);

    return this.data;
  };

  private createReactive = <T extends Record<(string | symbol), unknown>>(obj: T): T => {
    // If the object is already reactive, return it as-is
    if(obj[IS_PROXY]) {
      return obj;
    }

    const handler: ProxyHandler<T> = {
      set: (target, prop, value, receiver) => {
        // If the value is an object and not already reactive, recursively make it reactive
        if(typeof value === 'object' && value !== null && !value[IS_PROXY]) {
          value = this.createReactive(value);
        }

        // Set the property value
        const result = Reflect.set(target, prop, value, receiver);

        // Log or handle the change as needed
        console.log(`Property "${prop.toString()}" was set to`, value);

        return result;
      },
      get: (target, prop, receiver) => {
        let value: any = Reflect.get(target, prop, receiver);

        if(typeof value === 'object' && value !== null && !value[IS_PROXY]) {
          // Overwrite child value with proxy!
          value = this.createReactive(value as Record<string, unknown>);

          console.log('Initialized reflection for property ', prop.toString());
          Reflect.set(target, prop, value, receiver);
        }

        console.log(`Property "${prop.toString()}" was accessed on`, target);

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
}