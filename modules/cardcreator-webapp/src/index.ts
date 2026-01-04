/**
 * Card Creator Webapp - Main Entry Point
 */

import { CardCreatorLibrary } from 'cardcreator-library';
import { BrowserFileProvider } from './lib/browser-file-provider';
import { BrowserRenderer } from './lib/browser-renderer';
import { setupLibraryEvents } from './lib/library-events';
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

const library = new CardCreatorLibrary({
  renderer: new BrowserRenderer(),
  fileProvider: new BrowserFileProvider(),
});

// Make library available to components
(window as any).cardCreatorLibrary = library;

// Setup UI
initTaskbar();
initResize();
setupLibraryEvents(library);

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
