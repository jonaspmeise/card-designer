/**
 * Project Loader Web Component
 * Detects *.cardcreator.json files and prompts the user to load them as projects.
 */
import { CardcreatorHTMLComponent } from '../cardcreator-component';
import {
  FileInformation,
  ResolvedFile,
} from '../../../cardcreator-library/src/file/file-types';

export class ProjectLoaderElement extends CardcreatorHTMLComponent {
  constructor() {
    super();
  }

  protected init(): void {
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

    const confirmed = await new Promise<boolean>(
      (resolve) => {
        this.showModal({
          title: 'Load Project?',
          message: `A project file "${fileName}" was detected. Do you want to load it?`,
          level: 'question',
          buttons: [
            {
              label: 'Cancel',
              callback: () => resolve(false),
              style: 'secondary',
            },
            {
              label: 'Load Project',
              callback: () => resolve(true),
              style: 'primary',
            },
          ],
        });
      },
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

      // Show error modal (forced – user must acknowledge)
      this.showModal({
        title: 'Error Loading Project',
        message: `Failed to load project: ${error instanceof Error ? error.message : String(error)}`,
        level: 'error',
        buttons: [
          {
            label: 'OK',
            callback: () => {},
            style: 'primary',
          },
        ],
        forced: true,
      });
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
    `;

    return template;
  }
}

customElements.define(
  'cc-project-loader',
  ProjectLoaderElement,
);
