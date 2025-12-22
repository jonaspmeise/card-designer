/**
 * Core library API providing the public interface for card-creator.
 *
 * This is the main entry point for consumers (CLI, webapp, etc).
 * It provides a clean, type-safe API for all library operations.
 *
 * @module CardCreatorLibrary
 */

import { EventBus } from './events/event-bus';
import { InMemoryAssetCache } from './cache/cache';
import type {
  Logger,
  CardRenderer,
  AssetCache,
} from './types/domain';
import type {
  CardCreatorEvent,
  CardCreatorEventTypeMap,
} from './types/events';
import { FileProvider } from './files/file-provider';

/**
 * Card creator library configuration.
 */
export interface CardCreatorConfig {
  logger: Logger;
  renderer: CardRenderer;
  cache: AssetCache;
  fileProvider: FileProvider;
}

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
 *   console.log(`Project loaded: ${event.projectName}`);
 * });
 *
 * // Execute operations via commands
 * const context = cardCreator.createContext();
 * const result = await cardCreator.execute(
 *   context.loadProject('/path/to/project')
 * );
 * ```
 */

export const NO_OP_LOGGER: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

export class CardCreatorLibrary {
  /** Event bus for managing event subscriptions and publications */
  private readonly eventBus: EventBus;

  /** Configuration */
  private readonly config: CardCreatorConfig;

  /**
   * Create a new CardCreatorLibrary instance.
   *
   * @param config - Library configuration
   * @throws Error if required configuration is missing
   */
  constructor(config: Partial<CardCreatorConfig>) {
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

    this.config = {
      cache: config.cache ?? new InMemoryAssetCache(),
      logger: config.logger ?? NO_OP_LOGGER,
      renderer: config.renderer,
      fileProvider: config.fileProvider,
    };

    // Initialize core components
    this.eventBus = new EventBus(this.config.logger);

    this.config.logger.info(
      'CardCreator library initialized',
    );
  }

  /**
   * Subscribe to multiple events with a conjunction handler.
   * Events are processed once all required event types have been published.
   *
   * @param eventTypes - Array of event types to listen for
   * @param handler - Function to call when all events have been published
   * @returns Unsubscribe function
   *
   * @example
   * ```typescript
   * library.on(['projectLoaded', 'fileOpened'], (projectEvent, fileEvent) => {
   *   console.log('Both events occurred');
   * });
   * ```
   */
  on<E extends keyof CardCreatorEventTypeMap>(
    eventTypes: E | E[],
    handler: (
      event: CardCreatorEventTypeMap[E],
    ) => void | Promise<void>,
  ): () => void {
    return this.eventBus.on(eventTypes, handler);
  }

  /**
   * Subscribe to error events.
   */
  public onError(
    handler: (
      error: Error,
      event?: CardCreatorEvent,
    ) => void,
  ): () => void {
    return this.eventBus.onError(handler);
  }

  /**
   * Top-level accessor: trigger a project load event.
   * Publishes a `projectLoaded` event on the internal event bus.
   */
  public async loadProject(): Promise<void> {
    await this.eventBus.publish({
      type: 'projectLoaded',
      data: {
        projectName: 'Demo Project',
      },
    });
  }

  /**
   * Clear all subscriptions and reset state.
   * Useful for testing and cleanup.
   */
  reset(): void {
    this.eventBus.clear();
    this.config.logger.debug('CardCreator library reset');
  }
}
