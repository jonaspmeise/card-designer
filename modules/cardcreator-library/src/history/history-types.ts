import {
  CardCreatorDependencies,
  LazyCardCreatorDependencies,
} from '..';

export type HistoryServiceDependencies = Pick<
  LazyCardCreatorDependencies,
  'eventService' | 'logger'
>;
