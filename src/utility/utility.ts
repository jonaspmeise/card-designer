export const debounce = (func: (...args: any[]) => any, delay: number = 500) => {
  let timeout: NodeJS.Timeout;

  return function(...args: any[]) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
};

export const compile = (source: string): string => {
  console.error('COMPILING', source);
  return source;
};

export const simpleHash = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return new Uint32Array([hash])[0].toString(36);
}

export const initialSvg: string = `<svg width="320" height="130" xmlns="http://www.w3.org/2000/svg">
  <rect width="300" height="100" x="10" y="10" style="fill:rgb(0,0,255);stroke-width:3;stroke:red" />
</svg>
`;