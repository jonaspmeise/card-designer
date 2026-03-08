/**
 * Card Creator Webapp - Main Entry Point
 */

declare global {
  interface Window {
    cardcreator: CardCreatorLibrary;
  }
}

import { CardCreatorLibrary } from 'cardcreator-library';
import { BrowserFileProvider } from './lib/browser-file-provider';
import { BrowserRenderer } from './lib/browser-renderer';
import { initTaskbar } from './lib/taskbar';
import { initResize } from './lib/resize';

// Import all web components
import './components/file-tree';
import './components/config';
import './components/history';
import './components/settings';
import './components/render-jobs';
import './components/render-queue';
import './components/editor';
import './components/preview';
import './components/card-table';
import './components/project-loader';
import {
  CARDCREATOR_ATTRIBUTE,
  CardcreatorHTMLComponent,
} from './cardcreator-component';

const library = new CardCreatorLibrary(
  {
    renderer: new BrowserRenderer(),
    fileProvider: new BrowserFileProvider(),
  },
  {
    logger: console,
  },
);

window.cardcreator = library;

console.debug(
  `Triggering all components to request library...`,
);
document
  .querySelectorAll(`[${CARDCREATOR_ATTRIBUTE}="true"]`)
  .forEach((e) => {
    const element = e as CardcreatorHTMLComponent;
    element.provide(library);
  });

// Setup UI
initTaskbar();
initResize();
