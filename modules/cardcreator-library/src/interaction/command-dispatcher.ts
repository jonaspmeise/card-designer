/**
 * Command dispatcher orchestrates command handlers and manages execution.
 * Provides a single point of entry for executing commands with error handling
 * and context management.
 *
 * @module CommandDispatcher
 */

import type {
  AnyCommand,
  CommandResultMap,
  LoadFileCommand,
  LoadProjectCommand,
  LoadAssetCommand,
  UpdateSourceCommand,
  RenderCardCommand,
} from './commands';
import {
  LoadFileHandler,
  LoadProjectHandler,
  LoadAssetHandler,
  UpdateSourceHandler,
  RenderCardHandler,
} from './command-handler';
import type { EventBus } from '../core/event-bus';
import type { Logger, CardRenderer, AssetCache } from '../types/domain';
import { LoggerRegistry } from '../core/logger-registry';

/**
 * Generate a UUID v4 string.
 * Simple implementation that works in both Node.js and browser environments.
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback implementation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Dispatcher for executing commands.
 *
 * Responsibilities:
 * - Route commands to appropriate handlers
 * - Manage command execution context
 * - Handle errors and logging
 * - Maintain handler instances
 *
 * @example
 * ```typescript
 * const dispatcher = new CommandDispatcher({
 *   eventBus,
 *   renderer,
 *   cache,
 *   logger,
 * });
 *
 * const result = await dispatcher.dispatch({
 *   type: 'loadFile',
 *   id: 'cmd-123',
 *   timestamp: new Date(),
 *   correlationId: 'corr-123',
 *   filePath: '/path/to/file',
 *   projectId: 'proj-123',
 * });
 * ```
 */
export class CommandDispatcher {
  /** Event bus for publishing domain events */
  private readonly eventBus: EventBus;

  /** Logger instance */
  private readonly logger: Logger;

  /** Card renderer */
  private readonly renderer: CardRenderer;

  /** Asset cache */
  private readonly cache: AssetCache;

  /** Handler instances */
  private readonly loadFileHandler: LoadFileHandler;
  private readonly loadProjectHandler: LoadProjectHandler;
  private readonly loadAssetHandler: LoadAssetHandler;
  private readonly updateSourceHandler: UpdateSourceHandler;
  private readonly renderCardHandler: RenderCardHandler;

  /** Handler lookup map for command dispatching */
  private readonly handlers: Record<
    string,
    (command: AnyCommand) => Promise<unknown>
  >;

  /**
   * Create a new command dispatcher.
   *
   * @param options - Configuration options
   * @param options.eventBus - Event bus instance (required)
   * @param options.renderer - Card renderer implementation (required)
   * @param options.cache - Asset cache implementation (required)
   * @param options.logger - Logger instance (optional)
   */
  constructor(options: {
    eventBus: EventBus;
    renderer: CardRenderer;
    cache: AssetCache;
    logger?: Logger;
  }) {
    this.eventBus = options.eventBus;
    this.renderer = options.renderer;
    this.cache = options.cache;
    this.logger = options.logger ?? LoggerRegistry.getLogger();

    // Initialize handlers
    this.loadFileHandler = new LoadFileHandler(this.eventBus, this.logger);
    this.loadProjectHandler = new LoadProjectHandler(this.eventBus, this.logger);
    this.loadAssetHandler = new LoadAssetHandler(this.eventBus, this.cache, this.logger);
    this.updateSourceHandler = new UpdateSourceHandler(this.eventBus, this.logger);
    this.renderCardHandler = new RenderCardHandler(this.eventBus, this.renderer, this.logger);

    // Initialize handler lookup map
    this.handlers = {
      loadFile: (command) =>
        this.loadFileHandler.execute(command as LoadFileCommand),
      loadProject: (command) =>
        this.loadProjectHandler.execute(command as LoadProjectCommand),
      loadAsset: (command) =>
        this.loadAssetHandler.execute(command as LoadAssetCommand),
      updateSource: (command) =>
        this.updateSourceHandler.execute(command as UpdateSourceCommand),
      renderCard: (command) =>
        this.renderCardHandler.execute(command as RenderCardCommand),
    };
  }

  /**
   * Dispatch a command to the appropriate handler.
   *
   * @template T - The command type
   * @param command - The command to execute
   * @returns Promise resolving to the command result
   * @throws Error if command execution fails
   *
   * @example
   * ```typescript
   * const fileResult = await dispatcher.dispatch({
   *   type: 'loadFile',
   *   id: uuidv4(),
   *   timestamp: new Date(),
   *   correlationId: correlationId,
   *   filePath: 'src/cards/card.svg',
   *   projectId: projectId,
   * });
   * ```
   */
  async dispatch<T extends AnyCommand>(
    command: T
  ): Promise<CommandResultMap[T['type']]> {
    const commandType = command.type;

    this.logger.debug(`Dispatching command: ${commandType}`, {
      commandId: command.id,
      correlationId: command.correlationId,
    });

    try {
      const handler = this.handlers[commandType];
      if (!handler) {
        throw new Error(`Unknown command type: ${commandType}`);
      }

      return (await handler(command)) as CommandResultMap[T['type']];
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Command dispatch failed: ${commandType}`, err, {
        commandId: command.id,
        correlationId: command.correlationId,
      });
      throw err;
    }
  }

  /**
   * Create a new command context with a generated correlation ID.
   * Useful for grouping related commands for tracing.
   *
   * @returns An object with command creation utilities
   *
   * @example
   * ```typescript
   * const context = dispatcher.createContext();
   * const result = await dispatcher.dispatch(
   *   context.loadFile('/path/to/file', 'project-123')
   * );
   * ```
   */
  createContext() {
    const correlationId = generateId();

    return {
      /**
       * Create a LoadFile command.
       */
      loadFile: (filePath: string, projectId: string): LoadFileCommand => ({
        type: 'loadFile',
        id: generateId(),
        correlationId,
        filePath,
        projectId,
        do: async () => {},
        undo: async () => {},
      }),

      /**
       * Create a LoadProject command.
       */
      loadProject: (projectPath: string): LoadProjectCommand => ({
        type: 'loadProject',
        id: generateId(),
        correlationId,
        projectPath,
        do: async () => {},
        undo: async () => {},
      }),

      /**
       * Create a LoadAsset command.
       */
      loadAsset: (asset: any) => ({
        type: 'loadAsset' as const,
        id: generateId(),
        correlationId,
        asset,
        do: async () => {},
        undo: async () => {},
      }),

      /**
       * Create an UpdateSource command.
       */
      updateSource: (
        sourceId: string,
        sourceType: 'code' | 'config' | 'asset',
        newContent: unknown,
        previousContent: unknown
      ): UpdateSourceCommand => ({
        type: 'updateSource',
        id: generateId(),
        correlationId,
        sourceId,
        sourceType,
        newContent,
        previousContent,
        do: async () => {},
        undo: async () => {},
      }),

      /**
       * Create a RenderCard command.
       */
      renderCard: (cardId: string, svg: string, format: string): RenderCardCommand => ({
        type: 'renderCard',
        id: generateId(),
        correlationId,
        cardId,
        svg,
        format: format as any, // TODO: validate this is a valid OutputFormat
        do: async () => {},
        undo: async () => {},
      }),

      /**
       * Get the correlation ID for this context.
       */
      getCorrelationId: () => correlationId,
    };
  }
}
