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

export type ProjectData = {
  name: string;
};

export const initProjectData: () => ProjectData = () => ({
  name: 'New Project',
});
