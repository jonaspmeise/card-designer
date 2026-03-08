/**
 * Project Loader Web Component
 * Detects *.cardcreator.json files and prompts the user to load them as projects.
 */
import { CardcreatorHTMLComponent } from '../cardcreator-component';

export class ProjectLoaderElement extends CardcreatorHTMLComponent {
  constructor() {
    super();
  }

  protected init(): void {
    // Listen for file added events
    this.library.events.on(
      'projectLoaded',
      async (event) => {
        console.error(event);
      },
    );
  }

  protected template(): HTMLTemplateElement {
    const template = document.createElement('template');
    template.innerHTML = `
      <style>
        :host {
          display: contents;
        }
      </style>
    `;

    return template;
  }
}

customElements.define(
  'cc-project-loader',
  ProjectLoaderElement,
);
