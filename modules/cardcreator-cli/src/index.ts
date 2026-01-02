import { CardCreatorLibrary } from 'cardcreator-library';
import { spawnSync } from 'child_process';
import * as fs from 'fs/promises';
import path from 'path';

// Load library and inject dependencies.
// Implementation notes:
// - Search system for an available browser binary (Chrome/Chromium/Edge or Firefox)
// - Create a temporary HTML file embedding the SVG and ask the browser to take a screenshot
// - Read the resulting PNG and return it as Uint8Array

async function resolveExecutable(
  name: string,
): Promise<string | null> {
  try {
    const which =
      process.platform === 'win32' ? 'where' : 'which';
    const res = spawnSync(which, [name], {
      encoding: 'utf8',
    });
    if (res.status === 0 && res.stdout) {
      const first = (res.stdout as string)
        .split(/\r?\n/)
        .find(Boolean);
      if (first) return first.trim();
    }
  } catch (e) {
    // ignore
  }
  return null;
}

async function findBrowser(): Promise<{
  exe: string;
  kind: 'chrome' | 'firefox';
}> {
  const chromeLike = [
    'google-chrome',
    'google-chrome-stable',
    'chrome',
    'chromium',
    'chromium-browser',
    'msedge',
    'edge',
    'microsoft-edge',
  ];
  const firefoxLike = ['firefox'];

  const tryList = async (list: string[]) => {
    for (const name of list) {
      try {
        const resolved =
          (await resolveExecutable(name)) || name;
        const res = spawnSync(resolved, ['--version'], {
          encoding: 'utf8',
        });
        if (
          res.status === 0 &&
          (res.stdout || res.stderr)
        ) {
          return resolved;
        }
      } catch (e) {
        // ignore and continue
      }
    }
    return null;
  };

  const chromeExe = await tryList(chromeLike);
  if (chromeExe) return { exe: chromeExe, kind: 'chrome' };

  const firefoxExe = await tryList(firefoxLike);
  if (firefoxExe)
    return { exe: firefoxExe, kind: 'firefox' };

  throw new Error(
    'No supported headless browser found in PATH (tried Chrome/Chromium/Edge/Firefox)',
  );
}

let puppeteer = await import('puppeteer-core');

const browser = await findBrowser();
const launchOptions: any = {
  executablePath: browser.exe,
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
};

const inst = await puppeteer.launch(launchOptions);

const library: CardCreatorLibrary = new CardCreatorLibrary({
  renderer: {
    render: async (svg: string) => {
      const page = await inst.newPage();
      await page.setViewport({
        // TODO: Image renders should have a size.
        width: 1000,
        height: 1000,
      });
      await page.setContent(
        `<!doctype html>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <style>html,body{margin:0;padding:0;background:transparent}svg{display:block;width:100%;height:100%}</style>
        ${svg}`,
        {
          waitUntil: 'networkidle0',
        },
      );
      const shot = await page.screenshot({
        type: 'png',
        omitBackground: true,
      });

      return new Uint8Array(
        typeof shot === 'string'
          ? Buffer.from(shot, 'base64')
          : (shot as Buffer),
      );
    },
    supports: (format: string) => format === 'png',
  },
  fileProvider: {
    load: async (p: string) => {
      const data = await fs.readFile(p);
      return new Uint8Array(data);
    },
    save: async (p: string, data: Uint8Array) => {
      await fs.mkdir(path.dirname(p), { recursive: true });
      await fs.writeFile(p, data);
    },
  },
});

library.events.on('projectReset', () => {
  inst.close();
});

// TODO: Load parameters based on CLI arguments.
