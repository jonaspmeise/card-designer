/**
 * Core library API providing the public interface for card-creator.
 *
 * This is the main entry point for consumers (CLI, webapp, etc).
 * The library is agnostic to special implementations of external dependencies, such as UI, file system, etc.
 *
 * @module CardCreatorLibrary
 */

import {
  DependableService,
  PopulatedCommand,
} from '../architecture/types';
import { objectsIdentical } from '../cross-cutting-concerns';
import { LoadProjectCommand } from './commands/load-project';
import {
  ProjectData,
  ProjectServiceState,
} from './project-types';
import {
  initProjectData,
  ProjectServiceDependencies,
} from './project-types';

/**
 * Service-class for interactions with anything related to "projects".
 */
export class ProjectService extends DependableService<ProjectServiceDependencies> {
  // A reference to the loaded project data.
  private _state: ProjectServiceState = {
    project: initProjectData(),
    isModified: false,
  };

  constructor(_dependencies: ProjectServiceDependencies) {
    super(_dependencies, _dependencies.logger);
  }

  public data(): Readonly<ProjectData> {
    this._dependencies.logger.debug(
      `Fetching project data...`,
    );

    return this._state.project;
  }

  /**
   * Closes the currently loaded project.
   * This clears up some resources.
   */
  public close(): void {
    this._dependencies.logger.debug(
      `Closing project "${this._state.project.name}"...`,
    );

    // TODO: This should be able to access other clearable services.
    this._dependencies.historyService.clear();

    this._dependencies.eventService.publish({
      type: 'projectClosed',
      data: {},
    });

    this._dependencies.eventService.clear();
  }

  /**
   * Loads a project.
   * If the project is already loaded, nothing happens.
   * If this is the first loaded project, it is loaded.
   * If another project was loaded before, a confirmation dialog (event) is issued.
   * - If confirmed, the new project will load.
   * - If denied, the new project will be cancelled.
   */
  public async load(
    data: ProjectData,
  ): Promise<
    PopulatedCommand<LoadProjectCommand> | undefined
  > {
    if (objectsIdentical(this._state.project, data)) {
      this._dependencies.logger.debug(
        'Identical project data loaded, do nothing...',
      );
      return;
    }

    const command: LoadProjectCommand =
      new LoadProjectCommand(
        {
          prior: { ...this._state },
          next: { project: data, isModified: true },
        },
        this._state,
      );

    if (!this._state.isModified) {
      return this._dependencies.historyService.push(
        command,
      );
    }

    this._dependencies.eventService.publish({
      type: 'dialog',
      data: {
        level: 'question',
        text: `A project "${this._state.project.name}" was already loaded.\nOverwrite it with new project "${data.name}"?`,
        callbacks: {
          Confirm: async () => {
            this._dependencies.logger.info(
              `Overwriting current project "${this._state.project?.name}" with new project "${data.name}"...`,
            );
            this._dependencies.historyService.push(command);
          },
          Cancel: async () => {
            this._dependencies.logger.info(
              `Loading of project "${data.name} cancelled."`,
            );
          },
        },
      },
    });
  }

  public async save(path?: string): Promise<void> {
    this._dependencies.logger.debug(
      `Saving project "${this._state.project.name}"...`,
    );

    const target =
      path ??
      `${this._state.project.name}.cardcreator.json`;
    await this._dependencies.fileProvider.save(
      target,
      new TextEncoder().encode(
        JSON.stringify(this._state.project),
      ),
    );
    this._state.isModified = false;
    this._dependencies.eventService.publish({
      type: 'projectSaved',
      data: {
        path: target,
      },
    });

    this._dependencies.logger.info(
      `Project "${this._state.project.name}" saved.`,
    );
  }

  public isModified(): boolean {
    this._dependencies.logger.debug(
      `Checking if project "${this._state.project.name}" is modified...`,
    );

    return this._state.isModified;
  }

  /**
   * Clear all project state.
   * If changes were done, a dialog is issued.
   * - If confirmed, reset everything.
   * - If cancelled, do nothing.
   * @param force Whether the confirm dialog should be skipped. Reset is always executed then.
   * @returns nothing.
   */
  reset(force: boolean = false): void {
    this._dependencies.logger.debug(
      'Resetting project settings...',
    );

    if (!this._state.isModified || force) {
      this._doReset();
      return;
    }

    this._dependencies.eventService.publish({
      type: 'dialog',
      data: {
        level: 'question',
        text: 'The project was modified. Still reset?',
        callbacks: {
          Confirm: async () => {
            this._doReset();
          },
          Cancel: async () => {
            this._dependencies.logger.info(
              `Project reset was cancelled.`,
            );
          },
        },
      },
    });
  }

  /**
   * Executes a reset.
   */
  private _doReset() {
    this._state.isModified = false;
    this._state.project = initProjectData();

    this._dependencies.logger.info(
      'Project settings were reset.',
    );
    this._dependencies.eventService.publish({
      type: 'projectReset',
      data: {},
    });
  }
}
