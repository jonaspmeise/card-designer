import { AppState, ProjectSettings, TemplateFunction } from '../types/types.js';
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
export const templatePattern = /{{\s*\((?<parameters>[^)]+)\)\s*=>\s*(?<lambda>{?\s*)(?<body>.+?)}}(?=(?:[^}]|$))/gms;

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

export const csvToJson = (csv: string, settings: ProjectSettings): unknown[] => {
  const separator = new RegExp(settings.csv.separator, 'g');

  const lines = csv.split('\n');
  separator.lastIndex = 0;
  const headers = lines[0].split(separator);

  return lines.slice(1).map(line => {
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
    const parameters: string[] = match.groups!.parameters.split(',').map(parameter => parameter.trim());

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