/**
 * Encapsulates the project data, which can be be loaded from or saved to an external resource.
 */

import { CardCreatorDependencies } from '..';
import { Card } from '../render/render-types';
import { TemplateState } from '../template/template-types';

export type ProjectServiceState = {
  project: ProjectData;
  isModified: boolean;
  loadedCards: Card[];
};

export type ProjectServiceDependencies = Pick<
  CardCreatorDependencies,
  | 'fileProvider'
  | 'eventService'
  | 'logger'
  | 'historyService'
  | 'cardService'
>;

/**
 * Describes the actual state of the entire project.
 * This object is serialized / deserialized and encapsulates the entire settings of the project.
 */
export type ProjectData = TemplateState & {
  // The name of the project.
  name: string;
};

// TODO: This should be a nested / granular object.
export const initProjectData: () => ProjectData = () => ({
  name: 'New Project',
  template: '<svg></svg>',
  _functions: new Map(),
});
