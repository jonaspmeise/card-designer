/**
 * Encapsulates the project data, which can be be loaded from or saved to an external resource.
 */

import { CardCreatorDependencies } from '..';

export type ProjectServiceState = {
  project: ProjectData;
  isModified: boolean;
};

export type ProjectServiceDependencies = Pick<
  CardCreatorDependencies,
  | 'fileProvider'
  | 'eventService'
  | 'logger'
  | 'historyService'
>;

/**
 * The data structure representing a project.
 */
export type ProjectData = {
  // The name of the project.
  name: string;
  // The template source used for this project.
  source: string;
};

export const initProjectData: () => ProjectData = () => ({
  name: 'New Project',
  source: '<svg></svg>',
});
