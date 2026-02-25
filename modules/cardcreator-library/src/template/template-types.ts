import { CardCreatorDependencies } from '..';
import { Card } from '../render/render-types';

export interface Template {
  // The raw template.
  source: Readonly<string>;
}

/**
 * The dependencies required by the render service.
 */
export type TemplateServiceDependencies = Pick<
  CardCreatorDependencies,
  | 'historyService'
  | 'eventService'
  | 'logger'
  | 'configService'
  | 'renderService' // we need the render service to issue render previews when the template changes.
>;
