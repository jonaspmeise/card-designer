import { CardCreatorDependencies } from '..';

/**
 * The dependencies required by the config service.
 */
export type ConfigServiceDependencies = Pick<
  CardCreatorDependencies,
  'historyService' | 'eventService' | 'logger'
>;

/**
 * The configuration object structure.
 */
export type Config = Record<string, any>;

export type KeyValuePair = [string, unknown];
