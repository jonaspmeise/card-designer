/**
 * Library event listeners - updates UI components on library events.
 */
import type { CardCreatorLibrary } from 'cardcreator-library';

export function setupLibraryEvents(
  library: CardCreatorLibrary,
): void {
  // Listen to library events and dispatch custom DOM events
  // Components will listen to these events on the window object

  library.events.on('projectLoaded', (e: any) => {
    window.dispatchEvent(
      new CustomEvent('cc:project-loaded', { detail: e }),
    );
  });

  library.events.on('cardsLoaded', (e: any) => {
    window.dispatchEvent(
      new CustomEvent('cc:cards-loaded', { detail: e }),
    );
  });

  library.events.on('configChanged', (e: any) => {
    window.dispatchEvent(
      new CustomEvent('cc:config-changed', { detail: e }),
    );
  });

  library.events.on('historyChanged', (e: any) => {
    window.dispatchEvent(
      new CustomEvent('cc:history-changed', { detail: e }),
    );
  });

  library.events.on('previewRendered', (e: any) => {
    window.dispatchEvent(
      new CustomEvent('cc:preview-rendered', { detail: e }),
    );
  });

  library.events.on('renderQueued', (e: any) => {
    window.dispatchEvent(
      new CustomEvent('cc:render-queued', { detail: e }),
    );
  });

  library.events.on('renderComplete', (e: any) => {
    window.dispatchEvent(
      new CustomEvent('cc:render-complete', { detail: e }),
    );
  });

  library.events.on('renderError', (e: any) => {
    window.dispatchEvent(
      new CustomEvent('cc:render-error', { detail: e }),
    );
  });
}
