import { AppState, CsvSettings, FileType, ProjectSettings, RenderJob, TemplateFunction } from '../types/types.js';
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

/**
 * Loads data from a remote (either file / URL) and saves it.
 * @param url a string that points to either a file or URL.
 * @param app Context.
 */
export const loadRemoteData: (
  url: string,
  app: AppState
) => Promise<void> = async (
  url: string,
  app: AppState
) => {
    try {
      // Is this a file or an URL?

      let content: ArrayBuffer;
      let contentType: FileType;

      if(isValidUrl(url)) {
        console.debug(`Loading remote data from URL "${url}"...`);
        const response = await fetch(url);

        switch(response.headers.get('Content-Type')) {
          case 'application/json': {
            contentType = 'JSON';
            break;
          };
          case 'text/csv': {
            contentType = 'CSV';
            break;
          };
          case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
            contentType = 'XLSX';
            break;
          };
          default: {
            throw new Error('Content-Type header not found.');
          }
        }

        content = await response.arrayBuffer();
      } else {
        // has to be a file.
        console.debug(`Loading file data from "${url}"...`, app.cache.files.fileMap);
        
        content = await app.cache.files.fileMap.get(url)!.arrayBuffer();
        contentType = url.split('\.').reverse()[0].toUpperCase() as (typeof contentType);
      }

      console.debug(`Loaded a total of ${content.byteLength} bytes from remote "${url}" (${contentType}).`);

      app.cache.data.filetype = contentType;
      app.cache.files.remoteRawData = content;
      app.actions.reloadDataTable();

    } catch (error) {
      app.actions.showToast({
        body: `Data could not be loaded! ${error}`,
        severity: 'danger'
      });
      app.cache.data.filetype = 'Error';
    }
  };

export const csvToJson = (csv: string, settings: CsvSettings): unknown[] => {
  console.debug(`Parsing CSV data...`);
  const separator = new RegExp(settings.separator, 'g');

  const lines = csv.split('\n');
  console.debug(`Read a total of ${lines.length} lines.`);

  separator.lastIndex = 0;
  const headers = lines[0].split(separator).map(header => header.trim());
  console.debug(`Read headers: ${headers.map(h => `"${h}"`).join(' ')}`);

  const regex = (settings.ignoreRegex !== undefined && settings.ignoreRegex.trim().length > 0)
    ? new RegExp(settings.ignoreRegex, 'g')
    : undefined;

  const objects = lines.slice(1)
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

  console.debug(`Read a total of ${objects.length} cards.`, objects);
  
  return objects;
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

export const extractTemplates = (source: string | null): TemplateFunction[] => {
  if (!source) {
    return [];
  }

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

/**
 * Applies a single card object to a template, with extracted template functions.
 * @param source The source of the template.
 * @param templates The extracted template functions from the template.
 * @param card The card information to apply to the template functions.
 * @param app Context.
 * @returns "string", if an actual card was rendered (SVG source code created) and "undefined" if the card was skipped.
 */
export const applyCardToSvg = (
  source: string,
  templates: TemplateFunction[],
  card: Record<string, unknown>,
  app: AppState
): (string | undefined) => {
  // Provide a copy of the Card, because this might be modified for a single render step!
  let code: string = source;

  const current = {
    ...card
  };

  for (let func of templates) {
    console.debug(`Translating template function with parameters ${func.parameters}...`);
    const parameters: unknown[] = func.parameters.map(parameter => {
      if (parameter === 'project') {
        return app.project;
      } else if (parameter === 'card') {
        return current;
      } else if (parameter === 'job') {
        return app.cache.jobs.currentJob;
      } else if (parameter === 'files') {
        return app.cache.files.fileMap;
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
    } catch (e: any) {
      if(e.message === 'skip') {
        console.info(`Rendering of the following card was skipped...`, card);
        return undefined;
      }
      console.error(`Error on function "${func.source}": ${e}`);

      throw e;
    }
  }

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

export const isNested = (obj: Record<string, unknown>) => 
  Object.values(obj)
    .filter(v => typeof v === 'object')
    .length > 0;