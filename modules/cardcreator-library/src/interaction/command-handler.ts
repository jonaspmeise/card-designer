/**
 * Command handlers process commands and orchestrate business logic.
 * They act as the bridge between user requests and domain operations.
 *
 * @module CommandHandler
 */

import type {
  AnyCommand,
  Command,
  CommandResultMap,
  LoadFileCommand,
  LoadFileResult,
  LoadProjectCommand,
  LoadProjectResult,
  LoadAssetCommand,
  LoadAssetResult,
  UpdateSourceCommand,
  UpdateSourceResult,
  RenderCardCommand,
  RenderCardResult,
} from './commands';
import type { EventBus } from '../core/event-bus';
import type { Logger, CardRenderer, AssetCache } from '../types/domain';
import { RemoteAsset, FileAsset } from '../types/domain';
import { NO_OP_LOGGER } from '../index.shared';

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
 * Abstract base class for command handlers.
 * Provides common functionality for command execution, error handling, and logging.
 *
 * @template T - The specific command type this handler processes
 * @template R - The result type returned by this handler
 */
export abstract class CommandHandler<T extends Command = Command, R = unknown> {
  /** Logger instance for diagnostic output */
  protected logger: Logger;

  /** Event bus for publishing domain events */
  protected eventBus: EventBus;

  /**
   * Create a new command handler.
   *
   * @param eventBus - The event bus for publishing events
   * @param logger - Optional logger instance (uses default if not provided)
   */
  constructor(eventBus: EventBus, logger?: Logger) {
    this.eventBus = eventBus;
    this.logger = logger ?? NO_OP_LOGGER;
  }

  /**
   * Execute the command and return the result.
   * Should be implemented by concrete handlers.
   *
   * @param command - The command to execute
   * @returns The result of executing the command
   */
  abstract execute(command: T): Promise<R>;

  /**
   * Validate the command before execution.
   * Override in subclasses to add specific validation logic.
   *
   * @param command - The command to validate
   * @throws Error if validation fails
   */
  protected validate(_command: T): void {
    // Override in subclasses for specific validation
  }

  /**
   * Generate a unique correlation ID for tracing.
   *
   * @returns A new correlation ID
   */
  protected generateCorrelationId(): string {
    return generateId();
  }
}

/**
 * Handles LoadFile commands.
 * Responsible for reading files from the filesystem or remote sources.
 */
export class LoadFileHandler extends CommandHandler<LoadFileCommand, LoadFileResult> {
  /**
   * Execute a LoadFile command.
   *
   * @param command - The LoadFile command
   * @returns Result containing file content and metadata
   * @throws Error if the file cannot be read
   */
  async execute(command: LoadFileCommand): Promise<LoadFileResult> {
    this.validate(command);

    this.logger.debug('LoadFile command started', {
      fileId: command.id,
      filePath: command.filePath,
      correlationId: command.correlationId,
    });

    try {
      // In Node.js environment, read from filesystem
      // In browser environment, this would need different implementation
      let content: string;

      if (typeof window === 'undefined') {
        // Node.js
        const fs = await import('fs/promises');
        content = await fs.readFile(command.filePath, 'utf-8');
      } else {
        // Browser - would need fetch or other mechanism
        throw new Error('File loading from filesystem not supported in browser environment');
      }

      const result: LoadFileResult = {
        fileId: command.id,
        filePath: command.filePath,
        content,
        loadedAt: new Date(),
      };

      this.logger.info('File loaded successfully', {
        fileId: command.id,
        filePath: command.filePath,
      });

      // Publish FileOpenedEvent
      await this.eventBus.publish({
        type: 'fileOpened',
        fileId: command.id,
        filePath: command.filePath,
        projectId: command.projectId,
        timestamp: new Date(),
        correlationId: command.correlationId,
      });

      return result;
    } catch (error) {
      const err = error as Error;
      this.logger.error('Failed to load file', err, {
        filePath: command.filePath,
      });

      await this.eventBus.publish({
        type: 'error',
        source: 'unknown',
        sourceId: command.id,
        message: `Failed to load file: ${command.filePath}`,
        suggestion: 'Check that the file path is correct and the file exists',
        error: err,
        timestamp: new Date(),
        correlationId: command.correlationId,
      });

      throw err;
    }
  }

  protected validate(command: LoadFileCommand): void {
    if (!command.filePath || command.filePath.trim() === '') {
      throw new Error('File path is required');
    }
    if (!command.projectId || command.projectId.trim() === '') {
      throw new Error('Project ID is required');
    }
  }
}

/**
 * Handles LoadProject commands.
 * Responsible for discovering and loading entire projects.
 */
export class LoadProjectHandler extends CommandHandler<LoadProjectCommand, LoadProjectResult> {
  /**
   * Execute a LoadProject command.
   *
   * @param command - The LoadProject command
   * @returns Result containing project metadata and file list
   * @throws Error if the project cannot be loaded
   */
  async execute(command: LoadProjectCommand): Promise<LoadProjectResult> {
    this.validate(command);

    const projectId = generateId();

    this.logger.debug('LoadProject command started', {
      projectPath: command.projectPath,
      correlationId: command.correlationId,
    });

    try {
      // Publish JobStartedEvent
      await this.eventBus.publish({
        type: 'jobStarted',
        jobId: projectId,
        jobType: 'loadProject',
        metadata: { projectPath: command.projectPath },
        timestamp: new Date(),
        correlationId: command.correlationId,
      });

      let files: string[] = [];

      if (typeof window === 'undefined') {
        // Node.js - discover files in directory
        const fs = await import('fs/promises');
        const path = await import('path');

        const entries = await fs.readdir(command.projectPath, { recursive: true });
        files = entries
          .filter((entry) => typeof entry === 'string')
          .map((entry) => path.join(command.projectPath, entry as string));
      }

      const projectName = command.projectPath.split(/[/\\]/).pop() || 'Unnamed Project';

      const result: LoadProjectResult = {
        projectId,
        projectName,
        files,
        loadedAt: new Date(),
      };

      const startTime = Date.now();

      // Publish ProjectLoadedEvent
      await this.eventBus.publish({
        type: 'projectLoaded',
        projectId,
        projectName,
        timestamp: new Date(),
        correlationId: command.correlationId,
      });

      // Publish JobFinishedEvent
      await this.eventBus.publish({
        type: 'jobFinished',
        jobId: projectId,
        jobType: 'loadProject',
        duration: Date.now() - startTime,
        result: result,
        timestamp: new Date(),
        correlationId: command.correlationId,
      });

      this.logger.info('Project loaded successfully', {
        projectId,
        projectName,
        fileCount: files.length,
      });

      return result;
    } catch (error) {
      const err = error as Error;
      this.logger.error('Failed to load project', err, {
        projectPath: command.projectPath,
      });

      await this.eventBus.publish({
        type: 'error',
        source: 'job',
        sourceId: projectId,
        message: `Failed to load project: ${command.projectPath}`,
        suggestion: 'Check that the project path is correct and accessible',
        error: err,
        timestamp: new Date(),
        correlationId: command.correlationId,
      });

      throw err;
    }
  }

  protected validate(command: LoadProjectCommand): void {
    if (!command.projectPath || command.projectPath.trim() === '') {
      throw new Error('Project path is required');
    }
  }
}

/**
 * Handles LoadAsset commands.
 * Responsible for loading assets and updating the cache.
 */
export class LoadAssetHandler extends CommandHandler<LoadAssetCommand, LoadAssetResult> {
  /** Asset cache for storing loaded assets */
  private cache: AssetCache;

  /**
   * Create a new LoadAsset handler.
   *
   * @param eventBus - The event bus for publishing events
   * @param cache - The asset cache
   * @param logger - Optional logger instance
   */
  constructor(eventBus: any, cache: AssetCache, logger?: Logger) {
    super(eventBus, logger);
    this.cache = cache;
  }

  /**
   * Execute a LoadAsset command.
   *
   * @param command - The LoadAsset command
   * @returns Result containing asset metadata and location
   * @throws Error if the asset cannot be loaded
   */
  async execute(command: LoadAssetCommand): Promise<LoadAssetResult> {
    const { asset } = command;

    this.logger.debug('LoadAsset command started', {
      assetId: asset.id,
      assetType: asset.name,
      correlationId: command.correlationId,
    });

    try {
      // Load the asset content
      const assetData = await asset.load();

      // Store in cache
      await this.cache.set(asset);

      // Determine source type
      let source: 'memory' | 'remote' | 'file' = 'memory';
      if (asset instanceof RemoteAsset) {
        source = 'remote';
      } else if (asset instanceof FileAsset) {
        source = 'file';
      }

      const result: LoadAssetResult = {
        assetId: asset.id,
        mimeType: asset.mimeType,
        loadedAt: new Date(),
      };

      // Publish AssetLoadedEvent
      await this.eventBus.publish({
        type: 'assetLoaded',
        assetId: asset.id,
        assetType: asset.name,
        source,
        timestamp: new Date(),
        correlationId: command.correlationId,
      });

      this.logger.info('Asset loaded successfully', {
        assetId: asset.id,
        source,
        size: assetData.length,
      });

      return result;
    } catch (error) {
      const err = error as Error;
      this.logger.error('Failed to load asset', err, {
        assetId: asset.id,
      });

      await this.eventBus.publish({
        type: 'error',
        source: 'asset',
        sourceId: asset.id,
        message: `Failed to load asset: ${asset.name}`,
        suggestion: `Check that the asset ${asset.name} can be loaded from its source`,
        error: err,
        timestamp: new Date(),
        correlationId: command.correlationId,
      });

      throw err;
    }
  }
}

/**
 * Handles UpdateSource commands.
 * Responsible for tracking and publishing source code/config changes.
 */
export class UpdateSourceHandler extends CommandHandler<UpdateSourceCommand, UpdateSourceResult> {
  /**
   * Execute an UpdateSource command.
   *
   * @param command - The UpdateSource command
   * @returns Result containing update metadata
   */
  async execute(command: UpdateSourceCommand): Promise<UpdateSourceResult> {
    this.validate(command);

    this.logger.debug('UpdateSource command started', {
      sourceId: command.sourceId,
      sourceType: command.sourceType,
      correlationId: command.correlationId,
    });

    try {
      const result: UpdateSourceResult = {
        sourceId: command.sourceId,
        updatedAt: new Date(),
        changeCount: 1,
      };

      // Publish SourceUpdatedEvent
      await this.eventBus.publish({
        type: 'sourceUpdated',
        sourceId: command.sourceId,
        sourceType: command.sourceType,
        changes: {
          before: command.previousContent,
          after: command.newContent,
        },
        timestamp: new Date(),
        correlationId: command.correlationId,
      });

      this.logger.info('Source updated successfully', {
        sourceId: command.sourceId,
        sourceType: command.sourceType,
      });

      return result;
    } catch (error) {
      const err = error as Error;
      this.logger.error('Failed to update source', err, {
        sourceId: command.sourceId,
      });

      await this.eventBus.publish({
        type: 'error',
        source: 'unknown',
        sourceId: command.sourceId,
        message: `Failed to update source: ${command.sourceId}`,
        suggestion: 'Verify the new content is valid for the source type',
        error: err,
        timestamp: new Date(),
        correlationId: command.correlationId,
      });

      throw err;
    }
  }

  protected validate(command: UpdateSourceCommand): void {
    if (!command.sourceId || command.sourceId.trim() === '') {
      throw new Error('Source ID is required');
    }
    if (!['code', 'config', 'asset'].includes(command.sourceType)) {
      throw new Error('Invalid source type');
    }
  }
}

/**
 * Handles RenderCard commands.
 * Responsible for orchestrating card rendering operations.
 */
export class RenderCardHandler extends CommandHandler<RenderCardCommand, RenderCardResult> {
  /** Card renderer for converting SVG to output formats */
  private renderer: CardRenderer;

  /**
   * Create a new RenderCard handler.
   *
   * @param eventBus - The event bus for publishing events
   * @param renderer - The card renderer implementation
   * @param logger - Optional logger instance
   */
  constructor(eventBus: any, renderer: CardRenderer, logger?: Logger) {
    super(eventBus, logger);
    this.renderer = renderer;
  }

  /**
   * Execute a RenderCard command.
   *
   * @param command - The RenderCard command
   * @returns Result containing rendered output
   * @throws Error if rendering fails
   */
  async execute(command: RenderCardCommand): Promise<RenderCardResult> {
    this.validate(command);

    const startTime = Date.now();

    this.logger.debug('RenderCard command started', {
      cardId: command.cardId,
      format: command.format,
      correlationId: command.correlationId,
    });

    try {
      // Publish CardRenderStartedEvent
      await this.eventBus.publish({
        type: 'cardRenderStarted',
        cardId: command.cardId,
        svgSource: command.svg,
        timestamp: new Date(),
        correlationId: command.correlationId,
      });

      // Perform rendering
      if (!this.renderer.supports(command.format)) {
        throw new Error(`Unsupported format: ${command.format}`);
      }

      const output = await this.renderer.render(command.svg, command.format);

      const duration = Date.now() - startTime;
      const result: RenderCardResult = {
        cardId: command.cardId,
        format: command.format,
        output,
        renderedAt: new Date(),
      };

      // Publish CardRenderFinishedEvent
      await this.eventBus.publish({
        type: 'cardRenderFinished',
        cardId: command.cardId,
        output,
        format: command.format,
        duration,
        timestamp: new Date(),
        correlationId: command.correlationId,
      });

      this.logger.info('Card rendered successfully', {
        cardId: command.cardId,
        format: command.format,
        duration,
        outputSize: output.length,
      });

      return result;
    } catch (error) {
      const err = error as Error;
      this.logger.error('Failed to render card', err, {
        cardId: command.cardId,
        format: command.format,
      });

      await this.eventBus.publish({
        type: 'error',
        source: 'card',
        sourceId: command.cardId,
        message: `Failed to render card to ${command.format}`,
        suggestion: 'Check that the SVG is valid and the renderer supports the format',
        error: err,
        timestamp: new Date(),
        correlationId: command.correlationId,
      });

      throw err;
    }
  }

  protected validate(command: RenderCardCommand): void {
    if (!command.cardId || command.cardId.trim() === '') {
      throw new Error('Card ID is required');
    }
    if (!command.svg || command.svg.trim() === '') {
      throw new Error('SVG content is required');
    }
    if (!command.format || command.format.trim() === '') {
      throw new Error('Output format is required');
    }
  }
}
