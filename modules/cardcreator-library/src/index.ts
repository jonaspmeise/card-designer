/**
 * Core library API providing the public interface for card-creator.
 *
 * This is the main entry point for consumers (CLI, webapp, etc).
 * It provides a clean, type-safe API for all library operations.
 *
 * @module CardCreatorLibrary
 */

import { EventBus } from './core/event-bus';
import { LoggerRegistry } from './core/logger-registry';
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

    // Set up logger if provided
    if (config.logger) {
      LoggerRegistry.setLogger(config.logger);
    }
    this.logger = LoggerRegistry.getLogger();

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
    eventTypes: (keyof CardCreatorEventTypeMap)[],
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
   * Execute a command.
   *
   * Commands are the primary way users interact with the library.
   * They encapsulate operations like loading files, rendering cards, etc.
   *
   * @param command - The command to execute
   * @returns Promise resolving to the command result
   * @throws Error if command execution fails
   *
   * @example
   * ```typescript
   * const result = await cardCreator.execute({
   *   type: 'loadFile',
   *   id: uuidv4(),
   *   timestamp: new Date(),
   *   correlationId: 'trace-123',
   *   filePath: 'src/cards/card.svg',
   *   projectId: 'project-123',
   * });
   * ```
   */
  async execute<T extends Parameters<typeof this.dispatcher.dispatch>[0]>(
    command: T
  ): Promise<Awaited<ReturnType<typeof this.dispatcher.dispatch>>> {
    return this.dispatcher.dispatch(command);
  }

  /**
   * Create a command context with automatic correlation ID tracking.
   *
   * A context groups related commands for tracing and debugging purposes.
   *
   * @returns Command context with factory methods
   *
   * @example
   * ```typescript
   * const ctx = cardCreator.createContext();
   * const fileResult = await cardCreator.execute(
   *   ctx.loadFile('path/to/file', 'project-123')
   * );
   * const assetResult = await cardCreator.execute(
   *   ctx.loadAsset(myAsset)
   * );
   * // Both commands share the same correlationId for tracing
   * ```
   */
  createContext() {
    return this.dispatcher.createContext();
  }

  /**
   * Get the underlying event bus.
   * Useful for advanced use cases requiring direct access.
   *
   * @returns The event bus instance
   */
  getEventBus(): EventBus {
    return this.eventBus;
  }

  /**
   * Get the current logger instance.
   *
   * @returns The logger instance
   */
  getLogger(): Logger {
    return this.logger;
  }

  /**
   * Get the asset cache instance.
   *
   * @returns The asset cache instance
   */
  getCache(): AssetCache {
    return this.config.cache!;
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
  // Utilities
  LoggerRegistry,
} from './index.shared';
