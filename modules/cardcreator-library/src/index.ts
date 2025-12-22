/**
 * Core library API providing the public interface for card-creator.
 *
 * This is the main entry point for consumers (CLI, webapp, etc).
 * It provides a clean, type-safe API for all library operations.
 *
 * @module CardCreatorLibrary
 */

import { EventBus } from './core/event-bus';
import { CommandDispatcher } from './interaction/command-dispatcher';
import { InMemoryAssetCache } from './core/cache';
import type { Logger, CardRenderer, AssetCache } from './types/domain';
import type { CardCreatorEvent, CardCreatorEventTypeMap } from './types/events';

/**
 * Card creator library configuration.
 */
export interface CardCreatorConfig {
  /** Logger instance (optional; uses default if not provided) */
  logger?: Logger;

  /** Card renderer implementation (required) */
  renderer: CardRenderer;

  /** Asset cache implementation (optional; uses InMemoryAssetCache if not provided) */
  cache?: AssetCache;
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

  /** Command dispatcher for executing user commands */
  private readonly dispatcher: CommandDispatcher;

  /** Logger instance */
  private readonly logger: Logger;

  /** Configuration */
  private readonly config: CardCreatorConfig;

  /**
   * Create a new CardCreatorLibrary instance.
   *
   * @param config - Library configuration
   * @throws Error if required configuration is missing
   */
  constructor(config: CardCreatorConfig) {
    if (!config.renderer) {
      throw new Error('Card renderer is required in configuration');
    }

    this.config = {
      ...config,
      cache: config.cache ?? new InMemoryAssetCache(),
    };

    this.logger = config.logger ?? NO_OP_LOGGER;

    // Initialize core components
    this.eventBus = new EventBus(this.logger);
    this.dispatcher = new CommandDispatcher({
      eventBus: this.eventBus,
      renderer: config.renderer,
      cache: this.config.cache!,
      logger: this.logger,
    });

    this.logger.info('CardCreator library initialized');
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
  on(
    eventTypes: keyof CardCreatorEventTypeMap | (keyof CardCreatorEventTypeMap)[],
    handler: (...events: any[]) => void | Promise<void>
  ): () => void {
    return this.eventBus.on(eventTypes, handler);
  }

  /**
   * Subscribe to error events.
   *
   * @param handler - Function to call when an error occurs
   * @returns Unsubscribe function
   */
  onError(handler: (error: Error, event?: CardCreatorEvent) => void): () => void {
    return this.eventBus.onError(handler);
  }

  /**
   * Clear all subscriptions and reset state.
   * Useful for testing and cleanup.
   */
  reset(): void {
    this.eventBus.clear();
    this.logger.debug('CardCreator library reset');
  }
}

// ============================================================================
// PUBLIC EXPORTS
// ============================================================================

export {
  // Types
  type Logger,
  type CardRenderer,
  type AssetCache,
  Asset,
  InMemoryAsset,
  RemoteAsset,
  FileAsset,
  // Cache implementations
  InMemoryAssetCache,
  LRUAssetCache,
  NoOpAssetCache,
  // Event types
  type DomainEvent,
  type CardCreatorEvent,
  type CardCreatorEventTypeMap,
  type JobStartedEvent,
  type JobFinishedEvent,
  type ProjectLoadedEvent,
  type FileOpenedEvent,
  type SourceUpdatedEvent,
  type CardRenderStartedEvent,
  type CardRenderFinishedEvent,
  type AssetLoadedEvent,
  type ErrorEvent,
  // Command types
  type Command,
  type LoadFileCommand,
  type LoadProjectCommand,
  type LoadAssetCommand,
  type UpdateSourceCommand,
  type RenderCardCommand,
  type AnyCommand,
} from './index.shared';
