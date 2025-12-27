import { CardCreatorDependencies } from '..';

/**
 * A utility class that models that a service is dependent on a subset of system dependencies.
 */
export abstract class DependableService<
  T extends Partial<CardCreatorDependencies>,
> {
  constructor(protected readonly _dependencies: T) {}
}
