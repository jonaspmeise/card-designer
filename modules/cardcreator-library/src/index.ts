/**
 * Core library API providing the public interface for card-creator.
 *
 * This is the main entry point for consumers (CLI, webapp, etc).
 * It provides a clean, type-safe API for all library operations.
 *
 * @module CardCreatorLibrary
 */

import { InMemoryAssetCache } from './cache/cache';
import type { Logger, AssetCache } from './types/domain';
import { FileProvider } from './files/file-provider';
import { ProjectService } from './project/project-service';
import {
  EventBus,
  ExternalEventBus,
  InternalEventBus,
} from './events/events';
import { EventService } from './events/event-service';
import { HistoryService } from './history/history-service';
import { CardRenderer } from './render/render-types';
import { TemplateService } from './template/template-service';
import { ConfigService } from './config/config-service';
import { config } from 'process';
import { CardService } from './cards/card-service';
import { RenderService } from './render/render-service';

/**
 * External dependencies, which can be overwritten with platform-specific adapters.
 */

export interface CardCreatorProvidedDependencies {
  logger: Logger;
  renderer: CardRenderer;
  cache: AssetCache;
  eventService: InternalEventBus;
  historyService: HistoryService;
  templateService: TemplateService;
  configService: ConfigService;
  cardService: CardService;
}

export interface CardCreatorRequiredDependencies {
  renderer: CardRenderer;
  fileProvider: FileProvider;
}

export type CardCreatorDependencies =
  CardCreatorProvidedDependencies &
    CardCreatorRequiredDependencies;

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
  constructor(
    dependencies: CardCreatorRequiredDependencies,
    config: Partial<CardCreatorProvidedDependencies> = {},
  ) {
    if (dependencies.renderer === undefined) {
      throw new Error(
        'Card renderer is required in configuration!',
      );
    }

    if (dependencies.fileProvider === undefined) {
      throw new Error(
        'File provider is required in configuration!',
      );
    }

    const logger: Logger = config.logger ?? NO_OP_LOGGER;
    const eventService: InternalEventBus =
      config.eventService ??
      new EventService({
        logger,
      });

    const historyService: HistoryService =
      config.historyService ??
      new HistoryService({
        logger,
        eventService,
      });

    const configService: ConfigService =
      config.configService ??
      new ConfigService({
        logger,
        eventService,
        historyService,
      });

    const templateService: TemplateService =
      config.templateService ??
      new TemplateService({
        logger,
        eventService,
        historyService,
        configService,
      });

    const cardService: CardService = new CardService({
      logger,
      eventService,
      historyService,
    });

    this.dependencies = {
      cache: config.cache ?? new InMemoryAssetCache(),
      logger: logger,
      renderer: dependencies.renderer,
      fileProvider: dependencies.fileProvider,
      eventService: eventService,
      historyService: historyService,
      templateService: templateService,
      configService: configService,
      cardService: cardService,
    };

    // Register services for each concern.
    this.project = new ProjectService(this.dependencies);
    this.events = this.dependencies
      .eventService as EventBus;
    this.render = new RenderService(this.dependencies);
    this.config = configService;
    this.history = historyService;

    this.dependencies.logger.info(
      'CardCreator library initialized',
    );
  }

  public readonly project: Readonly<ProjectService>;
  public readonly events: Readonly<ExternalEventBus>;
  public readonly render: Readonly<RenderService>;
  public readonly config: Readonly<ConfigService>;
  public readonly history: Readonly<HistoryService>;
}
