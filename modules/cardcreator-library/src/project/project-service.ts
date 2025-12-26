/**
 * Core library API providing the public interface for card-creator.
 *
 * This is the main entry point for consumers (CLI, webapp, etc).
 * It provides a clean, type-safe API for all library operations.
 *
 * @module CardCreatorLibrary
 */

import { CardCreatorDependencies } from '..';
import { objectsIdentical } from '../cross-cutting-concerns';
import { initProjectData, ProjectData } from './project-types';

/**
 * Service-class for interactions with anything related to "projects".
 */
export class ProjectService {

  // A reference to the loaded project data.
  private _project: ProjectData = initProjectData();
  private _modified: boolean = false;

  constructor(
    private readonly _dependencies: CardCreatorDependencies
  ) {}

  public data(): Readonly<ProjectData> {
    this._dependencies.logger.debug(`Fetching project data...`);

    return this._project;
  }

  /**
   * Loads a project.
   * If the project is already loaded, nothing happens.
   * If this is the first loaded project, it is loaded.
   * If another project was loaded before, a confirmation dialog (event) is issued.
   * - If confirmed, the new project will load.
   * - If denied, the new project will be cancelled.
   */
  public async load(data: ProjectData): Promise<void> {
    if(!this._modified) {
      this._doLoad(data);
      return;
    }

    if(objectsIdentical(this._project, data)) {
      this._dependencies.logger.debug('Identical project data loaded, do nothing...');
      return;
    }

    this._dependencies.eventBus.publish({
      type: 'dialog',
      data: {
        level: 'question',
        text: `A project "${this._project.name}" was already loaded.\nOverwrite it with new project "${data.name}"?`,
        callbacks: {
          Confirm: async () => {
            this._dependencies.logger.info(`Overwriting current project "${this._project?.name}" with new project "${data.name}"...`);
            this._doLoad(data);
          },
          Cancel: async () => {
            this._dependencies.logger.info(`Loading of project "${data.name} cancelled."`);
          }
        }
      }
    });
  }

  /**
   * Loads project data without checking anything.
   * @param data The project data to load.
   */
  private _doLoad(data: ProjectData) {
    this._project = data;
    this._modified = true;

    this._dependencies.logger.info(`Project "${data.name}" loaded.`);
    this._dependencies.eventBus.publish({
      type: 'projectLoaded',
      data
    });
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
    this._dependencies.logger.debug('Resetting project settings...');

    if(!this._modified || force) {
      this._doReset();
      return;
    }

    this._dependencies.eventBus.publish({
      type: 'dialog',
      data: {
        level: 'question',
        text: 'The project was modified. Still reset?',
        callbacks: {
          Confirm: async () => {
            this._doReset();
          },
          Cancel: async () => {
            this._dependencies.logger.info(`Project reset was cancelled.`);
          }
        }
      }
    });
  }

  /**
   * Executes a reset.
   */
  private _doReset() {
    this._modified = false;
    this._project = initProjectData();

    this._dependencies.logger.info('Project settings were reset.');
    this._dependencies.eventBus.publish({
      type: 'projectReset',
      data: {}
    });
  }
}
