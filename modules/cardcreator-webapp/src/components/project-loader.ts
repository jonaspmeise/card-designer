/**
 * Project Loader Web Component
 * Detects *.cardcreator.json files and prompts the user to load them as projects.
 */
import { CardcreatorHTMLComponent } from '../cardcreator-component';
import {
  FileInformation,
  ResolvedFile,
} from '../../../cardcreator-library/src/file/file-types';
import { ModalElement } from './modal';

export class ProjectLoaderElement extends CardcreatorHTMLComponent {
  private _modal!: ModalElement;

  constructor() {
    super();
  }

  protected init(): void {
    this._modal = this.shadow.querySelector(
      'cc-modal',
    ) as ModalElement;

    // Listen for file added events
    this.library.events.on('fileAdded', async (event) => {
      const file = event.data.file;

      if (ProjectLoaderElement._isProjectFile(file.path)) {
        console.debug(
          `Detected project file: ${file.path}`,
        );

        await this._promptLoadProject(file);
      }
    });
  }

  /**
   * Checks if the file path matches the *.cardcreator.json pattern.
   * @param path The file path to check
   * @returns True if the file is a cardcreator project file
   */
  private static _isProjectFile(path: string): boolean {
    return path.toLowerCase().endsWith('.cardcreator.json');
  }

  /**
   * Prompts the user to load the project file.
   * @param file The project file to potentially load
   */
  private async _promptLoadProject(
    file: ResolvedFile<FileInformation>,
  ): Promise<void> {
    const fileName =
      file.path.split('/').pop() ?? file.path;

    const confirmed = await this._modal.confirm(
      'Load Project?',
      `A project file "${fileName}" was detected. Do you want to load it?`,
      'Load Project',
      'Cancel',
    );

    if (confirmed) {
      console.debug(
        `User confirmed loading project from: ${file.path}`,
      );

      await this._loadProjectFromFile(file);
    } else {
      console.debug(
        `User cancelled loading project from: ${file.path}`,
      );
    }
  }

  /**
   * Loads the project from the given file.
   * @param file The file to load the project from
   */
  private async _loadProjectFromFile(
    file: ResolvedFile<FileInformation>,
  ): Promise<void> {
    try {
      const content = await file.content();
      const text = new TextDecoder().decode(content);
      const projectData = JSON.parse(text);

      // Validate that it has the minimum required fields
      if (!projectData.name) {
        throw new Error(
          'Invalid project file: missing "name" field',
        );
      }

      projectData._functions = new Map();

      console.debug(
        `Loading project "${projectData.name}" from file...`,
      );

      await this.library.project.load(projectData);

      console.debug(
        `Project "${projectData.name}" loaded successfully.`,
      );
    } catch (error) {
      console.error(
        `Failed to load project from file: ${file.path}`,
        error,
      );

      // Show error modal
      this._modal.confirm(
        'Error Loading Project',
        `Failed to load project: ${error instanceof Error ? error.message : String(error)}`,
        'OK',
        'Close',
      );
    }
  }

  protected template(): HTMLTemplateElement {
    const template = document.createElement('template');
    template.innerHTML = `
      <style>
        :host {
          display: contents;
        }
      </style>
      <cc-modal></cc-modal>
    `;

    return template;
  }
}

customElements.define(
  'cc-project-loader',
  ProjectLoaderElement,
);
