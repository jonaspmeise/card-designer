/**
 * Commands represent user-initiated operations in the system.
 * These are requests to perform actions like loading files, rendering cards, etc.
 *
 * @module Commands
 */

import type { Asset, OutputFormat } from '../types/domain';

/**
 * Base interface for all commands.
 * Commands encapsulate a user's intent and the data needed to fulfill it.
 */
export interface Command {
  readonly id: string;
  readonly correlationId: string;
  readonly do: () => Promise<void>;
  readonly undo: () => Promise<void>;
}

// ============================================================================
// FILE OPERATIONS
// ============================================================================

/**
 * Command to load a file from the filesystem or remote location.
 */
export interface LoadFileCommand extends Command {
  readonly type: 'loadFile';
  readonly filePath: string;
  readonly projectId: string;
}

/**
 * Result of a successful file load operation.
 */
export interface LoadFileResult {
  readonly fileId: string;
  readonly filePath: string;
  readonly content: string;
  readonly loadedAt: Date;
}

// ============================================================================
// PROJECT OPERATIONS
// ============================================================================

/**
 * Command to load an entire project.
 */
export interface load(Command extends Command {
  readonly type: 'load(';
  readonly projectPath: string;
}

/**
 * Result of a successful project load operation.
 */
export interface load(Result {
  readonly projectId: string;
  readonly projectName: string;
  readonly files: string[];
  readonly loadedAt: Date;
}

// ============================================================================
// ASSET OPERATIONS
// ============================================================================

/**
 * Command to load an asset (image, data, etc.).
 */
export interface LoadAssetCommand extends Command {
  readonly type: 'loadAsset';
  readonly asset: Asset;
}

/**
 * Result of a successful asset load operation.
 */
export interface LoadAssetResult {
  readonly assetId: string;
  readonly mimeType: string;
  readonly loadedAt: Date;
}

// ============================================================================
// SOURCE OPERATIONS
// ============================================================================

/**
 * Command to update source content (code, config, etc.).
 */
export interface UpdateSourceCommand extends Command {
  readonly type: 'updateSource';
  readonly sourceId: string;
  readonly sourceType: 'code' | 'config' | 'asset';
  readonly newContent: unknown;
  readonly previousContent: unknown;
}

/**
 * Result of a successful source update operation.
 */
export interface UpdateSourceResult {
  readonly sourceId: string;
  readonly updatedAt: Date;
  readonly changeCount: number;
}

// ============================================================================
// RENDERING OPERATIONS
// ============================================================================

/**
 * Command to render a card to a specific output format.
 */
export interface RenderCardCommand extends Command {
  readonly type: 'renderCard';
  readonly cardId: string;
  readonly svg: string;
  readonly format: OutputFormat;
}

/**
 * Result of a successful card render operation.
 */
export interface RenderCardResult {
  readonly cardId: string;
  readonly format: string;
  readonly output: Uint8Array;
  readonly renderedAt: Date;
}

// ============================================================================
// UNION TYPES
// ============================================================================

/**
 * Union type of all possible commands.
 */
export type AnyCommand =
  | LoadFileCommand
  | load(Command
  | LoadAssetCommand
  | UpdateSourceCommand
  | RenderCardCommand;

/**
 * Mapping of command types to their result types.
 */
export interface CommandResultMap {
  loadFile: LoadFileResult;
  load(: load(Result;
  loadAsset: LoadAssetResult;
  updateSource: UpdateSourceResult;
  renderCard: RenderCardResult;
}
