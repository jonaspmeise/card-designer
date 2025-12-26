/**
 * Core library API providing the public interface for card-creator.
 *
 * This is the main entry point for consumers (CLI, webapp, etc).
 * It provides a clean, type-safe API for all library operations.
 *
 * @module CardCreatorLibrary
 */

import { InMemoryAssetCache } from './cache/cache';
import type {
  Logger,
  CardRenderer,
  AssetCache,
} from './types/domain';
import { FileProvider } from './files/file-provider';
import { ProjectService } from './project/project-service';
import { EventBus, ExternalEventBus, InternalEventBus } from './events/events';
import { EventService } from './events/event-service';

/**
 * External dependencies, which can be overwritten with platform-specific adapters.
 */
export interface CardCreatorDependencies {
  logger: Logger;
  renderer: CardRenderer;
  cache: AssetCache;
  fileProvider: FileProvider;
  eventBus: InternalEventBus;
};

/**
 * Core card-creator library API.
 *
 * This class serves as the main entry point for the library, providing:
 * - Event subscription and publishing
 * - Command dispatching for file/project/asset operations
 * - Configuration management
 *
 * @example
 * ```typescript
 * // Initialize the library
 * const cardCreator = new CardCreatorLibrary({
 *   logger: myLogger,
 *   renderer: myRenderer,
 * });
 *
 * // Subscribe to events
 * cardCreator.on('projectLoaded', (event) => {
 *   console.log(`Project loaded: ${event.name}`);
 * });
 *
 * // Execute operations via commands
 * const context = cardCreator.createContext();
 * const result = await cardCreator.execute(
 *   context.load('/path/to/project')
 * );
 * ```
 */

export const NO_OP_LOGGER: Logger = {
  debug: async () => {},
  info: async () => {},
  warn: async () => {},
  error: async () => {},
};

export class CardCreatorLibrary {

  // Loaded external dependencies.
  private readonly dependencies: CardCreatorDependencies;

  /**
   * Create a new CardCreatorLibrary instance.
   *
   * @param config - Library configuration
   * @throws Error if required configuration is missing
   */
  constructor(config: Partial<CardCreatorDependencies>) {
    if (config.renderer === undefined) {
      throw new Error(
        'Card renderer is required in configuration!',
      );
    }

    if (config.fileProvider === undefined) {
      throw new Error(
        'File provider is required in configuration!',
      );
    }

    const logger: Logger = config.logger ?? NO_OP_LOGGER;
    this.dependencies = {
      cache: config.cache ?? new InMemoryAssetCache(),
      logger: logger,
      renderer: config.renderer,
      fileProvider: config.fileProvider,
      eventBus: config.eventBus ?? new EventService(logger)
    };

    // Register services for each concern.
    this.project = new ProjectService(this.dependencies);
    this.events = this.dependencies.eventBus as EventBus;

    this.dependencies.logger.info(
      'CardCreator library initialized',
    );
  };

  public readonly project: Readonly<ProjectService>;
  public readonly events: Readonly<ExternalEventBus>;
}
