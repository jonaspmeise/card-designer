import * as XLSX from 'xlsx';
import { ProjectSettings } from '../types/types.js';
export const debounce = (func: (...args: any[]) => any, delay: number = 500) => {
  let timeout: NodeJS.Timeout;

  return function(...args: any[]) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
};

export const compile = (source: string, card?: unknown): string => {
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
};

export const projectFilePattern = /^.+\.cardcreator\.json$/i;

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

export const loadRemoteData: (
  url: URL,
  settings: ProjectSettings
) => Promise<unknown[]> = async (
  url: URL,
  settings: ProjectSettings
) => {
   try {
    const response = await fetch(url);
    const contentType = response.headers.get('Content-Type');

    if (!contentType) {
      throw new Error('Content-Type header not found.');
    }

    console.log(`Found Content-Type on remote data: ${contentType}`);

    if (contentType.includes('application/json')) {
      const jsonData: unknown[] = await response.json();
      
      if(!Array.isArray(jsonData)) {
        throw new Error('Loaded JSON is not an array!', jsonData);
      }

      return jsonData;
    } else if (contentType.includes('text/csv')) {
      const csvData = await response.text();

      return csvToJson(csvData);
    } else if (contentType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) {
      const arrayBuffer = await response.arrayBuffer();
      
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      if(settings.xlsx.mainSheet === undefined && workbook.SheetNames.length > 1) {
        throw new Error(`Found ${workbook.SheetNames.length} Sheets: ${workbook.SheetNames.join(', ')}. Please provide the name of the correct sheet!`);
      }

      const sheetName = settings.xlsx.mainSheet || workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      return XLSX.utils.sheet_to_json(worksheet);
    } else {
      throw new Error(`Unsupported file type: ${contentType}.`);
    }
  } catch (error) {
    console.error('Error loading data:', error);
  }
  
  console.warn('No Data was loaded...?');

  return [];
};

export const csvToJson = (csv: string): unknown[] => {
  const lines = csv.split('\n');
  const headers = lines[0].split(',');

  return lines.slice(1).map(line => {
    const values = line.split(',');
    return headers.reduce((obj, header, index) => {
        obj[header] = values[index];
        return obj;
    }, {});
  });
};

export const kebapify: (value: string) => string = (value: string) => value.split(' ').map(part => part.toLowerCase()).join('-');