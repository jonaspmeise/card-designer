import { AppState, CsvSettings, ProjectSettings, TemplateFunction } from '../types/types.js';
import * as yaml from 'js-yaml';

export const debounce = (func: (...args: any[]) => any, delay: number = 500) => {
  let timeout: NodeJS.Timeout;

  return function (...args: any[]) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
};

export const simpleHash = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return new Uint32Array([hash])[0].toString(36);
};

export const projectFilePattern = /^.+\.cardcreator\.json$/i;
export const templatePattern = /{{\s*\((?<parameters>[^)]*)\)\s*=>\s*(?<lambda>{?\s*)(?<body>.+?)}}(?=(?:[^}]|$))/gms;

export const initialSvg: string = `<svg width="320" height="130" xmlns="http://www.w3.org/2000/svg">
  <rect width="300" height="100" x="10" y="10" style="fill:rgb(0,0,255);stroke-width:3;stroke:red" />
</svg>
`;

export const isValidUrl = (urlString: string): boolean => {
  try {
    new URL(urlString);
    return true;
  } catch (e) {
    return false;
  }
};

export const byteDecoder = new TextDecoder('utf-8');

export const loadRemoteData: (
  url: URL,
  app: AppState
) => Promise<void> = async (
  url: URL,
  app: AppState
) => {
    try {
      const response = await fetch(url);
      const contentType = response.headers.get('Content-Type');

      if (!contentType) {
        throw new Error('Content-Type header not found.');
      }

      console.log(`Found Content-Type on remote data: ${contentType}`);
      app.cache.files.remoteRawData = await response.arrayBuffer();

      if (contentType.includes('application/json')) {
        app.cache.data.filetype = 'JSON';
        app.actions.reloadDataTable();

      } else if (contentType.includes('text/csv')) {
        app.cache.data.filetype = 'CSV';
        app.actions.reloadDataTable();

      } else if (contentType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) {
        app.cache.data.filetype = 'XLSX';
        app.actions.reloadDataTable();
      } else {
        throw new Error(`Unsupported file type: ${contentType}.`);
      }
    } catch (error) {
      app.actions.showToast({
        body: `Data could not be loaded! ${error}`,
        severity: 'danger'
      });
      app.cache.data.filetype = 'Error';
    }
  };

export const csvToJson = (csv: string, settings: CsvSettings): unknown[] => {
  const separator = new RegExp(settings.separator, 'g');

  const lines = csv.split('\n');
  separator.lastIndex = 0;
  const headers = lines[0].split(separator).map(header => header.trim());

  const regex = (settings.ignoreRegex !== undefined && settings.ignoreRegex.trim().length > 0)
    ? new RegExp(settings.ignoreRegex, 'g')
    : undefined;

  return lines.slice(1)
    .filter(line => {
      if(!!regex) {
        return !regex.test(line);
      }
    
      return true;
    })
    .map(line => {
      separator.lastIndex = 0;
      const values = line.split(separator);

      return headers.reduce((obj, header, index) => {
        obj[header] = values[index];
        return obj;
      }, {});
    });
};

export const kebapify: (value: string) => string = (value: string) => value.split(' ').map(part => part.toLowerCase()).join('-');

export const flattenObject = (obj: any, prefix: string = '', result: Record<string, any> = {}): Record<string, any> => {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        flattenObject(obj[key], newKey, result);
      } else {
        result[newKey] = obj[key];
      }
    }
  }
  return result;
}

export const loadYaml = (source: string): Record<string, unknown> => {
  try {
    const parsedYaml = yaml.load(source);

    return flattenObject(parsedYaml);
  } catch (e) {
    console.error(e);
    return {};
  }
};

export const convertToNestedObject = (flatObject: Record<string, unknown>): Record<string, unknown> => {
  const nestedObject: Record<string, any> = {};

  for (const [key, value] of Object.entries(flatObject)) {
    const keys = key.split('.');
    let currentLevel = nestedObject;

    for (let i = 0; i < keys.length; i++) {
      const currentKey = keys[i];

      if (i === keys.length - 1) {
        currentLevel[currentKey] = value;
      } else {
        currentLevel[currentKey] = currentLevel[currentKey] || {};
        currentLevel = currentLevel[currentKey];
      }
    }
  }

  return nestedObject;
};

export const extractTemplates = (source: string): TemplateFunction[] => {
  const templates = Array.from(source.matchAll(templatePattern));

  return templates.map(match => {
    const parameters: string[] = match.groups!.parameters.split(',')
      .map(parameter => parameter.trim())
      .filter(parameter => parameter.length > 0);

    const isLambda = match.groups!?.lambda?.length === 0;
    const body = isLambda
      ? `return ${match.groups!.body}`
      : `{${match.groups!.body}`;

    try {
      const func = new Function(
        ...parameters,
        body
      ) as (...parameters: unknown[]) => string;

      return {
        parameters: parameters,
        func: func,
        source: match[0]
      };
    } catch (e) {
      throw new Error(`Encountered error "${e}" while parsing "${match[0]}"!`);
    }
  });
};

export const divideArray = (array: unknown[], numberOfChunks: number): number[][] => {
  const targets: number[][] = new Array(numberOfChunks).fill(null).map(() => []);

  array.forEach((_, i) => {
    targets[i % numberOfChunks].push(i);
  });

  return targets;
};

export const applyCardToSvg = async (
  source: string,
  templates: TemplateFunction[],
  card: Record<string, unknown>,
  app: AppState
): Promise<string> => {
  // Provide a copy of the Card, because this might be modified for a single render step!
  let code: string = source;

  const current = {
    ...card
  };

  templates.forEach(func => {
    const parameters: unknown[] = func.parameters.map(parameter => {
      if (parameter === 'project') {
        return app.project;
      } else if (parameter === 'card') {
        return current;
      } else if (parameter === 'job') {
        return app.cache.jobs.currentJob;
      } else if (parameter === 'files') {
        return app.cache.files.fileMap
      } else if (parameter === 'config') {
        return app.cache.config.populated;
      } else {
        throw new Error(`Parameter "${parameter}" could not be resolved!
          
        Expected either: "project", "card" or "job".
        `);
      }
    });

    try {
      code = code.replaceAll(func.source, func.func(...parameters));
    } catch (e) {
      throw new Error(`Error on function "${func.source}": ${e}`);
    }
  });

  // Replace all external URLs with local URLs by downloading their files.
  const matches = Array.from(code.matchAll(/<image[^>]+href="(?<link>[^"]+)"[^>]*>/g));

  const links = matches.reduce((prev, curr) => {
    const link = curr.groups!.link.trim();

    if(!app.cache.data.images.has(link)) {
      prev.add(link);
    }

    return prev;
  }, new Set<string>());

  console.log(`Will download...`, links);

  if(links.size === 0) {
    return code;
  }

  await Promise.all(
    [...links.keys()].map(async link => {
      const response = await fetch(link);

      if(!response.ok) {
        console.error(`HTTP error! status: ${response.status}`);
          
        return {
          link: link,
          url: ''
        };
      }

      const blob = await response.blob();

      const url = URL.createObjectURL(blob);
      app.cache.data.images.set(link, url);

      console.log(`Downloaded image "${link}" to local URL "${url}"...`);

      console.debug(`Replacing "${link}" with "${url}"...`);
      code = code.replaceAll(link, url);

      console.warn(code);
    })
  );

  return code;
};

export const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open("SessionImageDB", 1);

    request.onupgradeneeded = () => {
      request.result.createObjectStore("Images");
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  
export const saveToSessionDb = async (
  buffer: ArrayBuffer,
  key: string,
  db?: IDBDatabase
): Promise<void> => {
  db = db ?? await openDb();
  const tx = db.transaction("Images", "readwrite");
  const store = tx.objectStore("Images");

  const blob = new Blob([buffer], { type: "image/png" });
  store.put(blob, key);

  tx.commit();
};

export const download = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  
  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};