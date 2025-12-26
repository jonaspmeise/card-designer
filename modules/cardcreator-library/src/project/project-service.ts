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
import { ProjectData } from '../types/domain';

/**
 * Service-class for interactions with anything related to "projects".
 */
export class ProjectService {

  // A reference to the loaded project data.
  private project?: ProjectData;

  constructor(
    private readonly dependencies: CardCreatorDependencies
  ) {}


  /**
   * Loads a project
   */
  public async load(data: ProjectData): Promise<void> {
    if(this.project === undefined) {
      this.project = data;

      this.dependencies.logger.info(`Project "${data.projectName}" loaded.`);
      await this.dependencies.eventBus.publish({
        type: 'projectLoaded',
        data
      });
      return;
    }

    if(objectsIdentical(this.project, data)) {
      this.dependencies.logger.debug('Identical project data loaded, do nothing...');
      return;
    }

    this.dependencies.eventBus.publish({
      type: 'dialog',
      data: {
        level: 'question',
        text: `A project "${this.project.projectName}" was already loaded.\nOverwrite it with new project "${data.projectName}"?`,
        callbacks: {
          Overwrite: () => {
            this.dependencies.logger.info(`Overwriting current project "${this.project?.projectName}" with new project "${data.projectName}"...`);
            this.project = data;
            this.dependencies.eventBus.publish({
              type: 'projectLoaded',
              data
            });
          },
          Cancel: () => {
            this.dependencies.logger.info(`Loading of project "${data.projectName} cancelled."`);
          }
        }
      }
    });
  }

  /**
   * Clear all subscriptions and reset state.
   * Useful for testing and cleanup.
   */
  reset(): void {
    this.dependencies.eventBus.clear();
    this.dependencies.logger.debug('CardCreator library reset');
  }
}
