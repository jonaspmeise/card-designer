import { NO_OP_LOGGER } from './index';
/**
 * Shared exports for the card-creator library.
 * This file re-exports all public types and utilities.
 *
 * @module Exports
 */

export {
  // Domain interfaces
  type Logger,
  type CardRenderer,
  type AssetCache,
  Asset,
  InMemoryAsset,
  RemoteAsset,
  FileAsset,
} from './types/domain';

export {
  // Cache implementations
  InMemoryAssetCache,
  LRUAssetCache,
  NoOpAssetCache,
} from './core/cache';

export {
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
} from './types/events';

export {
  // Event bus
  EventBus,
} from './core/event-bus';

export { NO_OP_LOGGER } from './index';

export {
  // Commands
  type Command,
  type LoadFileCommand,
  type LoadFileResult,
  type LoadProjectCommand,
  type LoadProjectResult,
  type LoadAssetCommand,
  type LoadAssetResult,
  type UpdateSourceCommand,
  type UpdateSourceResult,
  type RenderCardCommand,
  type RenderCardResult,
  type AnyCommand,
  type CommandResultMap,
} from './interaction/commands';

export {
  // Command handlers
  CommandHandler,
  LoadFileHandler,
  LoadProjectHandler,
  LoadAssetHandler,
  UpdateSourceHandler,
  RenderCardHandler,
} from './interaction/command-handler';

export {
  // Command dispatcher
  CommandDispatcher,
} from './interaction/command-dispatcher';
