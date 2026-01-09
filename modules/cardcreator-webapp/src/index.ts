/**
 * Card Creator Webapp - Main Entry Point
 */

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
import {
  CARDCREATOR_ATTRIBUTE,
  CardcreatorHTMLComponent,
  LibraryRequestEvent,
} from './components/cardcreator-component';

const library = new CardCreatorLibrary({
  renderer: new BrowserRenderer(),
  fileProvider: new BrowserFileProvider(),
});

// Provide library to components on request
console.debug(`Setting up library provider...`);
window.addEventListener(
  'cardcreator:request-library',
  (event) => {
    console.debug(
      'Providing cardcreator library to component...',
      event.target,
    );

    const e = event as LibraryRequestEvent;
    e.detail.provide(library);
  },
);
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

// Restore UI state from localStorage
const uiState = localStorage.getItem('cc-ui-state');
if (uiState) {
  try {
    const state = JSON.parse(uiState);
    if (state.activePanel) {
      document
        .querySelector(
          `[data-panel="${state.activePanel}"]`,
        )
        ?.dispatchEvent(new Event('click'));
    }
  } catch {
    /* ignore */
  }
}

// Save UI state on unload
window.addEventListener('beforeunload', () => {
  const activeBtn = document.querySelector(
    '.taskbar-btn.active',
  );
  const state = {
    activePanel:
      activeBtn?.getAttribute('data-panel') || null,
  };
  localStorage.setItem(
    'cc-ui-state',
    JSON.stringify(state),
  );
});
