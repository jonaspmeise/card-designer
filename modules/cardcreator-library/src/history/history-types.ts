import { CardCreatorDependencies } from '..';

export type HistoryServiceDependencies = Pick<
  CardCreatorDependencies,
  'eventService' | 'logger'
>;
