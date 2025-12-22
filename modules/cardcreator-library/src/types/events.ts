/**
 * Core event definitions for the card-creator library.
 * These events form the backbone of the event-driven architecture,
 * allowing consumers to react to significant lifecycle and operational changes.
 */

/** Base event interface that all domain events extend */
export interface DomainEvent {
  readonly type: string;
  readonly timestamp: Date;
  readonly correlationId: string;
}

export type EventOfType<U extends DomainEvent, T extends U['type']> = Extract<U, { type: T }>;

// ============================================================================
// LIFECYCLE EVENTS
// ============================================================================

export interface JobStartedEvent extends DomainEvent {
  readonly type: 'jobStarted';
  readonly jobId: string;
  readonly jobType: string;
  readonly metadata?: Record<string, unknown>;
}

export interface JobFinishedEvent extends DomainEvent {
  readonly type: 'jobFinished';
  readonly jobId: string;
  readonly jobType: string;
  readonly duration: number;
  readonly result?: unknown;
}

// ============================================================================
// PROJECT AND FILE EVENTS
// ============================================================================

export interface ProjectLoadedEvent extends DomainEvent {
  readonly type: 'projectLoaded';
  readonly projectId: string;
  readonly projectName: string;
}

export interface FileOpenedEvent extends DomainEvent {
  readonly type: 'fileOpened';
  readonly fileId: string;
  readonly filePath: string;
  readonly projectId: string;
}

export interface SourceUpdatedEvent extends DomainEvent {
  readonly type: 'sourceUpdated';
  readonly sourceId: string;
  readonly sourceType: 'code' | 'config' | 'asset';
  readonly changes: Readonly<{
    before: unknown;
    after: unknown;
  }>;
}

// ============================================================================
// RENDERING EVENTS
// ============================================================================

export interface CardRenderStartedEvent extends DomainEvent {
  readonly type: 'cardRenderStarted';
  readonly cardId: string;
  readonly svgSource: string;
}

export interface CardRenderFinishedEvent extends DomainEvent {
  readonly type: 'cardRenderFinished';
  readonly cardId: string;
  readonly output: Uint8Array;
  readonly format: string;
  readonly duration: number;
}

// ============================================================================
// ASSET MANAGEMENT EVENTS
// ============================================================================

export interface AssetLoadedEvent extends DomainEvent {
  readonly type: 'assetLoaded';
  readonly assetId: string;
  readonly assetType: string;
  readonly source: 'memory' | 'remote' | 'file';
}

// ============================================================================
// ERROR EVENTS
// ============================================================================

export interface ErrorEvent extends DomainEvent {
  readonly type: 'error';
  readonly source: 'job' | 'card' | 'asset' | 'unknown';
  readonly sourceId?: string;
  readonly message: string;
  readonly suggestion: string;
  readonly error?: Error;
}

// ============================================================================
// HISTORY EVENTS
// ============================================================================

export interface HistoryDoEvent extends DomainEvent {
  readonly type: 'historyDo';
  readonly commandId: string;
  readonly commandType: string;
  readonly position: number;
  readonly totalSize: number;
}

export interface HistoryUndoEvent extends DomainEvent {
  readonly type: 'historyUndo';
  readonly commandId: string;
  readonly commandType: string;
  readonly position: number;
  readonly totalSize: number;
}

// ============================================================================
// UNION TYPES
// ============================================================================

/**
 * All possible events in the CardCreator system.
 * Renamed from AnyDomainEvent for clarity.
 */
export type CardCreatorEvent =
  | JobStartedEvent
  | JobFinishedEvent
  | ProjectLoadedEvent
  | FileOpenedEvent
  | SourceUpdatedEvent
  | CardRenderStartedEvent
  | CardRenderFinishedEvent
  | AssetLoadedEvent
  | ErrorEvent
  | HistoryDoEvent
  | HistoryUndoEvent;

/**
 * Type-safe mapping of event types to their corresponding event interfaces.
 * Ensures compile-time safety and prevents typos.
 *
 * This is a strict type that ensures every event type has a corresponding event interface.
 * If a new event is added to CardCreatorEvent, it must also be added here.
 */
export interface CardCreatorEventTypeMap {
  jobStarted: JobStartedEvent;
  jobFinished: JobFinishedEvent;
  projectLoaded: ProjectLoadedEvent;
  fileOpened: FileOpenedEvent;
  sourceUpdated: SourceUpdatedEvent;
  cardRenderStarted: CardRenderStartedEvent;
  cardRenderFinished: CardRenderFinishedEvent;
  assetLoaded: AssetLoadedEvent;
  error: ErrorEvent;
  historyDo: HistoryDoEvent;
  historyUndo: HistoryUndoEvent;
}

// Type-level assertion to ensure completeness
const _assertEventTypeCompleteness: {
  [K in CardCreatorEvent['type']]: K extends keyof CardCreatorEventTypeMap ? true : never;
} = {
  jobStarted: true,
  jobFinished: true,
  projectLoaded: true,
  fileOpened: true,
  sourceUpdated: true,
  cardRenderStarted: true,
  cardRenderFinished: true,
  assetLoaded: true,
  error: true,
  historyDo: true,
  historyUndo: true,
};
