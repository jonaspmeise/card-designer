import { CardCreatorDependencies } from '..';

/**
 * The dependencies required by the render service.
 */
export type CardServiceDependencies = Pick<
  CardCreatorDependencies,
  'historyService' | 'eventService' | 'logger'
>;
