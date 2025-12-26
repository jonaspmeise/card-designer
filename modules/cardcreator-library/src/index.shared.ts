import { NO_OP_LOGGER } from './index';
import { ProjectLoadedEvent } from './events/event-types';
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
} from './cache/cache';

export {
  // Event types
  type DomainEvent,
  type CardCreatorEvent,
  type CardCreatorEventTypeMap,
  type ProjectLoadedEvent,
  type FileOpenedEvent,
} from './types/events';

export {
  // Event bus
  EventBus,
} from './events/event-service';

export { NO_OP_LOGGER } from './index';

export {
  // Commands
  type Command,
  type LoadFileCommand,
  type LoadFileResult,
  type load(Command,
  type load(Result,
  type LoadAssetCommand,
  type LoadAssetResult,
  type UpdateSourceCommand,
  type UpdateSourceResult,
  type RenderCardCommand,
  type RenderCardResult,
  type AnyCommand,
  type CommandResultMap,
} from './interaction/commands';
