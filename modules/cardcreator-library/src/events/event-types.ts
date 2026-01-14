import { CardCreatorDependencies } from '..';
import { Command } from '../architecture/types';
import {
  ID,
  Identifiable,
} from '../cross-cutting-concerns';
import {
  FileInformation,
  FileTypes,
  ResolvedFile,
} from '../file/file-types';
import { ProjectData } from '../project/project-types';
import { Card, RenderJob } from '../render/render-types';
import { Template } from '../template/template-types';
import { LogLevel } from '../types/domain';
import { DomainEvent } from '../types/events';

export type EventServiceDependencies = Pick<
  CardCreatorDependencies,
  'logger'
>;

export type ProjectLoadedEvent = DomainEvent<
  'projectLoaded',
  ProjectData
>;

export type CommandExecutedEvent = DomainEvent<
  'commandExecuted',
  Identifiable<Command> // TODO: Or PopulatedCommand?
>;

export type CommandUndoneEvent = DomainEvent<
  'commandUndone',
  Identifiable<Command> // TODO: Or PopulatedCommand?
>;

export type ProjectSavedEvent = DomainEvent<
  'projectSaved',
  {
    path: string;
  }
>;

export type ProjectResetEvent = DomainEvent<'projectReset'>;

export type FileOpenedEvent = DomainEvent<
  'fileOpened',
  {
    path: string;
  }
>;

export type DialogEvent = DomainEvent<
  'dialog',
  {
    text: string;
    level: 'question' | 'info' | 'warning' | 'error';
    callbacks: Record<string, () => Promise<void>>;
  }
>;

export type JobRenderStartedEvent = DomainEvent<
  'jobRenderStarted',
  Identifiable<{
    job: RenderJob;
  }>
>;

export type JobRenderFinishedEvent = DomainEvent<
  'jobRenderFinished',
  Identifiable<{
    job: RenderJob;
  }>
>;

export type CardRenderStartedEvent = DomainEvent<
  'cardRenderStarted',
  Identifiable<{
    card: Card;
  }>
>;

export type RenderResult = {
  card: Card;
  image: ArrayBufferLike;
};

export type CardRenderFinishedEvent = DomainEvent<
  'cardRenderFinished',
  Identifiable<RenderResult>
>;

export type PreviewRenderFinishedEvent = DomainEvent<
  'previewRenderFinished',
  RenderResult
>;

export type PreviewRenderStartedEvent = DomainEvent<
  'previewRenderStarted',
  {
    card: Card;
  }
>;

export type TemplateLoadedEvent = DomainEvent<
  'templateLoaded',
  {
    template: Template;
  }
>;

export type ProjectClosedEvent =
  DomainEvent<'projectClosed'>;

export type CardCompiledEvent = DomainEvent<
  'cardCompiled',
  Identifiable<{
    card: Card;
    compiled: string;
  }>
>;

export type ConfigChangedEvent =
  DomainEvent<'configChanged'>;

/**
 * Issued when cards are loaded into the system.
 * It doesn't matter, how many cards are loaded, this event is always issued once after loading something.
 */
export type CardsLoadedEvent = DomainEvent<
  'cardsLoaded',
  {
    cards: Card[];
  }
>;

/**
 * An event that can be issued within code of a template.
 * This can be used to inform the user about state of computation when creating a template.
 */
export type RenderLogEvent = DomainEvent<
  'renderLog',
  {
    message: string;
    card: Card;
    level: LogLevel;
  }
>;

/**
 * An event that is issued when a file is added to the project.
 */
export type FileAddedEvent = DomainEvent<
  'fileAdded',
  {
    file: ResolvedFile<FileInformation>;
  }
>;

export type FolderLoadedEvent = DomainEvent<
  'folderLoaded',
  {
    files: ResolvedFile<FileInformation>[];
  }
>;

/**
 * An event that is issued when an error occurs.
 */
export type ErrorOccurredEvent = DomainEvent<
  'errorOccurred',
  {
    message: string;
  }
>;
